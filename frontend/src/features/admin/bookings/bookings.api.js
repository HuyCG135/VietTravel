import { getToken } from "../../auth/auth.api";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const ADMIN_BOOKINGS_URL = `${API_URL}/admin/bookings`;

const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${getToken()}`,
    ...extra,
});

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

// Gắn httpStatus để component xử lý 401/403 nhất quán.
const parseJson = async (res) => {
    const json = await res.json().catch(() => ({}));
    json.httpStatus = res.status;
    return json;
};

// Danh sách booking + search + lọc status + phân trang.
export async function getBookings(query = {}) {
    const res = await fetch(`${ADMIN_BOOKINGS_URL}${buildQuery(query)}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

// Số liệu 3 thẻ StatCards + sparkline 12 tháng.
export async function getBookingStats() {
    const res = await fetch(`${ADMIN_BOOKINGS_URL}/stats`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

// Số chuyến done/canceled theo range (7d | 30d | 3m | 12m).
export async function getTripsOverview(range) {
    const res = await fetch(`${ADMIN_BOOKINGS_URL}/trips${buildQuery({ range })}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

// Top tour theo số khách trong range.
export async function getTopPackages(range = "12m", limit = 5) {
    const res = await fetch(
        `${ADMIN_BOOKINGS_URL}/top-packages${buildQuery({ range, limit })}`,
        {
            headers: authHeaders(),
        },
    );
    return parseJson(res);
}

// Chi tiết booking + danh sách hành khách.
export async function getBookingDetail(id) {
    const res = await fetch(`${ADMIN_BOOKINGS_URL}/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

// Đổi trạng thái booking (pending | confirmed | cancelled | cancel_requested).
export async function updateBookingStatus(id, status) {
    const res = await fetch(
        `${ADMIN_BOOKINGS_URL}/${encodeURIComponent(id)}/status`,
        {
            method: "PUT",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ status }),
        },
    );
    return parseJson(res);
}

// Lấy thông tin tính toán hoàn tiền cho admin
export async function getAdminRefundInfo(id) {
    const res = await fetch(`${ADMIN_BOOKINGS_URL}/${encodeURIComponent(id)}/refund-info`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

// Phê duyệt hoàn tiền (ghi nhận thủ công)
export async function approveRefund(id, data = {}) {
    const res = await fetch(`${ADMIN_BOOKINGS_URL}/${encodeURIComponent(id)}/refund`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
    });
    return parseJson(res);
}

// Từ chối yêu cầu hủy (giữ lại booking ở trạng thái confirmed)
export async function rejectCancelRequest(id) {
    const res = await fetch(`${ADMIN_BOOKINGS_URL}/${encodeURIComponent(id)}/reject-cancel`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
    });
    return parseJson(res);
}
