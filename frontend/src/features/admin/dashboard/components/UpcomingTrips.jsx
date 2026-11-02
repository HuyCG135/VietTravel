import { Link } from "react-router-dom";
import defaultImage from "../../../../assets/images/image.png";

// Danh sách chuyến sắp khởi hành (số chỗ còn lại lấy từ tour_departures).
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
                        <img
                            src={trip.image || defaultImage}
                            alt={trip.city}
                            loading="lazy"
                        />
                        <div className="upcoming-info">
                            <span>{trip.tag}</span>
                            <strong>{trip.city}</strong>
                            <small>{trip.dates}</small>
                        </div>
                        <div className="upcoming-people">
                            <span className={`upcoming-seats ${trip.seats <= 5 ? "is-low" : ""}`}>
                                {trip.seats > 0 ? `Còn ${trip.seats} chỗ` : "Hết chỗ"}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </article>
    );
}
