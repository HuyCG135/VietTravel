import { Link } from "react-router-dom";
import defaultAvatar from "../../../../assets/images/image.png";

// Danh sách tin nhắn / yêu cầu của khách hàng.
export default function Messages({ items = [] }) {
    const unreadTotal = items.reduce((sum, item) => sum + (item.unread || 0), 0);

    return (
        <article className="dash-card messages-card">
            <div className="card-head">
                <div>
                    <h3 className="card-title">
                        Tin nhắn
                        {unreadTotal > 0 && <span className="title-count">{unreadTotal}</span>}
                    </h3>
                    <p className="card-subtitle">Khách hàng liên hệ gần đây</p>
                </div>
                <Link to="/admin/tour-requests" className="card-link">
                    Xem tất cả
                </Link>
            </div>

            <ul className="message-list custom-scrollbar">
                {items.map((item) => (
                    <li key={item.id} className={item.unread ? "is-unread" : ""}>
                        <img src={item.avatar || defaultAvatar} alt="" loading="lazy" />
                        <div className="message-body">
                            <div className="message-top">
                                <strong>{item.name}</strong>
                                <span>{item.time}</span>
                            </div>
                            <p>{item.text}</p>
                        </div>
                        {item.unread > 0 && <em className="message-unread">{item.unread}</em>}
                    </li>
                ))}
            </ul>
        </article>
    );
}
