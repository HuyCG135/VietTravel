import { Link } from "react-router-dom";

// Danh sách gói du lịch nổi bật.
export default function TravelPackages({ packages = [] }) {
    return (
        <article className="dash-card packages-card">
            <div className="card-head">
                <div>
                    <h3 className="card-title">Gói du lịch nổi bật</h3>
                    <p className="card-subtitle">Được đặt nhiều nhất tháng này</p>
                </div>
                <Link to="/admin/tours" className="card-link">
                    Xem tất cả
                </Link>
            </div>

            <ul className="package-list">
                {packages.map((item) => (
                    <li key={item.id}>
                        <img src={item.image} alt={item.city} loading="lazy" />
                        <div className="package-info">
                            <span className="package-tag">{item.tag}</span>
                            <strong>{item.city}</strong>
                            <small>{item.duration}</small>
                        </div>
                        <span className="package-price">{item.price}</span>
                    </li>
                ))}
            </ul>
        </article>
    );
}
