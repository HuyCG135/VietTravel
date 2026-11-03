// ================== Logic hoàn tiền (Theo chính sách mới) ==================
// Mốc hủy (so với ngày khởi hành):
//   >= 15 ngày: phạt 10%  → hoàn 90%
//   10-14 ngày: phạt 50% → hoàn 50%
//   7-9 ngày: phạt 70%   → hoàn 30%
//   < 7 ngày: phạt 100%  → hoàn 0%
//
// Cách tính (áp dụng cho cả đơn đã cọc và đã trả đủ):
//   - Phí phạt = % mốc × TỔNG GIÁ TOUR (không phải số đã trả).
//   - Phí phạt không bao giờ vượt quá số tiền khách đã trả.
//   - Số hoàn = số đã trả - phí phạt (không âm).
//   => Đơn cọc 30% hủy sớm (>= 15 ngày): phạt 10% giá tour, hoàn lại 20% giá tour.
//   => Phần tiền chưa thanh toán không bị truy thu thêm.

const PERCENT_MAP = [
    { minDays: 15, penaltyPct: 10, label: "≥ 15 ngày trước khởi hành" },
    { minDays: 10, penaltyPct: 50, label: "10 – 14 ngày trước khởi hành" },
    { minDays: 7, penaltyPct: 70, label: "7 – 9 ngày trước khởi hành" },
    { minDays: 0, penaltyPct: 100, label: "Dưới 7 ngày trước khởi hành" },
];

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
    const rule = PERCENT_MAP.find((r) => r.penaltyPct === Number(penaltyPct));
    return rule ? rule.label : `${penaltyPct}% giá tour`;
};

/**
 * Tính quote hoàn tiền theo ngày khởi hành hiện tại.
 * @param {Date|string} departureDateInput ngày khởi hành
 * @param {number} paidAmount số tiền khách đã trả thực tế
 * @param {number} [totalPriceInput] tổng giá tour (nền tính phí phạt); bỏ trống thì dùng paidAmount
 */
export const calculateRefund = (departureDateInput, paidAmount, totalPriceInput = null) => {
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

    const rule = PERCENT_MAP.find((r) => effectiveDays >= r.minDays) || PERCENT_MAP[PERCENT_MAP.length - 1];
    const penaltyPct = rule.penaltyPct;

    const paid = toAmount(paidAmount);
    // Nền tính phạt = tổng giá tour; nếu không có thì fallback về số đã trả (tương thích code cũ).
    const total = toAmount(totalPriceInput) || paid;

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
    };
};

/**
 * Quote hoàn tiền cho 1 booking:
 * - Nếu đơn đã gửi yêu cầu hủy và có snapshot (refund_penalty_pct/refund_days_remaining)
 *   thì dùng lại đúng mốc lúc khách bấm hủy — admin duyệt sau vài ngày vẫn không bị đổi mốc.
 * - Ngược lại tính theo ngày hiện tại.
 */
export const resolveRefundQuote = (booking) => {
    if (!booking) {
        return calculateRefund(null, 0, 0);
    }

    const paid = toAmount(booking.paid_amount);
    const total = toAmount(booking.total_price) || paid;

    const rawPct = booking.refund_penalty_pct;
    const hasSnapshot = rawPct !== null && rawPct !== undefined && rawPct !== "";
    if (!hasSnapshot) {
        return calculateRefund(booking.departure_date, paid, total);
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
    };
};

export const formatMoney = (v) => {
    const n = Number(v || 0);
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(".", ",")} tỷ đ`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} triệu đ`;
    return `${n.toLocaleString("vi-VN")} đ`;
};
