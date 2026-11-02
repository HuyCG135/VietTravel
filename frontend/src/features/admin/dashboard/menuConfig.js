// Cấu hình menu + phân quyền cho khu vực quản trị.
// Nguồn duy nhất cho Sidebar, Header (breadcrumb, tìm kiếm) và guard route.
import {
    LayoutDashboard,
    Map,
    Lightbulb,
    Route,
    MapPin,
    CalendarCheck,
    ConciergeBell,
    ListChecks,
    Images,
    Users,
} from "lucide-react";

export const STAFF_ROLES = ["admin", "tour-staff", "booking-staff"];

export const ROLE_LABEL = {
    admin: "Quản trị viên",
    "tour-staff": "Nhân viên tour",
    "booking-staff": "Nhân viên booking",
    customer: "Khách hàng",
};

// Trang mặc định sau khi đăng nhập / khi vào route không có quyền.
export const ROLE_HOME = {
    admin: "/admin",
    "tour-staff": "/admin/tours",
    "booking-staff": "/admin/bookings",
};

export function homeForRole(role) {
    return ROLE_HOME[role] || "/";
}

export function isStaff(role) {
    return STAFF_ROLES.includes(role);
}

const TOUR_ROLES = ["admin", "tour-staff"];
const BOOKING_ROLES = ["admin", "booking-staff"];

// Menu chia nhóm; mỗi item khai báo role được phép thấy.
export const ADMIN_MENU = [
    {
        label: "Tổng quan",
        items: [
            { to: "/admin", end: true, label: "Tổng quan", icon: LayoutDashboard, roles: ["admin"] },
        ],
    },
    {
        label: "Quản lý tour",
        items: [
            { to: "/admin/tours", label: "Quản lý tour", icon: Map, roles: TOUR_ROLES },
            {
                to: "/admin/tour-requests",
                label: "Đề xuất tour",
                icon: Lightbulb,
                badge: 7,
                roles: TOUR_ROLES,
            },
            { to: "/admin/itineraries", label: "Lịch trình", icon: Route, roles: TOUR_ROLES },
            { to: "/admin/departures", label: "Điểm khởi hành", icon: MapPin, roles: TOUR_ROLES },
            { to: "/admin/services", label: "Dịch vụ", icon: ConciergeBell, roles: TOUR_ROLES },
            { to: "/admin/tour-services", label: "Dịch vụ tour", icon: ListChecks, roles: TOUR_ROLES },
            { to: "/admin/tour-images", label: "Hình ảnh tour", icon: Images, roles: TOUR_ROLES },
        ],
    },
    {
        label: "Kinh doanh",
        items: [
            {
                to: "/admin/bookings",
                label: "Quản lý booking",
                icon: CalendarCheck,
                badge: 3,
                roles: BOOKING_ROLES,
            },
        ],
    },
    {
        label: "Hệ thống",
        items: [
            { to: "/admin/users", label: "Tài khoản nhân viên", icon: Users, roles: ["admin"] },
        ],
    },
];

// Bản menu đã lọc theo role (bỏ nhóm rỗng).
export function menuForRole(role) {
    return ADMIN_MENU.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.roles.includes(role)),
    })).filter((group) => group.items.length > 0);
}

// Toàn bộ item mà role được phép thấy (dùng cho tìm kiếm + breadcrumb).
export function itemsForRole(role) {
    return menuForRole(role).flatMap((group) =>
        group.items.map((item) => ({ ...item, group: group.label })),
    );
}

// Lấy tiêu đề + nhóm của trang hiện tại từ pathname.
export function pageMeta(role, pathname) {
    const items = itemsForRole(role);

    // Khớp dài nhất trước để /admin/bookings/123 không rơi vào /admin.
    const matched = [...items]
        .sort((a, b) => b.to.length - a.to.length)
        .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

    if (matched && pathname !== matched.to && pathname !== "/admin") {
        if (matched.to === "/admin/bookings") {
            return { title: "Chi tiết booking", group: matched.group };
        }
        if (matched.to === "/admin/tour-requests") {
            return { title: "Chi tiết đề xuất tour", group: matched.group };
        }
    }

    if (pathname === "/admin/profile") {
        return { title: "Trang cá nhân", group: "Tài khoản" };
    }

    return matched
        ? { title: matched.label, group: matched.group }
        : { title: "Tổng quan", group: "Quản trị" };
}

// Quyền truy cập theo segment đầu tiên của /admin/*.
const ROUTE_ACCESS = {
    "": ["admin"],
    profile: STAFF_ROLES,
    tours: TOUR_ROLES,
    "tour-requests": TOUR_ROLES,
    itineraries: TOUR_ROLES,
    departures: TOUR_ROLES,
    services: TOUR_ROLES,
    "tour-services": TOUR_ROLES,
    "tour-images": TOUR_ROLES,
    bookings: BOOKING_ROLES,
    users: ["admin"],
};

export function canAccess(role, pathname) {
    const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0] || "";
    const allowed = ROUTE_ACCESS[segment];
    if (!allowed) return false;
    return allowed.includes(role);
}
