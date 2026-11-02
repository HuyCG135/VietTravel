import { ReceiptText, RotateCcw } from "lucide-react";
import { formatDate, formatVnd } from "./detailFormat";

// Khối trạng thái thu tiền — màu theo payment_status.
const COLLECTED_META = {
    paid: {
        wrap: "bg-primary-50",
        tone: "text-primary",
        sub: "text-primary/80",
        label: "Đã thu",
        Icon: ReceiptText,
        note: (booking) => `Thanh toán qua: VNPay · ${formatDate(booking.updated_at)}`,
    },
    deposit_paid: {
        wrap: "bg-sky-50",
        tone: "text-sky-700",
        sub: "text-sky-700/80",
        label: "Đã cọc (30%)",
        Icon: ReceiptText,
        note: (booking) => `Đã thu cọc: ${formatVnd(booking.deposit_amount || booking.paid_amount)}`,
    },
    unpaid: {
        wrap: "bg-amber-50",
        tone: "text-amber-700",
        sub: "text-amber-700/80",
        label: "Chưa thu",
        Icon: ReceiptText,
        note: () => "Số tiền cần thanh toán",
    },
    refunded: {
        wrap: "bg-purple-50",
        tone: "text-purple-700",
        sub: "text-purple-700/80",
        label: "Đã hoàn tiền",
        Icon: RotateCcw,
        note: (booking) => `Hoàn tiền ngày ${formatDate(booking.updated_at)}`,
    },
};

export default function TotalPriceCard({ booking, rows = [], total = 0 }) {
    const meta = COLLECTED_META[booking.payment_status] || COLLECTED_META.unpaid;
    const { Icon } = meta;

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <header className="flex items-center gap-2.5 border-b border-border bg-primary-50/60 px-5 py-4">
                <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-primary-dark">Tổng tiền</h2>
            </header>

            <div className="p-5">
                <div className="space-y-3">
                    {rows.map((row) => (
                        <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                            <span className={row.isAdjustment ? "text-emerald-600" : "text-muted"}>
                                {row.label}
                            </span>
                            <span
                                className={`font-semibold tabular-nums ${
                                    row.isAdjustment ? "text-emerald-600" : "text-foreground"
                                }`}
                            >
                                {formatVnd(row.amount)}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="my-4 border-t border-border" />

                <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-bold text-foreground">Tổng cộng</span>
                    <span className="text-xl font-extrabold text-primary tabular-nums">
                        {formatVnd(total)}
                    </span>
                </div>

                <div className={`mt-4 rounded-xl p-4 ${meta.wrap}`}>
                    <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${meta.tone}`} aria-hidden="true" />
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${meta.tone}`}>
                            {meta.label}
                        </span>
                    </div>
                    <p className={`mt-2 text-lg font-extrabold tabular-nums ${meta.tone}`}>
                        {formatVnd(booking.paid_amount || total)}
                    </p>
                    <p className={`mt-1 text-xs ${meta.sub}`}>{meta.note(booking)}</p>
                </div>
            </div>
        </section>
    );
}
