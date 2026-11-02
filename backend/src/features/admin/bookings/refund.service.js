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

export const calculateRefund = (departureDateStr, paidAmount) => {
    const now = new Date();
    const dep = new Date(departureDateStr + "T00:00:00");
    const daysDiff = Math.ceil((dep.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const rule = PERCENT_MAP.find((r) => daysDiff >= r.minDays) || PERCENT_MAP[PERCENT_MAP.length - 1];
    const penaltyPct = rule.penaltyPct;
    const refundAmount = Math.round((Number(paidAmount || 0) * (100 - penaltyPct)) / 100);

    return {
        daysDiff,
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
