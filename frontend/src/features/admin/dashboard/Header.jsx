import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Search,
    Bell,
    ChevronDown,
    Menu,
    LogOut,
    UserRound,
    CheckCheck,
    CalendarCheck,
    Lightbulb,
    ChartColumn,
} from "lucide-react";
import defaultAvatar from "../../../assets/images/image.png";
import logoIcon from "../../../assets/images/icon.svg";
import { getUser, logout } from "../../auth/auth.api";
import { ROLE_LABEL, homeForRole, itemsForRole, pageMeta } from "./menuConfig";

const NOTIFICATION_ICONS = {
    CalendarCheck,
    Lightbulb,
    ChartColumn,
};

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

// Header quản trị: tiêu đề trang, tìm kiếm nhanh, thông báo, tài khoản.
// Không có các tab điều hướng của site khách — menu đã nằm ở Sidebar.
// compact = role chỉ có 1 mục: không có Sidebar nên Header mang luôn logo.
export default function Header({ role, onMenuClick, compact = false, notifications = [] }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getUser();

    const meta = pageMeta(role, location.pathname);

    // Trang Tổng quan (/admin) chưa có tiêu đề riêng trong nội dung nên Header
    // hiển thị h1; các trang khác đã có tiêu đề riêng nên chỉ hiện breadcrumb.
    const isOverview = location.pathname.replace(/\/+$/, "") === "/admin";
    const showTitle = isOverview || compact;
    const crumbs = isOverview || compact
        ? []
        : [...(meta.group && meta.group !== meta.title ? [meta.group] : []), meta.title];

    const [query, setQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [readIds, setReadIds] = useState([]);

    const headerRightRef = useRef(null);
    const searchInputRef = useRef(null);

    const searchItems = useMemo(() => {
        const items = itemsForRole(role).map((item) => ({ ...item, group: item.group }));
        items.push({ to: "/admin/profile", label: "Trang cá nhân", group: "Tài khoản", icon: UserRound });
        return items;
    }, [role]);

    const results = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        const list = keyword
            ? searchItems.filter((item) => item.label.toLowerCase().includes(keyword))
            : searchItems;
        return list.slice(0, 7);
    }, [query, searchItems]);

    const roleNotifications = useMemo(
        () => notifications.filter((item) => item.roles.includes(role)),
        [notifications, role],
    );
    const unreadCount = roleNotifications.filter((item) => !readIds.includes(item.id)).length;

    // Ctrl/Cmd + K để mở ô tìm kiếm.
    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                searchInputRef.current?.focus();
                setSearchOpen(true);
            }
            if (event.key === "Escape") {
                setSearchOpen(false);
                setBellOpen(false);
                setAccountOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Bấm ra ngoài thì đóng toàn bộ dropdown.
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (headerRightRef.current && !headerRightRef.current.contains(event.target)) {
                setSearchOpen(false);
                setBellOpen(false);
                setAccountOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const goTo = (path) => {
        setSearchOpen(false);
        setBellOpen(false);
        setAccountOpen(false);
        navigate(path);
    };

    const handleOpenNotification = (notification) => {
        setReadIds((prev) =>
            prev.includes(notification.id) ? prev : [...prev, notification.id],
        );
        goTo(notification.to);
    };

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <header className="header">
            <div className="header-left">
                {compact ? (
                    <Link to={homeForRole(role)} className="header-brand">
                        <img src={logoIcon} alt="" width="26" height="26" />
                        <span>Vietravel</span>
                        <em>Admin</em>
                    </Link>
                ) : (
                    <button
                        type="button"
                        className="header-menu-btn"
                        onClick={onMenuClick}
                        aria-label="Mở menu quản trị"
                    >
                        <Menu size={20} />
                    </button>
                )}

                <div className="header-title">
                    {crumbs.length > 0 && (
                        <p className="header-breadcrumb">
                            Quản trị
                            {crumbs.slice(0, -1).map((crumb) => (
                                <span key={crumb}>
                                    <i className="sep">/</i>
                                    {crumb}
                                </span>
                            ))}
                            <span>
                                <i className="sep">/</i>
                                <strong>{crumbs[crumbs.length - 1]}</strong>
                            </span>
                        </p>
                    )}
                    {/* Tổng quan chưa có tiêu đề riêng nên hiển thị ở Header;
                        các trang nghiệp vụ đã có tiêu đề riêng, tránh lặp lại. */}
                    {showTitle && <h1>{meta.title}</h1>}
                    <p className="header-subtitle">
                        Xin chào {user?.fullname || "bạn"} · {DATE_FORMATTER.format(new Date())}
                    </p>
                </div>
            </div>

            <div className="header-right" ref={headerRightRef}>
                {/* Tìm kiếm nhanh */}
                <div className={`header-search ${searchOpen ? "is-open" : ""}`}>
                    <Search size={16} className="header-search-icon" />
                    <input
                        ref={searchInputRef}
                        type="search"
                        value={query}
                        placeholder="Tìm kiếm trang, chức năng..."
                        aria-label="Tìm kiếm nhanh"
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setSearchOpen(true);
                        }}
                        onFocus={() => {
                            setSearchOpen(true);
                            setBellOpen(false);
                            setAccountOpen(false);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && results.length > 0) {
                                goTo(results[0].to);
                                setQuery("");
                            }
                        }}
                    />
                    <kbd>Ctrl K</kbd>

                    {searchOpen && (
                        <div className="header-panel search-panel">
                            <p className="panel-label">
                                {query.trim() ? "Kết quả tìm kiếm" : "Đi nhanh"}
                            </p>
                            {results.length === 0 ? (
                                <p className="panel-empty">Không tìm thấy trang phù hợp.</p>
                            ) : (
                                <ul className="search-results">
                                    {results.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <li key={item.to}>
                                                <button type="button" onClick={() => goTo(item.to)}>
                                                    <span className="search-result-icon">
                                                        <Icon size={15} />
                                                    </span>
                                                    <span className="search-result-text">
                                                        <strong>{item.label}</strong>
                                                        <small>{item.group}</small>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Thông báo */}
                <div className="header-action-wrap">
                    <button
                        type="button"
                        className="header-icon-btn"
                        aria-label="Thông báo"
                        aria-expanded={bellOpen}
                        onClick={() => {
                            setBellOpen((prev) => !prev);
                            setAccountOpen(false);
                            setSearchOpen(false);
                        }}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && <em className="bell-dot">{unreadCount}</em>}
                    </button>

                    {bellOpen && (
                        <div className="header-panel bell-panel">
                            <div className="panel-head">
                                <strong>Thông báo</strong>
                                <button
                                    type="button"
                                    onClick={() => setReadIds(roleNotifications.map((item) => item.id))}
                                >
                                    <CheckCheck size={14} /> Đã đọc
                                </button>
                            </div>
                            <ul className="bell-list">
                                {roleNotifications.map((item) => {
                                    const Icon = NOTIFICATION_ICONS[item.icon] || Bell;
                                    const unread = !readIds.includes(item.id);
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                className={unread ? "is-unread" : ""}
                                                onClick={() => handleOpenNotification(item)}
                                            >
                                                <span className="bell-icon">
                                                    <Icon size={16} />
                                                </span>
                                                <span className="bell-text">
                                                    <strong>{item.title}</strong>
                                                    <small>{item.text}</small>
                                                    <em>{item.time}</em>
                                                </span>
                                                {unread && <i className="bell-unread-dot" />}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Tài khoản */}
                <div className="header-action-wrap">
                    <button
                        type="button"
                        className="header-user"
                        aria-label="Tài khoản"
                        aria-expanded={accountOpen}
                        onClick={() => {
                            setAccountOpen((prev) => !prev);
                            setBellOpen(false);
                            setSearchOpen(false);
                        }}
                    >
                        <img src={defaultAvatar} alt="" width="36" height="36" />
                        <span className="header-user-text">
                            <strong>{user?.fullname || "Nhân viên"}</strong>
                            <small>{ROLE_LABEL[role] || "Nhân viên"}</small>
                        </span>
                        <ChevronDown size={16} className={accountOpen ? "is-rotated" : ""} />
                    </button>

                    {accountOpen && (
                        <div className="header-panel account-panel">
                            <div className="account-head">
                                <img src={defaultAvatar} alt="" width="40" height="40" />
                                <div>
                                    <strong>{user?.fullname || "Nhân viên"}</strong>
                                    <small>{user?.email}</small>
                                </div>
                            </div>
                            <ul>
                                <li>
                                    <button type="button" onClick={() => goTo("/admin/profile")}>
                                        <UserRound size={16} /> Trang cá nhân
                                    </button>
                                </li>
                            </ul>
                            <button type="button" className="account-logout" onClick={handleLogout}>
                                <LogOut size={16} /> Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
