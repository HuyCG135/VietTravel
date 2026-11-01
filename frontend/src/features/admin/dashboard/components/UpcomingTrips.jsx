import { Link } from "react-router-dom";

// Danh sách chuyến sắp khởi hành.
export default function UpcomingTrips({ trips = [] }) {
    return (
        <article className="dash-card upcoming-card">
            <div className="card-head">
                <div>
                    <h3 className="card-title">Chuyến sắp khởi hành</h3>
                    <p className="card-subtitle">Trong 30 ngày tới</p>
                </div>
                <Link to="/admin/departures" className="card-link">
                    Lịch trình
                </Link>
            </div>

            <ul className="upcoming-list">
                {trips.map((trip) => (
                    <li key={trip.id} className={trip.highlight ? "is-highlight" : ""}>
                        <img src={trip.image} alt={trip.city} loading="lazy" />
                        <div className="upcoming-info">
                            <span>{trip.tag}</span>
                            <strong>{trip.city}</strong>
                            <small>{trip.dates}</small>
                        </div>
                        <div className="upcoming-people">
                            <div className="avatar-stack">
                                {trip.people.map((id) => (
                                    <img
                                        key={id}
                                        src={`https://i.pravatar.cc/40?img=${id}`}
                                        alt=""
                                        loading="lazy"
                                    />
                                ))}
                                <span>{trip.extra}</span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </article>
    );
}
