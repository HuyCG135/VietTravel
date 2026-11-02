import { Link } from "react-router-dom";

const STATUS_META = {
    confirmed: { label: "Đã xác nhận", className: "confirmed" },
    cancel_requested: { label: "Yêu cầu hủy", className: "pending" },
    cancelled: { label: "Đã hủy", className: "cancelled" },
};

// Bảng booking gần đây trên dashboard.
export default function RecentBookings({ rows = [] }) {
    return (
        <article className="dash-card bookings-card">
            <div className="card-head">
                <div>
                    <h3 className="card-title">Booking gần đây</h3>
                    <p className="card-subtitle">5 đơn đặt tour mới nhất</p>
                </div>
                <Link to="/admin/bookings" className="card-link">
                    Xem tất cả
                </Link>
            </div>

            <div className="table-wrap">
                <table className="dash-table">
                    <thead>
                        <tr>
                            <th>Khách hàng</th>
                            <th>Tour</th>
                            <th className="col-hide-sm">Thời gian</th>
                            <th>Giá trị</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const status = STATUS_META[row.status] || STATUS_META.pending;
                            return (
                                <tr key={row.id}>
                                    <td>
                                        <div className="cell-customer">
                                            <strong>{row.name}</strong>
                                            <small>{row.id}</small>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="cell-customer">
                                            <strong>{row.package}</strong>
                                            <small>{row.duration}</small>
                                        </div>
                                    </td>
                                    <td className="cell-muted col-hide-sm">{row.date}</td>
                                    <td className="cell-price">{row.price}</td>
                                    <td>
                                        <span className={`dash-status ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </article>
    );
}
