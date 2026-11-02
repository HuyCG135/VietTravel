import { getDashboardService, getDashboardShellService } from "./dashboard.service.js";

// GET /api/admin/dashboard — toàn bộ số liệu trang Tổng quan.
export const getDashboard = async (req, res) => {
    try {
        const data = await getDashboardService();

        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi dashboard:", error);
        res.status(500).json({
            success: false,
            message: "Không tải được dữ liệu tổng quan",
        });
    }
};

// GET /api/admin/dashboard/shell — thông báo + badge menu (nhẹ, dùng cho Header/Sidebar).
export const getDashboardShell = async (req, res) => {
    try {
        const data = await getDashboardShellService();

        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi dashboard shell:", error);
        res.status(500).json({
            success: false,
            message: "Không tải được thông báo",
        });
    }
};
