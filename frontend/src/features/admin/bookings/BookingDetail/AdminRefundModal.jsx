import { useState, useEffect } from "react";
import { formatVnd, formatDate } from "./detailFormat";
import { getAdminRefundInfo } from "../bookings.api";

export default function AdminRefundModal({
    booking,
    open,
    processing,
    onClose,
    onApprove,
    onReject,
}) {
    const [refundData, setRefundData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !booking?.id) return;
        let active = true;

        const loadRefund = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await getAdminRefundInfo(booking.id);
                if (!active) return;
                if (res?.success) {
                    setRefundData(res.data);
                } else {
                    setError(res?.message || "Không thể tải thông tin hoàn tiền");
                }
            } catch (err) {
                if (active) setError(err?.message || "Lỗi tải thông tin hoàn tiền");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadRefund();
        return () => {
            active = false;
        };
    }, [open, booking?.id]);

    if (!open) return null;

    const penaltyPct = refundData?.penaltyPct ?? 0;
    const refundAmount = refundData?.refundAmount ?? 0;
    const paidAmount = refundData?.paidAmount ?? booking.paid_amount ?? booking.total_price;
    const totalAmount = refundData?.totalAmount ?? booking.total_price ?? 0;
    const penaltyAmount = refundData?.penaltyAmount ?? Math.round((totalAmount * penaltyPct) / 100);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-refund-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => !processing && onClose()}
        >
            <div
                className="w-full max-w-lg bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                    <h3 id="admin-refund-title" className="font-bold text-lg text-foreground flex items-center gap-2">
                        <i className="fa-solid fa-file-invoice-dollar text-primary" />
                        Xử lý yêu cầu hủy &amp; hoàn tiền
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="text-muted hover:text-foreground text-lg cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-sm text-muted">
                        <i className="fa-solid fa-spinner fa-spin mr-2" />
                        Đang tải thông tin hoàn tiền...
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                        {error}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-sm text-muted">
                            Khách hàng yêu cầu hủy booking <b className="text-foreground tabular-nums">#{booking.id}</b>{" "}
                            (Tour: <b className="text-foreground">{booking.tour_name}</b>, khởi hành:{" "}
                            <b className="text-foreground">{formatDate(booking.departure_date)}</b>).
                        </div>

                        {/* Bảng chính sách */}
                        <div className="rounded-xl bg-slate-50 border border-border p-4 text-xs space-y-1.5 text-muted">
                            <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                                <i className="fa-solid fa-shield-halved text-primary" />
                                Chính sách hoàn tiền tự động tính:
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                                <div className="col-span-2 text-emerald-700">
                                    • Trong 24h kể từ khi đặt cọc: miễn phí hủy (hoàn 100% số đã trả)
                                </div>
                                <div>• ≥ 15 ngày: phạt 10% giá tour</div>
                                <div>• 10 – 14 ngày: phạt 50% giá tour</div>
                                <div>• 7 – 9 ngày: phạt 70% giá tour</div>
                                <div>• Dưới 7 ngày: phạt 100% giá tour</div>
                            </div>
                            <div className="pt-1">
                                Phí phạt tính trên tổng giá tour, không vượt quá số khách đã trả.
                                {refundData?.snapshot ? " Mốc phạt đã chốt lúc khách gửi yêu cầu hủy." : ""}
                            </div>
                        </div>

                        {refundData?.graceActive && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 leading-relaxed">
                                <i className="fa-solid fa-circle-check mr-1.5" />
                                Yêu cầu hủy được gửi trong <b>24h kể từ khi đặt cọc</b> nên được
                                <b> miễn toàn bộ phí phạt</b>, hoàn lại 100% số tiền khách đã trả.
                            </div>
                        )}

                        {/* Chi tiết tính toán */}
                        <div className="rounded-xl border border-border p-4 space-y-2.5 text-sm">
                            <div className="flex justify-between items-center text-muted">
                                <span>Thời gian trước khởi hành (lúc yêu cầu):</span>
                                <span className="font-semibold text-foreground">
                                    {refundData?.daysRemaining ?? "—"} ngày
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-muted">
                                <span>Khung áp dụng:</span>
                                <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                    {refundData?.ruleLabel || "—"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-muted">
                                <span>Tổng giá tour:</span>
                                <span className="font-semibold text-foreground tabular-nums">
                                    {formatVnd(totalAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-muted">
                                <span>Tổng tiền khách đã thanh toán:</span>
                                <span className="font-semibold text-foreground tabular-nums">
                                    {formatVnd(paidAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-muted">
                                <span>
                                    {refundData?.graceActive
                                        ? "Phí phạt hủy (miễn phí trong 24h):"
                                        : `Phí phạt hủy (${penaltyPct}%):`}
                                </span>
                                <span className="font-semibold text-danger tabular-nums">
                                    - {formatVnd(penaltyAmount)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-border flex justify-between items-center">
                                <span className="font-bold text-foreground">Số tiền hoàn cho khách:</span>
                                <span className="text-lg font-extrabold text-emerald-600 tabular-nums">
                                    {formatVnd(refundAmount)}
                                </span>
                            </div>
                        </div>

                        <div className="text-xs text-muted leading-relaxed">
                            💡 Sau khi bạn bấm <b>Phê duyệt</b>: Đơn sẽ chuyển sang <b>Đã hủy</b>, trạng thái thanh toán là <b>Đã hoàn tiền</b>, ghế sẽ được nhả lại cho tour. Bạn cần thực hiện chuyển khoản hoàn tiền thủ công cho khách theo số tiền trên.
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                    <button
                        type="button"
                        disabled={processing || loading}
                        onClick={onReject}
                        className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                    >
                        Từ chối yêu cầu
                    </button>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={processing}
                            onClick={onClose}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            disabled={processing || loading || !!error}
                            onClick={() => onApprove(refundAmount)}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                            {processing && <i className="fa-solid fa-spinner fa-spin" />}
                            Phê duyệt hoàn tiền
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

