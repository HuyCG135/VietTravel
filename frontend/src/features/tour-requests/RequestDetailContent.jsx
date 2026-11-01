import ProposalDraftCard from "./ProposalDraftCard";
import StatusBadge from "./StatusBadge";
import { formatDate, formatDateTime, formatMoneyOrDash } from "./tourRequestUtils";

export default function RequestDetailContent({ request, showUser = false }) {
    if (!request) return null;

    const requestData = request.request_data ?? {};
    const hasDraft =
        request.ai_draft !== null &&
        typeof request.ai_draft === "object" &&
        Object.keys(request.ai_draft).length > 0;
    const chatHistory = Array.isArray(requestData.chat_history)
        ? requestData.chat_history
        : [];
    const duration =
        request.duration ||
        (requestData.duration_days ? `${requestData.duration_days} ngày` : "—");

    const infoItems = [
        {
            label: "Điểm đến",
            value: request.destination || "—",
            icon: "fa-solid fa-location-dot",
        },
        { label: "Thời gian", value: duration, icon: "fa-solid fa-clock" },
        {
            label: "Khởi hành",
            value: request.departure_location || "Chưa xác định",
            icon: "fa-solid fa-plane-departure",
        },
        {
            label: "Ngày dự kiến",
            value: formatDate(request.expected_start_date),
            icon: "fa-solid fa-calendar-day",
        },
        {
            label: "Số khách",
            value: `${request.adults ?? 0} người lớn, ${request.children ?? 0} trẻ em`,
            icon: "fa-solid fa-users",
        },
        {
            label: "Ngân sách/người",
            value: formatMoneyOrDash(request.budget_per_person),
            icon: "fa-solid fa-wallet",
        },
        {
            label: "Tổng dự kiến",
            value: formatMoneyOrDash(request.total_estimate),
            icon: "fa-solid fa-sack-dollar",
        },
        {
            label: "Ngày gửi",
            value: formatDateTime(request.created_at),
            icon: "fa-solid fa-paper-plane",
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted">
                            Đề xuất #{request.id}
                        </span>
                        <StatusBadge status={request.status} />
                    </div>
                    <h3 className="mt-2 text-xl font-extrabold leading-tight text-foreground">
                        {request.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                        Gửi lúc {formatDateTime(request.created_at)}
                    </p>
                </div>

                <div className="shrink-0 rounded-2xl bg-primary-50 px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Tổng dự kiến
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-primary">
                        {formatMoneyOrDash(request.total_estimate)}
                    </p>
                </div>
            </div>

            {showUser && request.user && (
                <div className="rounded-2xl border border-primary/20 bg-primary-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Khách hàng
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="font-semibold text-foreground">
                            {request.user.fullname || "Chưa cập nhật"}
                        </span>
                        {request.user.email && (
                            <a
                                href={`mailto:${request.user.email}`}
                                className="text-primary hover:underline"
                            >
                                <i className="fa-solid fa-envelope mr-1" aria-hidden="true" />
                                {request.user.email}
                            </a>
                        )}
                        {request.user.phone && (
                            <a
                                href={`tel:${request.user.phone}`}
                                className="text-primary hover:underline"
                            >
                                <i className="fa-solid fa-phone mr-1" aria-hidden="true" />
                                {request.user.phone}
                            </a>
                        )}
                    </div>
                    {request.user.address && (
                        <p className="mt-1 text-sm text-muted">{request.user.address}</p>
                    )}
                </div>
            )}

            {request.admin_note && (
                <div className="rounded-2xl border border-info/30 bg-info/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-info">
                        Phản hồi từ admin
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {request.admin_note}
                    </p>
                    {request.reviewed_at && (
                        <p className="mt-2 text-xs text-muted">
                            Cập nhật lúc {formatDateTime(request.reviewed_at)}
                        </p>
                    )}
                </div>
            )}

            <div className="rounded-2xl border border-border bg-background p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    {infoItems.map((item) => (
                        <div key={item.label} className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface text-xs text-primary shadow-sm">
                                <i className={item.icon} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                                    {item.label}
                                </p>
                                <p className="text-sm font-medium text-foreground">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {requestData.preferences && (
                    <div className="mt-4 rounded-xl border border-border bg-surface p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Yêu cầu của khách
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {requestData.preferences}
                        </p>
                    </div>
                )}

                {chatHistory.length > 0 && (
                    <details className="mt-3 rounded-xl border border-border bg-surface px-3 py-2">
                        <summary className="cursor-pointer text-sm font-semibold text-foreground">
                            Trao đổi với AI ({chatHistory.length})
                        </summary>
                        <div className="mt-2 space-y-2">
                            {chatHistory.map((message, index) => (
                                <p key={`${message.role}-${index}`} className="text-sm leading-relaxed">
                                    <span
                                        className={`font-semibold ${
                                            message.role === "user" ? "text-primary" : "text-muted"
                                        }`}
                                    >
                                        {message.role === "user" ? "Khách" : "AI"}:
                                    </span>{" "}
                                    <span className="whitespace-pre-wrap text-foreground">
                                        {message.content}
                                    </span>
                                </p>
                            ))}
                        </div>
                    </details>
                )}
            </div>

            {hasDraft ? (
                <ProposalDraftCard draft={request.ai_draft} />
            ) : (
                <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted">
                    Đề xuất này chưa có bản nháp AI.
                </p>
            )}
        </div>
    );
}
