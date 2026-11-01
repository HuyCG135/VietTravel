import TourRequest from "./tourRequest.repository.js";
import { generateTourProposal } from "./proposal.ai.js";

const createHttpError = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

const isPlainObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const toOptionalNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const pickRequestData = (data = {}) => ({
    destination: String(data.destination ?? "").trim(),
    region: data.region ? String(data.region).trim() : "",
    duration_days: Number(data.duration_days) || 1,
    departure_location: data.departure_location
        ? String(data.departure_location).trim()
        : "",
    expected_start_date: data.expected_start_date || null,
    adults: Math.max(1, Number(data.adults) || 1),
    children: Math.max(0, Number(data.children) || 0),
    budget_per_person: toOptionalNumber(data.budget_per_person),
    preferences: data.preferences ? String(data.preferences).trim() : "",
    chat_history: Array.isArray(data.chat_history)
        ? data.chat_history.slice(-20)
        : [],
});

const normalizeInput = (input = {}) => ({
    ...pickRequestData(input),
    feedback: input.feedback ? String(input.feedback).trim() : "",
    previousDraft: isPlainObject(input.previousDraft)
        ? input.previousDraft
        : null,
});

export const generateDraftService = async (input) => {
    const normalized = normalizeInput(input);
    return generateTourProposal(normalized);
};

export const createTourRequestService = async (userId, payload = {}) => {
    const rawRequestData = payload.request_data;
    const draft = payload.ai_draft;

    if (!isPlainObject(rawRequestData) || !isPlainObject(draft)) {
        throw createHttpError(
            400,
            "Thiếu dữ liệu đề xuất. Vui lòng tạo lại bản nháp AI.",
        );
    }

    const requestData = pickRequestData(rawRequestData);
    const destination =
        String(draft.destination || requestData.destination || "").trim();
    if (!destination) {
        throw createHttpError(400, "Thiếu điểm đến của đề xuất.");
    }

    const title =
        String(draft.title || "").trim() ||
        `${destination} ${String(draft.duration || "").trim()}`.trim() ||
        destination;

    const id = await TourRequest.create({
        user_id: userId,
        title,
        destination,
        region: draft.region || requestData.region || null,
        duration: draft.duration || null,
        departure_location: requestData.departure_location || null,
        expected_start_date: requestData.expected_start_date || null,
        adults: Math.max(1, Number(requestData.adults) || 1),
        children: Math.max(0, Number(requestData.children) || 0),
        budget_per_person: toOptionalNumber(requestData.budget_per_person),
        total_estimate: Math.max(0, toOptionalNumber(draft.total_estimate) || 0),
        request_data: requestData,
        ai_draft: draft,
    });

    return { id, status: "pending" };
};

export const listMyRequestsService = async (userId, query = {}) => {
    return TourRequest.listByUser(userId, {
        page: query.page,
        limit: query.limit,
    });
};

export const getMyRequestService = async (userId, id) => {
    const request = await TourRequest.findByIdForUser(id, userId);
    if (!request) {
        throw createHttpError(404, "Không tìm thấy đề xuất.");
    }
    return request;
};

export const listAdminRequestsService = async (query = {}) => {
    const [result, counts] = await Promise.all([
        TourRequest.listAdmin({
            status: query.status,
            search: typeof query.search === "string" ? query.search.trim() : "",
            page: query.page,
            limit: query.limit,
        }),
        TourRequest.statusCounts(),
    ]);

    return { ...result, counts };
};

export const getAdminRequestService = async (id) => {
    const request = await TourRequest.findById(id);
    if (!request) {
        throw createHttpError(404, "Không tìm thấy đề xuất.");
    }
    return request;
};

export const updateAdminRequestStatusService = async (id, payload = {}, reviewerId) => {
    const existing = await TourRequest.findById(id);
    if (!existing) {
        throw createHttpError(404, "Không tìm thấy đề xuất.");
    }

    const adminNote =
        payload.admin_note === undefined
            ? existing.admin_note
            : String(payload.admin_note ?? "").trim();

    await TourRequest.updateStatus(id, {
        status: payload.status,
        admin_note: adminNote || null,
        reviewed_by: reviewerId,
    });

    return TourRequest.findById(id);
};
