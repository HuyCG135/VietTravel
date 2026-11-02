// ================== Logic hoàn tiền (Theo chính sách mới) ==================
// Mốc hủy (so với ngày khởi hành):
//   >= 15 ngày: phạt 10%  → hoàn 90%
//   10-14 ngày: phạt 50% → hoàn 50%
//   7-9 ngày: phạt 70%   → hoàn 30%
//   < 7 ngày: phạt 100%  → hoàn 0%
// Tính trên số đã thu thực tế (paid_amount); không hoàn vượt quá số đã thu.

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

export const calculateRefund = (departureDateInput, paidAmount) => {
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
    const refundAmount = Math.round((Number(paidAmount || 0) * (100 - penaltyPct)) / 100);

    return {
        daysDiff: effectiveDays,
        ruleLabel: rule.label,
        penaltyPct,
        refundAmount,
        paidAmount: Number(paidAmount || 0),
    };
};

export const formatMoney = (v) => {
    const n = Number(v || 0);
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(".", ",")} tỷ đ`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} triệu đ`;
    return `${n.toLocaleString("vi-VN")} đ`;
};
