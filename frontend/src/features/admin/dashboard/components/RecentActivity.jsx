import { RefreshCw, CalendarCheck, BadgeCheck, CircleX, Star } from "lucide-react";

const ICONS = { RefreshCw, CalendarCheck, BadgeCheck, CircleX, Star };

// Dòng thời gian hoạt động gần đây.
export default function RecentActivity({ items = [] }) {
    return (
        <article className="dash-card activity-card">
            <div className="card-head">
                <div>
                    <h3 className="card-title">Hoạt động gần đây</h3>
                    <p className="card-subtitle">Cập nhật mới nhất hôm nay</p>
                </div>
            </div>

            <ul className="activity-list">
                {items.map((item) => {
                    const Icon = ICONS[item.icon] || RefreshCw;
                    return (
                        <li key={item.id}>
                            <span className="activity-icon">
                                <Icon size={15} />
                            </span>
                            <div className="activity-body">
                                <p>{item.text}</p>
                                <small>{item.time}</small>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </article>
    );
}
