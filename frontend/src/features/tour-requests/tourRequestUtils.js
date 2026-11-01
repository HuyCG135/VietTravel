export const STATUS_META = {
    pending: {
        label: "Chờ duyệt",
        icon: "fa-solid fa-clock",
        badge: "bg-warning/10 text-warning",
    },
    reviewing: {
        label: "Đang xem xét",
        icon: "fa-solid fa-magnifying-glass",
        badge: "bg-info/10 text-info",
    },
    approved: {
        label: "Đã duyệt",
        icon: "fa-solid fa-circle-check",
        badge: "bg-success/10 text-success",
    },
    rejected: {
        label: "Từ chối",
        icon: "fa-solid fa-circle-xmark",
        badge: "bg-danger/10 text-danger",
    },
};

export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
}));

export const getStatusMeta = (status) =>
    STATUS_META[status] ?? {
        label: status || "Không xác định",
        icon: "fa-solid fa-circle-question",
        badge: "bg-slate-100 text-muted",
    };

export const EMPTY_REQUEST_FORM = {
    destination: "",
    duration_days: 3,
    departure_location: "",
    expected_start_date: "",
    adults: 2,
    children: 0,
    budget_per_person: "",
    preferences: "",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN");

export const formatNumber = (value) => currencyFormatter.format(Number(value) || 0);

export const formatMoney = (value) => `${formatNumber(value)}đ`;

export const formatMoneyOrDash = (value) =>
    value === null || value === undefined || value === ""
        ? "—"
        : formatMoney(value);

export const formatDate = (value) => {
    if (!value) return "—";

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-");
        return `${day}/${month}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("vi-VN");
};

export const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const toNumberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

// Chuẩn hóa form → payload request_data gửi backend.
export const buildRequestData = (form, chatHistory = []) => ({
    destination: form.destination.trim(),
    duration_days: Number(form.duration_days) || 1,
    departure_location: form.departure_location.trim(),
    expected_start_date: form.expected_start_date || null,
    adults: Number(form.adults) || 1,
    children: Number(form.children) || 0,
    budget_per_person: toNumberOrNull(form.budget_per_person),
    preferences: form.preferences.trim(),
    chat_history: chatHistory
        .filter((message) => message?.role && message?.content)
        .slice(-20)
        .map(({ role, content }) => ({ role, content: String(content).slice(0, 2000) })),
});

// Tóm tắt đề xuất dạng text để admin copy sang form tạo tour thủ công.
export const buildDraftClipboardText = (request) => {
    const draft = request?.ai_draft ?? {};
    const lines = [
        draft.title || request?.title || "",
        `Điểm đến: ${draft.destination || request?.destination || ""}`,
        `Thời gian: ${draft.duration || request?.duration || ""}`,
        `Khởi hành: ${request?.departure_location || ""}`,
        `Ngày dự kiến: ${formatDate(request?.expected_start_date)}`,
        `Số khách: ${request?.adults ?? 0} người lớn, ${request?.children ?? 0} trẻ em`,
        "",
        draft.summary ? `Tóm tắt: ${draft.summary}` : "",
        "",
        "Lịch trình:",
        ...(Array.isArray(draft.itinerary)
            ? draft.itinerary.map(
                  (day) =>
                      `- Ngày ${day.day ?? ""}: ${day.title ?? ""}${
                          Array.isArray(day.activities) && day.activities.length
                              ? ` (${day.activities.join(", ")})`
                              : ""
                      }`,
              )
            : []),
        "",
        `Di chuyển: ${draft.transport?.method ?? ""} — ${
            draft.transport?.description ?? ""
        } (${formatMoneyOrDash(draft.transport?.estimated_cost)})`,
        "",
        "Chi phí dự kiến:",
        `- Di chuyển: ${formatMoneyOrDash(draft.price_breakdown?.transport)}`,
        `- Lưu trú: ${formatMoneyOrDash(draft.price_breakdown?.accommodation)}`,
        `- Ăn uống: ${formatMoneyOrDash(draft.price_breakdown?.meals)}`,
        `- Vé tham quan: ${formatMoneyOrDash(draft.price_breakdown?.tickets)}`,
        `- Hướng dẫn viên: ${formatMoneyOrDash(draft.price_breakdown?.guide)}`,
        `- Khác: ${formatMoneyOrDash(draft.price_breakdown?.other)}`,
        `Tổng dự kiến: ${formatMoneyOrDash(draft.total_estimate)}`,
        "",
        draft.notes ? `Ghi chú: ${draft.notes}` : "",
    ];

    return lines.filter((line) => line !== "").join("\n");
};

export const readStoredProposalDraft = () => {
    try {
        const raw = sessionStorage.getItem("tourRequestDraft");
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed?.savedAt || Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
            sessionStorage.removeItem("tourRequestDraft");
            return null;
        }

        return parsed;
    } catch {
        sessionStorage.removeItem("tourRequestDraft");
        return null;
    }
};

export const storeProposalDraft = (payload) => {
    try {
        sessionStorage.setItem(
            "tourRequestDraft",
            JSON.stringify({ ...payload, savedAt: Date.now() }),
        );
    } catch {
        // sessionStorage đầy hoặc bị chặn — bỏ qua, người dùng vẫn có thể làm lại.
    }
};

export const clearStoredProposalDraft = () => {
    try {
        sessionStorage.removeItem("tourRequestDraft");
    } catch {
        // bỏ qua
    }
};
