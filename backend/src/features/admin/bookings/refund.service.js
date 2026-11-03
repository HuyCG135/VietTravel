// ================== Logic hoàn tiền (Theo chính sách mới) ==================
// Ưu tiên 1 — Ân hạn 24h sau khi đặt cọc:
//   Khách thanh toán lần đầu (cọc hoặc trả đủ) trong vòng 24h mà gửi yêu cầu hủy
//   → MIỄN PHẠT 100%, hoàn lại toàn bộ số tiền đã trả.
//
// Ưu tiên 2 — Quá 24h, áp mốc hủy theo số ngày trước khởi hành:
//   >= 15 ngày: phạt 10%  → hoàn 90%
//   10-14 ngày: phạt 50% → hoàn 50%
//   7-9 ngày: phạt 70%   → hoàn 30%
//   < 7 ngày: phạt 100%  → hoàn 0%
//
// Cách tính (áp dụng cho cả đơn đã cọc và đã trả đủ):
//   - Phí phạt = % mốc × TỔNG GIÁ TOUR (không phải số đã trả).
//   - Phí phạt không bao giờ vượt quá số tiền khách đã trả.
//   - Số hoàn = số đã trả - phí phạt (không âm).
//   => Đơn cọc 30% hủy sớm (>= 15 ngày, quá 24h): phạt 10% giá tour, hoàn 20% giá tour.
//   => Phần tiền chưa thanh toán không bị truy thu thêm.

const PERCENT_MAP = [
    { minDays: 15, penaltyPct: 10, label: "≥ 15 ngày trước khởi hành" },
    { minDays: 10, penaltyPct: 50, label: "10 – 14 ngày trước khởi hành" },
    { minDays: 7, penaltyPct: 70, label: "7 – 9 ngày trước khởi hành" },
    { minDays: 0, penaltyPct: 100, label: "Dưới 7 ngày trước khởi hành" },
];

// Ân hạn miễn phạt sau lần thanh toán đầu tiên (đặt cọc / trả đủ).
const GRACE_HOURS = 24;
const GRACE_MS = GRACE_HOURS * 60 * 60 * 1000;
export const GRACE_LABEL = "Miễn phí hủy trong 24h kể từ khi đặt cọc";

/** Chuẩn hóa 1 mốc datetime (Date hoặc chuỗi MySQL DATETIME) về Date. */
const toDateTime = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : new Date(value);
    }
    const str = String(value).trim();
    if (!str) return null;
    // MySQL DATETIME trả 'YYYY-MM-DD HH:mm:ss' → thêm 'T' để parse nhất quán
    const normalized = !str.includes("T") && str.includes(" ") ? str.replace(" ", "T") : str;
    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Kiểm tra khách có đang trong 24h miễn phạt kể từ lần thanh toán đầu tiên không.
 * paidAtInput = thời điểm thanh toán cọc (hoặc trả đủ) đầu tiên.
 */
export const resolveGraceWindow = (paidAtInput, now = new Date()) => {
    const paidAt = toDateTime(paidAtInput);
    if (!paidAt) {
        return { graceActive: false, graceHoursLeft: null };
    }

    const elapsed = now.getTime() - paidAt.getTime();
    if (elapsed < 0 || elapsed > GRACE_MS) {
        return { graceActive: false, graceHoursLeft: null };
    }

    return {
        graceActive: true,
        graceHoursLeft: Math.max(0, Math.ceil((GRACE_MS - elapsed) / (60 * 60 * 1000))),
    };
};

/**
 * Chuẩn hóa ngày khởi hành về Date object (00:00:00 giờ địa phương)
 * departureInput có thể là Date object, ISO string ('2026-11-20T00:00:00.000Z'), hoặc date string ('2026-11-20')
 */
const parseDepartureDate = (departureInput) => {
    if (!departureInput) return null;
    if (departureInput instanceof Date) {
        const d = new Date(departureInput);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    const str = String(departureInput).trim();
    // Lấy YYYY-MM-DD
    const ymd = str.slice(0, 10);
    const [year, month, day] = ymd.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const toAmount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
};

const labelOfPenalty = (penaltyPct) => {
    if (Number(penaltyPct) === 0) return GRACE_LABEL;
    const rule = PERCENT_MAP.find((r) => r.penaltyPct === Number(penaltyPct));
    return rule ? rule.label : `${penaltyPct}% giá tour`;
};

/**
 * Tính quote hoàn tiền theo ngày khởi hành hiện tại.
 * @param {Date|string} departureDateInput ngày khởi hành
 * @param {number} paidAmount số tiền khách đã trả thực tế
 * @param {number} [totalPriceInput] tổng giá tour (nền tính phí phạt); bỏ trống thì dùng paidAmount
 * @param {Date|string} [firstPaidAtInput] thời điểm thanh toán đầu tiên (cọc/trả đủ) để xét ân hạn 24h
 */
export const calculateRefund = (
    departureDateInput,
    paidAmount,
    totalPriceInput = null,
    firstPaidAtInput = null,
) => {
    const now = new Date();
    // Đưa now về 00:00:00 để tính số ngày trọn vẹn
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const dep = parseDepartureDate(departureDateInput);
    let daysDiff = 0;
    if (dep && !isNaN(dep.getTime())) {
        daysDiff = Math.round((dep.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Không để daysDiff âm nếu tour đã qua ngày
    const effectiveDays = Math.max(0, daysDiff);

    const paid = toAmount(paidAmount);
    // Nền tính phạt = tổng giá tour; nếu không có thì fallback về số đã trả (tương thích code cũ).
    const total = toAmount(totalPriceInput) || paid;

    // Ân hạn 24h sau lần thanh toán đầu tiên → miễn phạt, hoàn đủ số đã trả.
    const { graceActive, graceHoursLeft } = resolveGraceWindow(firstPaidAtInput, now);
    if (graceActive) {
        return {
            daysDiff: effectiveDays,
            ruleLabel: GRACE_LABEL,
            penaltyPct: 0,
            penaltyAmount: 0,
            refundAmount: paid,
            paidAmount: paid,
            totalAmount: total,
            penaltyBase: "total_price",
            snapshot: false,
            graceActive: true,
            graceHoursLeft,
        };
    }

    const rule = PERCENT_MAP.find((r) => effectiveDays >= r.minDays) || PERCENT_MAP[PERCENT_MAP.length - 1];
    const penaltyPct = rule.penaltyPct;

    // Phạt theo tổng giá tour nhưng không vượt quá số đã thu (không truy thu thêm).
    const penaltyAmount = Math.min(paid, Math.round((total * penaltyPct) / 100));
    const refundAmount = Math.max(0, paid - penaltyAmount);

    return {
        daysDiff: effectiveDays,
        ruleLabel: rule.label,
        penaltyPct,
        penaltyAmount,
        refundAmount,
        paidAmount: paid,
        totalAmount: total,
        penaltyBase: "total_price",
        snapshot: false,
        graceActive: false,
        graceHoursLeft: null,
    };
};

/**
 * Quote hoàn tiền cho 1 booking:
 * - Nếu đơn đã gửi yêu cầu hủy và có snapshot (refund_penalty_pct/refund_days_remaining)
 *   thì dùng lại đúng mốc lúc khách bấm hủy — admin duyệt sau vài ngày vẫn không bị đổi mốc.
 * - Ngược lại tính theo ngày hiện tại + ân hạn 24h kể từ lần thanh toán đầu tiên.
 */
export const resolveRefundQuote = (booking) => {
    if (!booking) {
        return calculateRefund(null, 0, 0);
    }

    const paid = toAmount(booking.paid_amount);
    const total = toAmount(booking.total_price) || paid;
    // first_paid_at do repository gắn thêm (MIN(paid_at) của booking_payments status='paid').
    const firstPaidAt = booking.first_paid_at ?? booking.deposit_paid_at ?? null;

    const rawPct = booking.refund_penalty_pct;
    const hasSnapshot = rawPct !== null && rawPct !== undefined && rawPct !== "";
    if (!hasSnapshot) {
        return calculateRefund(booking.departure_date, paid, total, firstPaidAt);
    }

    const penaltyPct = Number(rawPct) || 0;
    const penaltyAmount = Math.min(paid, Math.round((total * penaltyPct) / 100));

    const rawRefund = booking.refund_amount;
    const refundAmount =
        rawRefund !== null && rawRefund !== undefined && rawRefund !== ""
            ? Math.min(paid, Math.max(0, Number(rawRefund) || 0))
            : Math.max(0, paid - penaltyAmount);

    const rawDays = booking.refund_days_remaining;

    return {
        daysDiff: rawDays !== null && rawDays !== undefined && rawDays !== "" ? Number(rawDays) : null,
        ruleLabel: labelOfPenalty(penaltyPct),
        penaltyPct,
        penaltyAmount,
        refundAmount,
        paidAmount: paid,
        totalAmount: total,
        penaltyBase: "total_price",
        snapshot: true,
        // Snapshot penaltyPct = 0 nghĩa là lúc gửi yêu cầu khách đang trong 24h miễn phạt.
        graceActive: penaltyPct === 0,
        graceHoursLeft: null,
    };
};

export const formatMoney = (v) => {
    const n = Number(v || 0);
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(".", ",")} tỷ đ`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} triệu đ`;
    return `${n.toLocaleString("vi-VN")} đ`;
};
