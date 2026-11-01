import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Rocket } from "lucide-react";
import logoIcon from "../../../assets/images/icon.svg";
import defaultAvatar from "../../../assets/images/image.png";
import { logout } from "../../auth/auth.api";
import { useToast } from "../../../context/ToastContext";
import { ROLE_LABEL } from "./menuConfig";

// Sidebar quản trị: logo + menu theo role + banner nâng cấp + tài khoản.
export default function Sidebar({ groups = [], user, role, open, onClose }) {
    const navigate = useNavigate();
    const toast = useToast();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const handleUpgrade = () => {
        toast.info("Gói nâng cấp đang được phát triển. Vui lòng liên hệ quản trị viên!");
    };

    return (
        <>
            <button
                type="button"
                aria-label="Đóng menu"
                className={`sidebar-overlay ${open ? "is-visible" : ""}`}
                onClick={onClose}
            />

            <aside className={`sidebar ${open ? "is-open" : ""}`}>
                <NavLink to="/admin" className="logo" onClick={onClose} end>
                    <span className="logo-mark">
                        <img src={logoIcon} alt="" width="26" height="26" />
                    </span>
                    <span className="logo-text">Vietravel</span>
                    <em className="logo-tag">Admin</em>
                </NavLink>

                <nav className="menu" aria-label="Menu quản trị">
                    {groups.map((group) => (
                        <div className="menu-group" key={group.label}>
                            <p className="menu-group-label">{group.label}</p>
                            <ul className="menu-list">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.to}>
                                            <NavLink
                                                to={item.to}
                                                end={item.end}
                                                onClick={onClose}
                                                className={({ isActive }) =>
                                                    `menu-item ${isActive ? "active" : ""}`
                                                }
                                            >
                                                <Icon size={18} strokeWidth={2} />
                                                <span>{item.label}</span>
                                                {item.badge ? (
                                                    <em className="menu-badge">{item.badge}</em>
                                                ) : null}
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="upgrade-card">
                    <span className="upgrade-icon">
                        <Rocket size={16} />
                    </span>
                    <p>
                        Nâng cấp trải nghiệm
                        <br />
                        <strong>Vietravel Admin!</strong>
                    </p>
                    <button type="button" onClick={handleUpgrade}>
                        Nâng cấp ngay
                    </button>
                </div>

                <div className="sidebar-user">
                    <img src={defaultAvatar} alt="" width="36" height="36" />
                    <div className="sidebar-user-info">
                        <strong>{user?.fullname || user?.email || "Nhân viên"}</strong>
                        <small>{ROLE_LABEL[role] || "Nhân viên"}</small>
                    </div>
                    <button
                        type="button"
                        className="sidebar-logout"
                        onClick={handleLogout}
                        title="Đăng xuất"
                        aria-label="Đăng xuất"
                    >
                        <LogOut size={17} />
                    </button>
                </div>
            </aside>
        </>
    );
}
