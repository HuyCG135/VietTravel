import { getToken } from "../auth/auth.api";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const BASE_URL = `${API_URL}/tour-requests`;

const buildQuery = (query = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, value);
        }
    });
    const qs = params.toString();
    return qs ? `?${qs}` : "";
};

const parseJson = async (res) => {
    const json = await res.json().catch(() => ({}));
    json.httpStatus = res.status;
    return json;
};

const authHeaders = (extra = {}) => {
    const token = getToken();
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    };
};

// Công khai: AI sinh bản nháp từ nhu cầu khách hàng.
export async function generateProposal(data) {
    const res = await fetch(`${BASE_URL}/draft`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
    });
    return parseJson(res);
}

// Bắt buộc đăng nhập: gửi đề xuất đã chốt cho admin.
export async function createTourRequest(data) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
    });
    return parseJson(res);
}

export async function getMyTourRequests(query = {}) {
    const res = await fetch(`${BASE_URL}/mine${buildQuery(query)}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

export async function getMyTourRequest(id) {
    const res = await fetch(`${BASE_URL}/mine/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}
