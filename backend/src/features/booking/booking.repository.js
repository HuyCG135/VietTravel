import db from "../../config/knex.js";

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
            .orderBy("b.created_at", "desc");
    }

    static async getByUserId(userId) {
        return db("bookings as b")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .leftJoin("tours as t", "d.tour_id", "t.id")
            .select(
                "b.*",
                "t.name as tour_name",
                "t.price_default as price",
                "t.duration",
                "t.region",
                "t.cover_image as cover_image",
                "d.departure_date",
            )
            .where("b.user_id", userId)
            .orderBy("b.created_at", "desc");
    }

    static async getById(id) {
        return db("bookings").where("id", id).first();
    }

    // Chi tiết booking cho user: kèm thông tin tour, ngày khởi hành, giá cấu thành
    static async getDetailForUser(id) {
        return db("bookings as b")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .leftJoin("tours as t", "d.tour_id", "t.id")
            .select(
                "b.*",
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
            )
            .where("b.id", id)
            .first();
    }

    static async create(bookingData) {
        const data = {
            ...bookingData,
            adults: bookingData.adults ?? 1,
            children: bookingData.children ?? 0,
            total_price: bookingData.total_price ?? 0,
            payment_status: bookingData.payment_status ?? "unpaid",
            status: bookingData.status ?? "pending",
            note: bookingData.note ?? null,
            created_at: new Date(),
            updated_at: new Date(),
        };
        const [insertId] = await db("bookings").insert(data);
        return insertId;
    }

    // Tạo booking + passengers + trừ ghế trong cùng transaction
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

            await trx("tour_departures")
                .where("id", departure_id)
                .decrement("seats_available", adults + children);

            // A16: giữ status khớp với số ghế — hết ghế thì chuyển 'open' -> 'full'
            // (chỉ đụng 'open', không tự mở lại chuyến admin đã 'closed')
            await trx("tour_departures")
                .where("id", departure_id)
                .where("status", "open")
                .where("seats_available", "<=", 0)
                .update({ status: "full" });

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

    // Xác nhận thanh toán toàn bộ (luồng cũ, 1 lần trả đủ) — giữ lại cho tương thích.
    // Luồng cọc dùng 3 hàm bên dưới (conditional update theo đúng trạng thái hiện tại).
    static async markPaid(id) {
        const updated = await db("bookings")
            .where("id", id)
            .update({ payment_status: "paid", status: "confirmed", updated_at: new Date() });
        return updated > 0;
    }

    // ============ Thanh toán theo từng loại (cọc / nốt / toàn bộ) ============
    // Tất cả là CONDITIONAL UPDATE: mệnh đề WHERE chính là "trạng thái mong đợi".
    // => callback/IPN trùng nhau: chỉ request đầu tiên đổi được (affected rows = 1),
    //    request sau trả về false → service biết là "đã xử lý rồi" (idempotent).

    // Đã cọc: unpaid + pending -> deposit_paid + confirmed.
    // balanceDueAt = min(now + 7 ngày, ngày khởi hành - 3 ngày), tính sẵn ở service (A25).
    static async markDepositPaidIfUnpaid(id, amount, balanceDueAt) {
        const updated = await db("bookings")
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
    static async markBalancePaidIfDepositPaid(id, amount) {
        const updated = await db("bookings")
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
    static async markFullPaidIfUnpaid(id, amount) {
        const updated = await db("bookings")
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

    // Hủy booking nếu chưa cancelled/paid — trả về true nếu VỪA đổi trạng thái thành công.
    // Dùng cho lazy-check/sweep/job: 2 request song song chỉ 1 bên trả lời true → không restore ghế 2 lần.
    // reason: 'deposit_expired' | 'balance_expired' | 'user' | 'admin'
    static async cancelIfActive(id, reason = null) {
        const patch = {
            status: "cancelled",
            cancelled_at: new Date(),
            updated_at: new Date(),
        };
        if (reason) patch.cancel_reason = reason;

        const updated = await db("bookings")
            .where("id", id)
            .whereNot("status", "cancelled")
            .whereNot("payment_status", "paid")
            .update(patch);
        return updated > 0;
    }

    // Hoàn trả ghế khi hủy booking (A16: ghế về > 0 thì mở lại chuyến nếu đang 'full').
    static async restoreSeats(departureId, paxCount) {
        return db.transaction(async (trx) => {
            const updated = await trx("tour_departures")
                .where("id", departureId)
                .increment("seats_available", paxCount);

            await trx("tour_departures")
                .where("id", departureId)
                .where("status", "full")
                .where("seats_available", ">", 0)
                .update({ status: "open" });

            return updated;
        });
    }

    // Các đơn đã cọc nhưng quá hạn trả nốt (dùng cho sweep BullMQ)
    static async findExpiredDeposit(balanceDueBefore) {
        return db("bookings")
            .where("status", "confirmed")
            .where("payment_status", "deposit_paid")
            .whereNotNull("balance_due_at")
            .where("balance_due_at", "<", balanceDueBefore);
    }

    // Số đơn đang giữ chỗ (pending + unpaid) của 1 user (A23).
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
