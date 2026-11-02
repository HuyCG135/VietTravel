export const BOOKING_STATUS = {
	pending: {
		label: "Đang chờ xác nhận",
		icon: "fa-solid fa-clock",
		cls: "bg-amber-500/10 text-amber-800",
	},
	confirmed: {
		label: "Đã xác nhận",
		icon: "fa-solid fa-circle-check",
		cls: "bg-emerald-500/10 text-emerald-800",
	},
	cancelled: {
		label: "Đã hủy",
		icon: "fa-solid fa-circle-xmark",
		cls: "bg-red-500/10 text-red-700",
	},
	cancel_requested: {
		label: "Yêu cầu hủy",
		icon: "fa-solid fa-clock-rotate-left",
		cls: "bg-amber-500/15 text-amber-800 ",
	},
};

export const BOOKING_PAYMENT = {
	unpaid: {
		label: "Chưa thanh toán",
		icon: "fa-regular fa-credit-card",
		chip: "bg-amber-500/10 text-amber-800",
	},
	deposit_paid: {
		label: "Đã đặt cọc (30%)",
		icon: "fa-solid fa-file-invoice-dollar",
		chip: "bg-sky-500/10 text-sky-800",
	},
	paid: {
		label: "Đã thanh toán đủ",
		icon: "fa-solid fa-circle-check",
		chip: "bg-emerald-500/10 text-emerald-800",
	},
	refunded: {
		label: "Đã hoàn tiền",
		icon: "fa-solid fa-rotate-left",
		chip: "bg-rose-500/10 text-rose-800",
	},
};

export const COMPLETED_STATUS = {
	label: "Đã hoàn thành",
	icon: "fa-solid fa-flag-checkered",
	cls: "bg-emerald-500/10 text-emerald-800",
};
