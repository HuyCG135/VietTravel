import { getToken } from "../../auth/auth.api";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const BASE_URL = `${API_URL}/admin/tour-requests`;

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

const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${getToken()}`,
    ...extra,
});

export async function getTourRequests(query = {}) {
    const res = await fetch(`${BASE_URL}${buildQuery(query)}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

export async function getTourRequest(id) {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

export async function updateTourRequestStatus(id, data) {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}/status`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
    });
    return parseJson(res);
}
