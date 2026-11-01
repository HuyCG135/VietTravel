const inputClass = (hasError = false) =>
    [
        "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-foreground",
        "placeholder:text-slate-400 transition-colors duration-150",
        "focus:bg-white focus:outline-none focus:ring-2",
        hasError
            ? "border-danger/60 focus:border-danger focus:ring-danger/20"
            : "border-slate-300 focus:border-primary focus:ring-primary/20",
    ].join(" ");

const todayInputValue = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate(),
    ).padStart(2, "0")}`;
};

function Field({ label, htmlFor, error, hint, className = "", children }) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
                {label}
            </label>
            {children}
            {error ? (
                <p className="mt-1 text-xs font-medium text-danger">{error}</p>
            ) : hint ? (
                <p className="mt-1 text-xs text-muted">{hint}</p>
            ) : null}
        </div>
    );
}

export default function ProposalForm({ form, errors, onChange, onSubmit, loading }) {
    const update = (name, value) => onChange(name, value);

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
            className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"
            noValidate
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-foreground">Cho chúng tôi biết bạn muốn đi đâu</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                        Điền vài thông tin, AI sẽ gợi ý lịch trình và chi phí dự kiến. Bạn có thể yêu cầu chỉnh sửa
                        trước khi gửi admin.
                    </p>
                </div>
                <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary sm:flex">
                    <i className="fa-solid fa-pen-ruler" aria-hidden="true" />
                </span>
            </div>

            <fieldset disabled={loading} className="m-0 mt-5 grid gap-4 border-0 p-0 sm:grid-cols-2">
                <Field
                    label="Điểm đến"
                    htmlFor="proposal-destination"
                    error={errors.destination}
                    className="sm:col-span-2"
                >
                    <input
                        id="proposal-destination"
                        type="text"
                        value={form.destination}
                        onChange={(event) => update("destination", event.target.value)}
                        placeholder="Ví dụ: Đà Lạt, Phú Quốc, Hội An..."
                        maxLength={100}
                        aria-invalid={!!errors.destination}
                        className={inputClass(!!errors.destination)}
                    />
                </Field>

                <Field label="Số ngày" htmlFor="proposal-duration" error={errors.duration_days}>
                    <input
                        id="proposal-duration"
                        type="number"
                        min="1"
                        max="30"
                        step="1"
                        value={form.duration_days}
                        onChange={(event) => update("duration_days", event.target.value)}
                        aria-invalid={!!errors.duration_days}
                        className={inputClass(!!errors.duration_days)}
                    />
                </Field>

                <Field
                    label="Điểm khởi hành"
                    htmlFor="proposal-departure"
                    error={errors.departure_location}
                >
                    <input
                        id="proposal-departure"
                        type="text"
                        value={form.departure_location}
                        onChange={(event) => update("departure_location", event.target.value)}
                        placeholder="Ví dụ: TP. Hồ Chí Minh"
                        maxLength={100}
                        aria-invalid={!!errors.departure_location}
                        className={inputClass(!!errors.departure_location)}
                    />
                </Field>

                <Field label="Ngày dự kiến" htmlFor="proposal-date" error={errors.expected_start_date}>
                    <input
                        id="proposal-date"
                        type="date"
                        min={todayInputValue()}
                        value={form.expected_start_date}
                        onChange={(event) => update("expected_start_date", event.target.value)}
                        aria-invalid={!!errors.expected_start_date}
                        className={inputClass(!!errors.expected_start_date)}
                    />
                </Field>

                <Field
                    label="Ngân sách mỗi người"
                    htmlFor="proposal-budget"
                    error={errors.budget_per_person}
                    hint="Không bắt buộc, đơn vị VNĐ."
                >
                    <input
                        id="proposal-budget"
                        type="number"
                        min="0"
                        step="100000"
                        value={form.budget_per_person}
                        onChange={(event) => update("budget_per_person", event.target.value)}
                        placeholder="Ví dụ: 5000000"
                        aria-invalid={!!errors.budget_per_person}
                        className={inputClass(!!errors.budget_per_person)}
                    />
                </Field>

                <Field label="Người lớn" htmlFor="proposal-adults" error={errors.adults}>
                    <input
                        id="proposal-adults"
                        type="number"
                        min="1"
                        max="20"
                        step="1"
                        value={form.adults}
                        onChange={(event) => update("adults", event.target.value)}
                        aria-invalid={!!errors.adults}
                        className={inputClass(!!errors.adults)}
                    />
                </Field>

                <Field label="Trẻ em" htmlFor="proposal-children" error={errors.children}>
                    <input
                        id="proposal-children"
                        type="number"
                        min="0"
                        max="20"
                        step="1"
                        value={form.children}
                        onChange={(event) => update("children", event.target.value)}
                        aria-invalid={!!errors.children}
                        className={inputClass(!!errors.children)}
                    />
                </Field>

                <Field
                    label="Sở thích / yêu cầu riêng"
                    htmlFor="proposal-preferences"
                    error={errors.preferences}
                    className="sm:col-span-2"
                >
                    <textarea
                        id="proposal-preferences"
                        rows={4}
                        value={form.preferences}
                        onChange={(event) => update("preferences", event.target.value)}
                        placeholder="Ví dụ: thích thiên nhiên, khách sạn 3-4 sao, có trẻ nhỏ, không đi cáp treo..."
                        maxLength={1000}
                        aria-invalid={!!errors.preferences}
                        className={`${inputClass(!!errors.preferences)} resize-y`}
                    />
                </Field>
            </fieldset>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                    <i className="fa-solid fa-circle-info mt-0.5 text-primary" aria-hidden="true" />
                    Kết quả AI chỉ mang tính tham khảo. Admin sẽ kiểm tra và xác nhận trước khi tổ chức tour.
                </p>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                        <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                    )}
                    {loading ? "AI đang soạn đề xuất..." : "Gợi ý lịch trình bằng AI"}
                </button>
            </div>
        </form>
    );
}
