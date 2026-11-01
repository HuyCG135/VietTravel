import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "../../auth/auth.api";
import { canAccess, homeForRole, isStaff } from "./menuConfig";

// Chặn khách chưa đăng nhập hoặc không phải nhân viên, đồng thời
// chặn truy cập chéo trang giữa các role (backend vẫn kiểm tra lại).
export default function AdminAccessGate({ children }) {
    const location = useLocation();
    const user = getUser();

    if (!user) {
        const redirect = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    if (!isStaff(user.role)) {
        return <Navigate to="/" replace />;
    }

    if (!canAccess(user.role, location.pathname)) {
        return <Navigate to={homeForRole(user.role)} replace />;
    }

    return children;
}
