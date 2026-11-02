import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./components/Footer";
import { getUser } from "../../auth/auth.api";
import { menuForRole } from "./menuConfig";
import "./dashboard.css";

// Vỏ chung cho toàn bộ khu vực /admin/*: Sidebar cố định + Header + nội dung.
// Các trang nghiệp vụ giữ nguyên nội dung, chỉ được bọc bởi layout này.
export default function DashboardLayout({ children }) {
    const location = useLocation();
    const user = getUser();
    const role = user?.role;

    const groups = menuForRole(role);
    // Role chỉ có 1 mục menu (vd: booking-staff) thì không cần Sidebar:
    // dùng thanh ngang gọn để nội dung rộng hơn.
    const compact = groups.reduce((total, group) => total + group.items.length, 0) <= 1;

    // Gắn trạng thái mở drawer với path hiện tại: khi đổi route tự đóng
    // mà không cần setState trong effect.
    const [sidebarState, setSidebarState] = useState({ open: false, path: location.pathname });
    const sidebarOpen = !compact && sidebarState.open && sidebarState.path === location.pathname;
    const openSidebar = () => setSidebarState({ open: true, path: location.pathname });
    const closeSidebar = () => setSidebarState({ open: false, path: location.pathname });

    // Bỏ padding-top 70px của Header public trong lúc ở khu quản trị.
    useEffect(() => {
        document.body.classList.add("admin-shell-active");
        return () => document.body.classList.remove("admin-shell-active");
    }, []);

    return (
        <div
            className={`admin-shell ${compact ? "is-compact" : ""} ${
                sidebarOpen ? "sidebar-open" : ""
            }`}
        >
            {!compact && (
                <Sidebar
                    groups={groups}
                    open={sidebarOpen}
                    onClose={closeSidebar}
                />
            )}

            <div className="main">
                <Header role={role} compact={compact} onMenuClick={openSidebar} />

                <main className="admin-content">{children}</main>

                <Footer />
            </div>
        </div>
    );
}
