import { StatusPill } from "./common";
import { formatDateTime } from "../bookingFormat";

export default function BookingHeader({
    booking,
    isCompleted,
    hasReviewed,
    onOpenReview,
    onOpenInvoice,
    onOpenCancel,
    onOpenPay,
    paying,
}) {
    const b = booking;
    return (
        <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-foreground mb-1">
                        Mã booking: <span className="tabular-nums">#MB{b.id}</span>
                    </h1>
                    <p className="text-sm text-muted mb-0">
                        <i className="fa-regular fa-clock mr-1.5" />
                        Ngày đặt: {formatDateTime(b.created_at)}
                    </p>
                </div>
                {isCompleted ? <StatusPill status="confirmed" completed /> : <StatusPill status={b.status} />}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {isCompleted && !hasReviewed && (
                    <button
                        type="button"
                        onClick={onOpenReview}
                        className="inline-flex items-center gap-2 bg-accent hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
                    >
                        <i className="fa-solid fa-star" />
                        Đánh giá tour
                    </button>
                )}
                {isCompleted && hasReviewed && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <i className="fa-solid fa-circle-check text-emerald-600" />
                        Đã đánh giá
                    </span>
                )}
                {b.payment_status !== "paid" && b.status !== "cancelled" && (
                    <button
                        type="button"
                        onClick={onOpenPay}
                        disabled={paying}
                        className={`inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                            b.payment_status === "deposit_paid"
                                ? "bg-amber-600 hover:bg-amber-700"
                                : "bg-primary hover:bg-primary-dark"
                        }`}
                    >
                        {paying ? (
                            <>
                                <span className="w-4 h-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-credit-card" />
                                {b.payment_status === "deposit_paid" ? "Thanh toán nốt" : "Thanh toán ngay"}
                            </>
                        )}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onOpenInvoice}
                    className="inline-flex items-center gap-2 border border-primary text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
                >
                    <i className="fa-solid fa-print" />
                    In hóa đơn
                </button>
                {(b.status === "pending" || b.payment_status === "deposit_paid") && b.status !== "cancelled" && (
                    <button
                        type="button"
                        onClick={onOpenCancel}
                        className="inline-flex items-center gap-2 border border-danger/60 text-danger hover:bg-danger hover:text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
                    >
                        <i className="fa-solid fa-ban" />
                        Hủy booking
                    </button>
                )}
            </div>
        </div>
    );
}
