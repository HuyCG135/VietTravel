const numberFormatter = new Intl.NumberFormat("vi-VN");

// Tổng quan trạng thái chuyến đi (hoàn thành / đã đặt / đã hủy).
export default function TripsSummary({ data }) {
    const items = data?.items ?? [];
    const totalValue = items.reduce((sum, item) => sum + item.value, 0) || 1;

    return (
        <article className="dash-card trips-summary">
            <div className="card-head">
                <div>
                    <h3 className="card-title">Tổng quan chuyến đi</h3>
                    <p className="card-subtitle">Toàn bộ thời gian</p>
                </div>
                <span className="card-chip">Tổng {data?.total}</span>
            </div>

            <div className="trips-body">
                {items.map((item) => {
                    const percent = Math.round((item.value / totalValue) * 100);
                    return (
                        <div className="trip-row" key={item.key}>
                            <div className="trip-row-head">
                                <span className={`trip-dot ${item.color}`} />
                                <span className="trip-label">{item.label}</span>
                                <strong>{numberFormatter.format(item.value)}</strong>
                                <em>{percent}%</em>
                            </div>
                            <div className="trip-track">
                                <span
                                    className={`trip-fill ${item.color}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </article>
    );
}
