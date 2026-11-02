export default function CancelModal({ booking, open, cancelling, onClose, onConfirm }) {
    if (!open) return null;
    const b = booking;
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
            onClick={() => !cancelling && onClose()}
        >
            <div
                className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 id="cancel-title" className="font-bold text-lg text-danger flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-triangle-exclamation" />
                    Xác nhận hủy booking
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                    Bạn có chắc chắn muốn hủy booking <b className="tabular-nums">#MB{b.id}</b> cho tour
                    <b> {b.tour_name}</b> không?
                </p>
                <div className="rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-3 mb-5">
                    <i className="fa-solid fa-circle-info mr-1.5" />
                    {b.payment_status === "deposit_paid" ? (
                        <span>
                            <b>Lưu ý quan trọng:</b> Bạn đã đặt cọc cho booking này. Theo chính sách hoàn hủy,
                            <b> số tiền cọc sẽ không được hoàn lại</b> khi bạn chủ động hủy đơn.
                        </span>
                    ) : (
                        <span>Booking sẽ chuyển sang trạng thái <b>Đã hủy</b>, số ghế đã đặt sẽ được trả lại.</span>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={cancelling}
                        onClick={onClose}
                        className="border border-border text-foreground px-4 py-2 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Không, quay lại
                    </button>
                    <button
                        type="button"
                        disabled={cancelling}
                        onClick={onConfirm}
                        className="bg-danger hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {cancelling && <i className="fa-solid fa-spinner fa-spin" />}
                        Chắc chắn hủy
                    </button>
                </div>
            </div>
        </div>
    );
}