import AdminAccessGate from "../features/admin/dashboard/guards";
import DashboardLayout from "../features/admin/dashboard/DashboardLayout";

// Vỏ khu vực quản trị: kiểm tra quyền rồi render Sidebar + Header + nội dung.
// Nội dung các trang nghiệp vụ vẫn giữ nguyên.
export default function AdminLayout({ children }) {
    return (
        <AdminAccessGate>
            <DashboardLayout>{children}</DashboardLayout>
        </AdminAccessGate>
    );
}
