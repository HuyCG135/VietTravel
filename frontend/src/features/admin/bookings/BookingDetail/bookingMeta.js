// Nhãn + màu trạng thái dùng cho trang Admin Booking Detail.
// Tách riêng khỏi common.jsx để tránh react-refresh/only-export-components.

export const STATUS_META = {
    pending: { label: "Chờ xử lý", chip: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    confirmed: { label: "Đã xác nhận", chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
    cancelled: { label: "Đã hủy", chip: "bg-red-100 text-red-700", dot: "bg-red-500" },
    cancel_requested: { label: "Yêu cầu hủy", chip: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
};

export const PAYMENT_META = {
    unpaid: { label: "Chưa thanh toán", chip: "bg-amber-100 text-amber-700" },
    deposit_paid: { label: "Đã đặt cọc", chip: "bg-sky-100 text-sky-700" },
    paid: { label: "Đã thanh toán", chip: "bg-emerald-100 text-emerald-700" },
    refunded: { label: "Đã hoàn tiền", chip: "bg-purple-100 text-purple-700" },
};
