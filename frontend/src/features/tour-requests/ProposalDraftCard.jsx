import { formatMoneyOrDash } from "./tourRequestUtils";

const PRICE_LABELS = {
    transport: "Di chuyển",
    accommodation: "Lưu trú",
    meals: "Ăn uống",
    tickets: "Vé tham quan",
    guide: "Hướng dẫn viên",
    other: "Chi phí khác",
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const asTextArray = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
};

export default function ProposalDraftCard({ draft }) {
    if (!draft) return null;

    const highlights = asArray(draft.highlights);
    const itinerary = asArray(draft.itinerary);
    const includedServices = asArray(draft.included_services);
    const breakdown = draft.price_breakdown ?? {};
    const transport = draft.transport ?? {};

    return (
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark px-5 py-6 text-white sm:px-6">
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-white/5" />

                <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                            AI gợi ý
                        </span>
                        <h3 className="mt-3 text-xl font-extrabold leading-tight sm:text-2xl">
                            {draft.title || "Đề xuất tour"}
                        </h3>
                        {draft.summary && (
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
                                {draft.summary}
                            </p>
                        )}
                    </div>

                    <div className="shrink-0 rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                            Tổng dự kiến
                        </p>
                        <p className="mt-1 text-2xl font-extrabold tabular-nums">
                            {formatMoneyOrDash(draft.total_estimate)}
                        </p>
                    </div>
                </div>

                <div className="relative mt-4 flex flex-wrap gap-2 text-xs font-medium">
                    {draft.destination && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                            <i className="fa-solid fa-location-dot" aria-hidden="true" />
                            {draft.destination}
                        </span>
                    )}
                    {draft.duration && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                            <i className="fa-solid fa-clock" aria-hidden="true" />
                            {draft.duration}
                        </span>
                    )}
                    {draft.region && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                            <i className="fa-solid fa-earth-asia" aria-hidden="true" />
                            {draft.region}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 sm:p-6">
                {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {highlights.map((item, index) => (
                            <span
                                key={`${item}-${index}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-warning"
                            >
                                <i className="fa-solid fa-star" aria-hidden="true" />
                                {item}
                            </span>
                        ))}
                    </div>
                )}

                {itinerary.length > 0 && (
                    <section className="mt-6">
                        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
                            <i className="fa-solid fa-route text-primary" aria-hidden="true" />
                            Lịch trình gợi ý
                        </h4>

                        <ol className="relative mt-4 space-y-4 border-l border-border pl-6">
                            {itinerary.map((day, index) => {
                                const dayNumber = day?.day ?? index + 1;
                                const activities = asTextArray(day?.activities);

                                return (
                                    <li key={`${dayNumber}-${index}`} className="relative">
                                        <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
                                            {dayNumber}
                                        </span>
                                        <p className="font-semibold text-foreground">
                                            {day?.title || `Ngày ${dayNumber}`}
                                        </p>
                                        {activities.length > 0 && (
                                            <p className="mt-1 text-sm leading-relaxed text-muted">
                                                {activities.join(" · ")}
                                            </p>
                                        )}
                                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                                            {day?.meals && (
                                                <span>
                                                    <i className="fa-solid fa-utensils mr-1 text-primary/70" aria-hidden="true" />
                                                    {day.meals}
                                                </span>
                                            )}
                                            {day?.accommodation && (
                                                <span>
                                                    <i className="fa-solid fa-bed mr-1 text-primary/70" aria-hidden="true" />
                                                    {day.accommodation}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Di chuyển
                        </p>
                        <p className="mt-1.5 font-semibold text-foreground">
                            {transport.method || "Đang cập nhật"}
                        </p>
                        {transport.description && (
                            <p className="mt-1 text-sm leading-relaxed text-muted">
                                {transport.description}
                            </p>
                        )}
                        <p className="mt-2 font-bold text-primary">
                            {formatMoneyOrDash(transport.estimated_cost)}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Giá mỗi khách
                        </p>
                        <dl className="mt-2 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">Người lớn</dt>
                                <dd className="font-bold text-foreground">
                                    {formatMoneyOrDash(draft.price_per_adult)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">Trẻ em</dt>
                                <dd className="font-bold text-foreground">
                                    {formatMoneyOrDash(draft.price_per_child)}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Chi tiết chi phí dự kiến
                    </p>
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(PRICE_LABELS).map(([key, label]) => (
                            <div
                                key={key}
                                className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-sm"
                            >
                                <dt className="text-muted">{label}</dt>
                                <dd className="font-semibold tabular-nums text-foreground">
                                    {formatMoneyOrDash(breakdown[key])}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {includedServices.length > 0 && (
                    <section className="mt-5">
                        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
                            <i className="fa-solid fa-circle-check text-success" aria-hidden="true" />
                            Dịch vụ bao gồm
                        </h4>
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                            {includedServices.map((service, index) => (
                                <li
                                    key={`${service}-${index}`}
                                    className="flex items-start gap-2 text-sm text-muted"
                                >
                                    <i className="fa-solid fa-check mt-1 text-xs text-success" aria-hidden="true" />
                                    <span>{service}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {draft.notes && (
                    <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm leading-relaxed text-warning">
                        <i className="fa-solid fa-circle-info mt-0.5" aria-hidden="true" />
                        <span>{draft.notes}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
