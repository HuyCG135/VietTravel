import db from "../../config/knex.js";

// Cho phép truyền transaction (trx) vào các hàm ghi để service gộp nhiều bước vào 1 transaction.
const q = (trx) => trx || db;

class Booking {
    static async getAll() {
        return db("bookings as b")
            .leftJoin("users as u", "b.user_id", "u.id")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .leftJoin("tours as t", "d.tour_id", "t.id")
            .select(
                "b.*",
                "u.fullname",
                "u.email",
                "t.name as tour_name",
                "t.price_default as price",
                "d.departure_date",
            )
            .orderBy("b.updated_at", "desc");
    }

    static async getByUserId(userId) {
        return db("bookings as b")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .leftJoin("tours as t", "d.tour_id", "t.id")
            .select(
                "b.*",
                "t.id as tour_id",
                "t.name as tour_name",
                "t.price_default as price",
                "t.duration",
                "t.region",
                "t.cover_image as cover_image",
                "d.departure_date",
            )
            .where("b.user_id", userId)
            .orderBy("b.updated_at", "desc");
    }

    static async getById(id, trx = null) {
        return q(trx)("bookings").where("id", id).first();
    }

    // Khóa row booking trong transaction (dùng khi xác nhận thanh toán / giữ ghế)
    static async findByIdForUpdate(id, trx) {
        return q(trx)("bookings").where("id", id).forUpdate().first();
    }

    // Chi tiết booking cho user: kèm thông tin tour, ngày khởi hành, giá cấu thành
    static async getDetailForUser(id) {
        return db("bookings as b")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .leftJoin("tours as t", "d.tour_id", "t.id")
            .select(
                "b.*",
                "t.id as tour_id",
                "t.name as tour_name",
                "t.duration",
                "t.region",
                "t.cover_image as cover_image",
                "t.price_default",
                "t.price_child",
                "d.departure_date",
                "d.departure_location",
                "d.price_moving",
                "d.price_moving_child",
                // Thời điểm thanh toán đầu tiên (cọc / trả đủ) — dùng để xét ân hạn 24h khi hủy.
                db.raw(
                    "(SELECT MIN(p.paid_at) FROM booking_payments AS p " +
                        "WHERE p.booking_id = b.id AND p.status = 'paid') AS first_paid_at",
                ),
            )
            .where("b.id", id)
            .first();
    }

    // Tạo booking + passengers (KHÔNG trừ ghế — ghế chỉ giữ khi bắt đầu thanh toán).
    // deposit_percent/deposit_amount là snapshot tại thời điểm đặt (không tính lại sau này).
    static async createWithPassengers({
        user_id,
        departure_id,
        adults,
        children,
        total_price,
        deposit_percent = 0,
        deposit_amount = 0,
        contact_name,
        contact_phone,
        contact_email,
        contact_dob,
        contact_gender,
        note,
        passengers,
    }) {
        return db.transaction(async (trx) => {
            const [bookingId] = await trx("bookings").insert({
                user_id,
                departure_id,
                adults,
                children,
                total_price,
                deposit_percent,
                deposit_amount,
                paid_amount: 0,
                payment_status: "unpaid",
                status: "pending",
                seats_held: false,
                contact_name,
                contact_phone,
                contact_email,
                contact_dob: contact_dob || null,
                contact_gender: contact_gender || null,
                note: note || null,
                created_at: new Date(),
                updated_at: new Date(),
            });

            if (Array.isArray(passengers) && passengers.length > 0) {
                await trx("passengers").insert(
                    passengers.map((p) => ({
                        booking_id: bookingId,
                        fullname: p.name,
                        gender: p.gender || "Khác",
                        dob: p.dob || null,
                        passenger_type: p.type === "child" ? "child" : "adult",
                    }))
                );
            }

            return bookingId;
        });
    }

    static async getDeparture(id) {
        return db("tour_departures").where("id", id).first();
    }

    // Booking kèm departure + tour (dành cho thanh toán)
    static async getByIdWithDeparture(id) {
        return db("bookings as b")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .leftJoin("tours as t", "d.tour_id", "t.id")
            .select(
                "b.*",
                "d.departure_date",
                "d.departure_location",
                "d.tour_id",
                "d.price_moving",
                "d.price_moving_child",
                "t.name as tour_name",
            )
            .where("b.id", id)
            .first();
    }

    static async getPassengersByBookingId(bookingId) {
        return db("passengers")
            .select("id", "fullname", "gender", "dob", "passenger_type")
            .where("booking_id", bookingId)
            .orderBy("id", "asc");
    }

    // ============ Thanh toán theo từng loại (cọc / nốt / toàn bộ) ============
    // Tất cả là CONDITIONAL UPDATE: mệnh đề WHERE chính là "trạng thái mong đợi".
    // => callback/IPN trùng nhau: chỉ request đầu tiên đổi được (affected rows = 1),
    //    request sau trả về false → service biết là "đã xử lý rồi" (idempotent).

    // Đã cọc: unpaid + pending -> deposit_paid + confirmed.
    // balanceDueAt = min(now + 7 ngày, ngày khởi hành - 3 ngày), tính sẵn ở service (A25).
    static async markDepositPaidIfUnpaid(id, amount, balanceDueAt, trx = null) {
        const updated = await q(trx)("bookings")
            .where("id", id)
            .where("payment_status", "unpaid")
            .where("status", "pending")
            .update({
                payment_status: "deposit_paid",
                status: "confirmed",
                paid_amount: db.raw("paid_amount + ?", [Number(amount) || 0]),
                balance_due_at: balanceDueAt || null,
                updated_at: new Date(),
            });
        return updated > 0;
    }

    // Đã trả nốt: deposit_paid + confirmed -> paid (giữ status confirmed).
    static async markBalancePaidIfDepositPaid(id, amount, trx = null) {
        const updated = await q(trx)("bookings")
            .where("id", id)
            .where("payment_status", "deposit_paid")
            .where("status", "confirmed")
            .update({
                payment_status: "paid",
                paid_amount: db.raw("paid_amount + ?", [Number(amount) || 0]),
                balance_due_at: null,
                updated_at: new Date(),
            });
        return updated > 0;
    }

    // Trả toàn bộ ngay từ đầu: unpaid + pending -> paid + confirmed.
    static async markFullPaidIfUnpaid(id, amount, trx = null) {
        const updated = await q(trx)("bookings")
            .where("id", id)
            .where("payment_status", "unpaid")
            .where("status", "pending")
            .update({
                payment_status: "paid",
                status: "confirmed",
                paid_amount: db.raw("paid_amount + ?", [Number(amount) || 0]),
                balance_due_at: null,
                updated_at: new Date(),
            });
        return updated > 0;
    }

    static async updateStatus(id, status) {
        const updated = await db("bookings")
            .where("id", id)
            .update({ status, updated_at: new Date() });
        return updated > 0;
    }

    // Khách gửi yêu cầu hủy: đổi status + CHỐT SNAPSHOT mốc phạt tại thời điểm bấm hủy.
    // Snapshot (refund_penalty_pct / refund_days_remaining / refund_amount) để admin duyệt
    // sau vài ngày vẫn dùng đúng mốc cũ, không bị phạt nặng hơn do chờ duyệt.
    // Conditional update: chỉ đơn đã cọc / đã trả đủ và chưa hủy mới đổi được.
    static async requestCancellation(id, { refundAmount, penaltyPct, daysRemaining }) {
        const updated = await db("bookings")
            .where("id", id)
            .whereIn("payment_status", ["deposit_paid", "paid"])
            .whereNotIn("status", ["cancel_requested", "cancelled"])
            .update({
                status: "cancel_requested",
                refund_amount: Number(refundAmount) || 0,
                refund_penalty_pct: Number(penaltyPct) || 0,
                refund_days_remaining: Number(daysRemaining) || 0,
                updated_at: new Date(),
            });
        return updated > 0;
    }

    // Hủy booking nếu chưa cancelled/paid — trả về true nếu VỪA đổi trạng thái thành công.
    // Dùng cho lazy-check/sweep/job: 2 request song song chỉ 1 bên trả lời true → không restore ghế 2 lần.
    // reason: 'balance_expired' | 'user' | 'admin'
    static async cancelIfActive(id, reason = null, trx = null) {
        const patch = {
            status: "cancelled",
            cancelled_at: new Date(),
            updated_at: new Date(),
        };
        if (reason) patch.cancel_reason = reason;

        const updated = await q(trx)("bookings")
            .where("id", id)
            .whereNot("status", "cancelled")
            .whereNot("payment_status", "paid")
            .update(patch);
        return updated > 0;
    }

    // Hủy đơn + hủy phiên thanh toán còn treo + nhả ghế trong CÙNG 1 transaction (A4).
    // Đây là thao tác ghi liên bảng (bookings + booking_payments) nên đặt ở repository
    // để service không phải tự mở transaction; quy tắc "khi nào được hủy" vẫn ở service.
    static async cancelWithRelease(id, reason = null) {
        return db.transaction(async (trx) => {
            const cancelled = await Booking.cancelIfActive(id, reason, trx);
            if (!cancelled) return false;

            // Khách không thể dùng lại URL VNPay cũ sau khi đơn đã hủy
            await trx("booking_payments")
                .where("booking_id", id)
                .where("status", "pending")
                .update({ status: "cancelled", updated_at: new Date() });

            // Idempotent theo seats_held: gọi lặp không cộng ghế 2 lần
            await Booking.releaseHeldSeats(id, trx);
            return true;
        });
    }

    // ============ Giữ ghế theo phiên thanh toán (2026-11-02) ============
    // Ghế chỉ bị trừ khi khách BẮT ĐẦU thanh toán (tạo URL VNPay), không trừ lúc đặt.
    // - Chạy trong transaction + khóa row chuyến để 2 khách không cùng trừ 1 ghế cuối.
    // - Đã giữ rồi (seats_held = 1) → true, không trừ thêm (idempotent).
    // - Không đủ ghế → false (service trả 409, KHÔNG tạo URL để khỏi thu tiền oan).
    // trx (tuỳ chọn): khi xác nhận thanh toán, service đã mở transaction sẵn để gộp
    // mark paid + giữ ghế + hủy phiên treo thành 1 khối.
    static async holdSeats(bookingId, departureId, paxCount, trx = null) {
        const pax = Number(paxCount) || 0;
        if (pax <= 0) return true;

        const run = async (t) => {
            // Khóa theo thứ tự booking → departure, giống releaseHeldSeats (tránh deadlock)
            const booking = await t("bookings").where("id", bookingId).forUpdate().first();
            if (!booking) return false;
            if (booking.seats_held) return true;

            const departure = await t("tour_departures")
                .where("id", departureId)
                .forUpdate()
                .first();
            if (!departure) return false;
            if (Number(departure.seats_available) < pax) return false;

            await t("tour_departures")
                .where("id", departureId)
                .decrement("seats_available", pax);

            // Hết ghế thì chuyển 'open' -> 'full' (không đụng chuyến admin đã 'closed')
            await t("tour_departures")
                .where("id", departureId)
                .where("status", "open")
                .where("seats_available", "<=", 0)
                .update({ status: "full" });

            await t("bookings")
                .where("id", bookingId)
                .update({ seats_held: true, updated_at: new Date() });

            return true;
        };

        return trx ? run(trx) : db.transaction(run);
    }

    // Nhả ghế đang giữ (hủy đơn / phiên thanh toán hết hạn).
    // Idempotent: chỉ nhả khi seats_held = 1 → gọi nhiều lần không cộng ghế 2 lần.
    static async releaseHeldSeats(bookingId, trx = null) {
        const run = async (t) => {
            const booking = await t("bookings").where("id", bookingId).forUpdate().first();
            if (!booking || !booking.seats_held) return false;

            const pax = Number(booking.adults || 0) + Number(booking.children || 0);

            // Đổi cờ trước để request song song thấy seats_held = 0 và dừng lại
            await t("bookings")
                .where("id", bookingId)
                .update({ seats_held: false, updated_at: new Date() });

            if (pax > 0) {
                // LEAST(...) để không vượt seats_total nếu dữ liệu đã lệch
                await t.raw(
                    "UPDATE tour_departures SET seats_available = LEAST(seats_total, seats_available + ?) WHERE id = ?",
                    [pax, booking.departure_id],
                );
                await t("tour_departures")
                    .where("id", booking.departure_id)
                    .where("status", "full")
                    .where("seats_available", ">", 0)
                    .update({ status: "open" });
            }

            return true;
        };

        return trx ? run(trx) : db.transaction(run);
    }

    // Các đơn đã cọc nhưng quá hạn trả nốt (dùng cho sweep BullMQ)
    static async findExpiredDeposit(balanceDueBefore) {
        return db("bookings")
            .where("status", "confirmed")
            .where("payment_status", "deposit_paid")
            .whereNotNull("balance_due_at")
            .where("balance_due_at", "<", balanceDueBefore);
    }

    // Số đơn chưa cọc (pending + unpaid) của 1 user (A23) — chỉ để chống spam, không giữ ghế.
    // Không còn lọc theo hạn thanh toán: đơn chưa cọc không tự hết hạn nữa.
    static async countActiveUnpaidByUser(userId) {
        const row = await db("bookings")
            .where("user_id", userId)
            .where("status", "pending")
            .where("payment_status", "unpaid")
            .count({ n: "*" })
            .first();
        return Number(row?.n || 0);
    }

    static async delete(id) {
        const deleted = await db("bookings").where("id", id).del();
        return deleted > 0;
    }
}

export default Booking;
