import { formatVnd } from "../../book-tour/bookingPrices";

export default function CancelModal({ booking, refundInfo, loadingRefund, open, cancelling, onClose, onConfirm }) {
    if (!open) return null;
    const b = booking;

    const penaltyPct = refundInfo?.penaltyPct ?? 0;
    const penaltyAmount = refundInfo?.penaltyAmount ?? 0;
    const refundAmount = refundInfo?.refundAmount ?? 0;
    const daysRemaining = refundInfo?.daysDiff;
    const totalAmount = refundInfo?.totalAmount ?? b.total_price ?? 0;
    const paidAmount = refundInfo?.paidAmount ?? b.paid_amount ?? 0;
    const isDeposit = b.payment_status === "deposit_paid";

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => !cancelling && onClose()}
        >
            <div
                className="w-full max-w-lg bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                    <h3 id="cancel-title" className="font-bold text-lg text-danger flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation" />
                        Xác nhận yêu cầu hủy booking
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={cancelling}
                        className="text-muted hover:text-foreground text-lg cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <p className="text-sm text-foreground">
                    Bạn đang yêu cầu hủy booking <b className="tabular-nums">#MB{b.id}</b> cho tour{" "}
                    <b>{b.tour_name}</b>.
                </p>

                {loadingRefund ? (
                    <div className="py-8 text-center text-sm text-muted">
                        <i className="fa-solid fa-spinner fa-spin mr-2" />
                        Đang tính toán chính sách hoàn tiền...
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-foreground space-y-2">
                            <div className="font-semibold text-amber-800 flex items-center gap-1.5">
                                <i className="fa-solid fa-shield-halved" />
                                Chính sách hoàn tiền áp dụng:
                            </div>
                            <div className="text-xs text-muted leading-relaxed">
                                • ≥ 15 ngày: phạt 10% giá tour <br />
                                • 10 – 14 ngày: phạt 50% giá tour <br />
                                • 7 – 9 ngày: phạt 70% giá tour <br />
                                • Dưới 7 ngày: phạt 100% giá tour (không hoàn)
                            </div>
                            <div className="text-xs text-muted leading-relaxed">
                                Phí phạt tính trên tổng giá tour nhưng không vượt quá số tiền bạn đã trả.
                                Mốc phạt được chốt ngay khi bạn gửi yêu cầu hủy.
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-border space-y-2 text-sm">
                            <div className="flex justify-between items-center text-muted">
                                <span>Thời gian đến ngày khởi hành:</span>
                                <span className="font-semibold text-foreground">{daysRemaining ?? "—"} ngày</span>
                            </div>
                            <div className="flex justify-between items-center text-muted">
                                <span>Tổng giá tour:</span>
                                <span className="font-semibold text-foreground tabular-nums">
                                    {formatVnd(totalAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-muted">
                                <span>{isDeposit ? "Số tiền đã cọc:" : "Số tiền đã thanh toán:"}</span>
                                <span className="font-semibold text-foreground tabular-nums">
                                    {formatVnd(paidAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-muted">
                                <span>Mức phí phạt ({penaltyPct}% giá tour):</span>
                                <span className="font-semibold text-danger tabular-nums">
                                    - {formatVnd(penaltyAmount)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-border flex justify-between items-center">
                                <span className="font-bold text-foreground">Số tiền dự kiến hoàn lại:</span>
                                <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                                    {formatVnd(refundAmount)}
                                </span>
                            </div>
                            {isDeposit && (
                                <div className="text-xs text-muted leading-relaxed pt-1">
                                    Đơn của bạn mới đóng cọc {formatVnd(b.deposit_amount)}. Phần còn lại{" "}
                                    {formatVnd(Math.max(0, totalAmount - paidAmount))} sẽ không bị thu thêm; số hoàn
                                    được tính trên số tiền đã cọc.
                                </div>
                            )}
                        </div>

                        <div className="text-xs text-muted italic">
                            * Lưu ý: Yêu cầu sẽ được gửi tới Ban quản trị để kiểm tra và phê duyệt. Sau khi duyệt, số tiền hoàn sẽ được chuyển khoản thủ công cho bạn.
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <button
                        type="button"
                        disabled={cancelling}
                        onClick={onClose}
                        className="border border-border text-foreground px-4 py-2 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Đóng, giữ booking
                    </button>
                    <button
                        type="button"
                        disabled={cancelling || loadingRefund}
                        onClick={onConfirm}
                        className="bg-danger hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {cancelling && <i className="fa-solid fa-spinner fa-spin" />}
                        Gửi yêu cầu hủy
                    </button>
                </div>
            </div>
        </div>
    );
}
