import { Link, NavLink, useNavigate } from "react-router-dom";
import { getUser, logout } from "../features/auth/auth.api";
import logoIcon from "../assets/images/icon.svg";
import defaultAvatar from "../assets/images/image.png";

const navItems = [
    { to: "/", end: true, label: "Điểm đến" },
    { to: "/tours", label: "Tours" },
    { to: "/about", label: "Về chúng tôi" },
    { to: "/contact", label: "Liên hệ" },
    { to: "/admin", label: "Quản trị", staffOnly: true },
];

const STAFF_ROLES = ["admin", "tour-staff", "booking-staff"];

export default function Header() {
    const user = getUser();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const navLinkClass = ({ isActive }) =>
        `no-underline font-medium px-2 py-1 transition-colors ${
            isActive ? "text-primary border-b-2 border-primary" : "text-muted hover:text-primary"
        }`;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex h-[70px] items-center justify-between border-b border-border px-12 bg-surface/80 backdrop-blur-sm">
            <Link to="/" className="flex items-center gap-3 no-underline text-foreground">
                <img className="mr-2" src={logoIcon} alt="Vietravel" width="32" height="32" />
                <h2 className="text-lg font-bold mb-0">Vietravel</h2>
            </Link>

            <nav className="hidden lg:flex flex-1 justify-center items-center gap-6">
                {navItems
                    .filter((item) => !item.staffOnly || STAFF_ROLES.includes(user?.role)) // Chỉ nhân viên mới thấy mục Quản trị
                    .map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                            {item.label}
                        </NavLink>
                    ))}
            </nav>

            <div className="flex items-center gap-2">
                {user ? (
                    <>
                        {!user?.is_verified && (
                            <Link
                                to={`/register-success?email=${encodeURIComponent(user.email || "")}`}
                                className="hidden sm:inline-flex items-center bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-full px-4 py-2 border border-red-200 transition-colors"
                            >
                                Chưa xác thực
                            </Link>
                        )}
                        <Link to="/user/profile" className="rounded-full overflow-hidden block" style={{ width: 40, height: 40 }} title="Thông tin cá nhân">
                            <img src={defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        </Link>
                        <button onClick={handleLogout} className="hidden sm:inline-flex items-center bg-primary-50 hover:bg-primary-100 text-primary font-bold rounded-full px-6 py-2 border border-primary-100 transition-colors cursor-pointer">
                            Đăng xuất
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="hidden sm:inline-flex items-center bg-primary hover:bg-primary-dark text-white font-bold rounded-full px-6 py-2 transition-colors">
                            Đăng nhập
                        </Link>
                        <Link to="/register" className="hidden sm:inline-flex items-center bg-primary-50 hover:bg-primary-100 text-primary font-bold rounded-full px-6 py-2 border border-primary-100 transition-colors">
                            Đăng ký
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
}
