import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const numberFormatter = new Intl.NumberFormat("vi-VN");

// Donut top điểm đến theo số khách.
export default function TopDestinations({ data = [] }) {
    const total = useMemo(
        () => data.reduce((sum, item) => sum + (item.participants || 0), 0),
        [data],
    );

    return (
        <article className="dash-card destinations-card">
            <div className="card-head">
                <div>
                    <h3 className="card-title">Top điểm đến</h3>
                    <p className="card-subtitle">Theo số lượng khách</p>
                </div>
                <span className="card-chip">12 tháng</span>
            </div>

            <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={176}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="percent"
                            nameKey="name"
                            innerRadius={54}
                            outerRadius={78}
                            paddingAngle={3}
                            stroke="none"
                        >
                            {data.map((item) => (
                                <Cell key={item.id} fill={item.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name) => [`${value}%`, name]}
                            contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
                                fontSize: 12,
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div className="donut-center">
                    <strong>{numberFormatter.format(total)}</strong>
                    <span>khách</span>
                </div>
            </div>

            <ul className="destination-list">
                {data.map((item) => (
                    <li key={item.id}>
                        <span className="destination-dot" style={{ background: item.color }} />
                        <span className="destination-name">{item.name}</span>
                        <span className="destination-value">
                            {numberFormatter.format(item.participants)}
                        </span>
                        <span className="destination-percent">{item.percent}%</span>
                    </li>
                ))}
            </ul>
        </article>
    );
}
