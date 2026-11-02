import { Worker } from "bullmq";
import { queue, connection, closeExpireQueue, logRedisError } from "./expireQueue.js";
import { expireBookingById, sweepExpiredBookings } from "../features/booking/booking.service.js";

// ============ Worker + Sweep cho việc tự hủy đơn QUÁ HẠN TRẢ NỐT ============
// LỚP 1: job "expire-balance" hẹn giờ đúng balance_due_at (do expireQueue.js đặt sau khi cọc).
// LỚP 2: sweep chạy mỗi 5 phút — đối soát bắt đơn trôi (job mất do Redis rớt/app nghỉ).
// LỚP 3: lazy-check trong booking.service.js khi user chạm đơn.
// Cả 3 cùng gọi expireOrCancelIfDue() → chạy trùng nhau vẫn idempotent.
//
// KHÔNG còn nhánh "24h chưa cọc thì hủy": đơn pending + unpaid không tự hết hạn.

let worker = null;

// Xử lý từng job trong queue
const processJob = async (job) => {
    if (job.name === "sweep") {
        // Job lặp của scheduler: quét toàn bộ đơn quá hạn trả nốt còn trôi trong DB
        const expired = await sweepExpiredBookings();
        if (expired > 0) {
            console.log(`[Sweep] Phát hiện & hủy ${expired} đơn quá hạn trả nốt`);
        }
        return;
    }

    // job.name === "expire-balance": job hẹn giờ cho đúng 1 đơn
    const { bookingId } = job.data;
    const booking = await expireBookingById(bookingId);
    if (booking?.status === "cancelled") {
        console.log(`[Job] Quá hạn trả nốt → tự hủy booking #${bookingId}, ghế đã hoàn trả`);
    }
    // Đơn đã trả đủ / hủy trước đó → expireOrCancelIfDue return sớm, không làm gì (idempotent)
};

export const startExpireJobs = async () => {
    // Đăng ký sweep lặp mỗi 5 phút (job scheduler của BullMQ v5+; fallback API repeat cũ)
    try {
        if (typeof queue.upsertJobScheduler === "function") {
            // upsertJobScheduler(id, repeatOpts, jobTemplate) — repeatOpts phải là object { every | pattern }
            await queue.upsertJobScheduler("sweep-expired", { every: 5 * 60 * 1000 }, { name: "sweep" });
        } else {
            await queue.add("sweep", {}, { repeat: { every: 5 * 60 * 1000 } });
        }
    } catch (err) {
        // Redis chưa lên → warn thôi, worker bên dưới vẫn sẽ tự kết nối lại khi Redis sống
        console.warn(`[Jobs] Chưa đăng ký được sweep (Redis?): ${err.message}`);
    }

    // Worker xử lý lần lượt (concurrency 1) — an toàn & dễ suy luận với thao tác hoàn trả ghế.
    // (Retry 3 lần + backoff đã khai ở defaultJobOptions của Queue)
    worker = new Worker("booking-expire", processJob, {
        connection,
        concurrency: 1,
    });
    worker.on("error", (err) => logRedisError("worker", err));

    console.log("[Jobs] Worker hủy đơn quá hạn trả nốt đã chạy (sweep mỗi 5 phút)");
};

// Graceful shutdown: đóng worker + queue trước khi thoát để job dở dang
// không bị treo "stalled" trong Redis
export const closeExpireJobs = async () => {
    if (worker) {
        await worker.close();
        worker = null;
    }
    await closeExpireQueue();
};
