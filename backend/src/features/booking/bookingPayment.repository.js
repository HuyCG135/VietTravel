import db from "../../config/knex.js";

// ============ Data access cho bảng booking_payments ============
// Lịch sử từng lần thanh toán (cọc / nốt / toàn bộ).
//
// Quy ước status của MỘT row giao dịch: pending | paid | failed | expired | cancelled
//   - pending   = đã tạo URL, chờ VNPay gọi về
//   - paid      = đã thu được tiền (kể cả callback muộn / trả trùng → đối soát sau)
//   - failed    = VNPay báo lỗi / build URL lỗi
//   - expired   = quá hạn phiên thanh toán (expires_at) mà chưa có tiền
//   - cancelled = chủ động hủy phiên (tạo phiên mới / hủy đơn) — CHƯA từng thu tiền
//
// KHÔNG có status "refunded" ở row-level: hoàn tiền = set refunded_at (A31/A35),
// còn hoàn cả đơn thì dùng bookings.payment_status = 'refunded'.

// Cho phép truyền transaction (trx) vào mọi hàm ghi để service gộp nhiều bước vào 1 transaction.
const q = (trx) => trx || db;

class BookingPayment {
    // Tạo 1 phiên thanh toán mới (status mặc định pending)
    static async create(
        {
            booking_id,
            type,
            amount,
            txn_ref,
            status = "pending",
            expires_at = null,
            provider_response = null,
        },
        trx = null,
    ) {
        const now = new Date();
        const [id] = await q(trx)("booking_payments").insert({
            booking_id,
            type,
            amount,
            status,
            txn_ref,
            provider_response,
            requested_at: now,
            expires_at,
            created_at: now,
            updated_at: now,
        });
        return id;
    }

    static async findById(id, trx = null) {
        return q(trx)("booking_payments").where("id", id).first();
    }

    // Dùng cho callback VNPay: txn_ref là duy nhất nên tra ra đúng 1 row
    static async findByTxnRef(txnRef, trx = null) {
        return q(trx)("booking_payments").where("txn_ref", txnRef).first();
    }

    // Các phiên còn pending của 1 đơn (lọc thêm type nếu cần)
    static async findPendingByBooking(bookingId, type = null, trx = null) {
        const query = q(trx)("booking_payments")
            .where("booking_id", bookingId)
            .where("status", "pending");
        if (type) query.where("type", type);
        return query.orderBy("id", "desc");
    }

    // Đánh dấu paid CHỈ KHI row còn pending → idempotent.
    // false = row đã paid/failed/expired/cancelled (request trùng hoặc callback muộn).
    static async markPaidIfPending(
        txnRef,
        { provider_txn_no = null, provider_response = null } = {},
        trx = null,
    ) {
        const updated = await q(trx)("booking_payments")
            .where("txn_ref", txnRef)
            .where("status", "pending")
            .update({
                status: "paid",
                paid_at: new Date(),
                provider_txn_no,
                provider_response,
                updated_at: new Date(),
            });
        return updated > 0;
    }

    // Tiền đã về nhưng row không còn pending (bị hủy/hết hạn trước đó) → VẪN ghi nhận paid
    // để đối soát (A9). Service sẽ log warning + admin xử lý hoàn tiền thủ công.
    static async markPaidRegardless(
        txnRef,
        { provider_txn_no = null, provider_response = null } = {},
        trx = null,
    ) {
        const updated = await q(trx)("booking_payments")
            .where("txn_ref", txnRef)
            .whereNot("status", "paid")
            .update({
                status: "paid",
                paid_at: new Date(),
                provider_txn_no,
                provider_response,
                updated_at: new Date(),
            });
        return updated > 0;
    }

    // Hủy các phiên pending của 1 đơn (trước khi tạo phiên mới / khi hủy đơn)
    static async cancelPendingByBooking(bookingId, { type = null, trx = null } = {}) {
        const query = q(trx)("booking_payments")
            .where("booking_id", bookingId)
            .where("status", "pending");
        if (type) query.where("type", type);
        return query.update({ status: "cancelled", updated_at: new Date() });
    }

    static async markFailed(txnRef, provider_response = null, trx = null) {
        const updated = await q(trx)("booking_payments")
            .where("txn_ref", txnRef)
            .where("status", "pending")
            .update({ status: "failed", provider_response, updated_at: new Date() });
        return updated > 0;
    }

    static async markExpired(txnRef, trx = null) {
        const updated = await q(trx)("booking_payments")
            .where("txn_ref", txnRef)
            .where("status", "pending")
            .update({ status: "expired", updated_at: new Date() });
        return updated > 0;
    }

    // Hoàn tiền thủ công (admin): chỉ đánh dấu thời điểm, KHÔNG đổi status (A31/A35)
    static async markRefunded(id, trx = null) {
        const updated = await q(trx)("booking_payments")
            .where("id", id)
            .whereNull("refunded_at")
            .update({ refunded_at: new Date(), updated_at: new Date() });
        return updated > 0;
    }

    // Có phiên thanh toán nào còn hiệu lực không (dùng để chặn auto-hủy đơn — A8)
    static async hasActivePendingPayment(bookingId, now = new Date(), trx = null) {
        const row = await q(trx)("booking_payments")
            .where("booking_id", bookingId)
            .where("status", "pending")
            .where("expires_at", ">", now)
            .first("id");
        return Boolean(row);
    }

    // Đơn đã từng phát sinh giao dịch chưa (chặn xóa booking — A15)
    static async existsByBooking(bookingId, trx = null) {
        const row = await q(trx)("booking_payments").where("booking_id", bookingId).first("id");
        return Boolean(row);
    }

    // Đối soát (A31): các khoản "paid" cần admin xem lại —
    //   (a) thuộc đơn đã hủy, (b) trả trùng (nhiều row paid cùng booking + type).
    // Trả về kèm booking_status để admin dễ phân loại.
    static async listNeedsReview(trx = null) {
        const query = q(trx);
        const baseSelect = ["p.*", "b.status as booking_status", "b.payment_status as booking_payment_status"];

        // (a) Tiền đã về nhưng đơn đã bị hủy
        const paidOnCancelled = await query("booking_payments as p")
            .join("bookings as b", "p.booking_id", "b.id")
            .select(baseSelect)
            .where("p.status", "paid")
            .where("b.status", "cancelled");

        // (b) Trả trùng: nhiều row paid cho cùng (booking_id, type)
        const duplicates = await query("booking_payments as p")
            .leftJoin("bookings as b", "p.booking_id", "b.id")
            .select(baseSelect)
            .where("p.status", "paid")
            .whereIn(
                ["p.booking_id", "p.type"],
                query("booking_payments")
                    .select("booking_id", "type")
                    .where("status", "paid")
                    .groupBy("booking_id", "type")
                    .havingRaw("COUNT(*) > 1"),
            );

        // Gộp theo id (một row có thể vướng cả 2 điều kiện)
        const map = new Map();
        for (const row of [...paidOnCancelled, ...duplicates]) {
            map.set(row.id, row);
        }
        return [...map.values()].sort((a, b) => b.id - a.id);
    }
}

export default BookingPayment;
