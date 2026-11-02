import { SectionCard, PaymentPill } from "./common";
import { formatVnd } from "../../book-tour/bookingPrices";

export default function PaymentSummary({ booking, priceRows }) {
    const b = booking;
    return (
        <>
            <SectionCard icon="fa-solid fa-receipt" title="Chi tiết thanh toán">
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted">Trạng thái thanh toán</span>
                        <PaymentPill status={b.payment_status} />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted">Hình thức</span>
                        <span className="font-semibold text-foreground">VNPay</span>
                    </div>
                </div>

                <div className="my-4 border-t border-border/70" />

                <div className="space-y-2.5">
                    {priceRows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted">{row.label}</span>
                            <span className="font-semibold text-foreground tabular-nums">{formatVnd(row.amount)}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
                    <span className="font-bold text-foreground">Tổng cộng</span>
                    <span className="text-2xl font-extrabold text-rose-600 tabular-nums leading-tight">
                        {formatVnd(b.total_price)}
                    </span>
                </div>

                {b.payment_status === "deposit_paid" && (
                    <div className="mt-4 p-4 rounded-xl bg-sky-50/70 border border-sky-100 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-sky-900">
                            <span className="font-medium">Tiền cọc đã thanh toán (30%)</span>
                            <span className="font-bold tabular-nums">
                                {formatVnd(b.paid_amount || b.deposit_amount)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-rose-700">
                            <span className="font-medium">Số tiền còn lại cần thanh toán (70%)</span>
                            <span className="font-extrabold tabular-nums">
                                {formatVnd(Math.max(0, Number(b.total_price || 0) - Number(b.paid_amount || 0)))}
                            </span>
                        </div>
                        {b.balance_due_at && (
                            <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between text-xs text-amber-800">
                                <span>Hạn chót thanh toán nốt:</span>
                                <span className="font-bold">
                                    {new Date(b.balance_due_at).toLocaleDateString("vi-VN")}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </SectionCard>

            <SectionCard icon="fa-solid fa-note-sticky" title="Ghi chú">
                <p className="text-sm text-muted italic mb-0">{b.note || "Không có ghi chú nào"}</p>
            </SectionCard>
        </>
    );
}