import { getToken } from "../../auth/auth.api";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const DASHBOARD_URL = `${API_URL}/admin/dashboard`;

const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
});

// Gắn httpStatus để component xử lý 401/403 nhất quán với các API admin khác.
const parseJson = async (res) => {
    const json = await res.json().catch(() => ({}));
    json.httpStatus = res.status;
    return json;
};

// Toàn bộ số liệu trang Tổng quan (KPI, biểu đồ, lịch, booking gần đây…).
export async function getDashboard() {
    const res = await fetch(DASHBOARD_URL, { headers: authHeaders() });
    return parseJson(res);
}

// Thông báo Header + badge menu Sidebar (nhẹ hơn, dùng cho mọi role quản trị).
export async function getDashboardShell() {
    const res = await fetch(`${DASHBOARD_URL}/shell`, { headers: authHeaders() });
    return parseJson(res);
}
