import { NavLink } from "react-router-dom";
import logoIcon from "../../../assets/images/icon.svg";

// Sidebar quản trị: logo + menu theo role.
// Thông tin cá nhân đã có trên Header nên đáy Sidebar không lặp lại.
// badges: số lượng thật cho từng route (vd { "/admin/bookings": 9 }).
export default function Sidebar({ groups = [], badges = {}, open, onClose }) {
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
                                    const badge = badges[item.to];
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
                                                {badge ? (
                                                    <em className="menu-badge">{badge}</em>
                                                ) : null}
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>
        </>
    );
}
