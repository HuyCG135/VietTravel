import { useMemo, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { revenueMeta } from "../data/mockData";

const numberFormatter = new Intl.NumberFormat("vi-VN");

// Biểu đồ doanh thu 7 ngày, chuyển được giữa doanh thu và số lượt đặt.
export default function RevenueOverview({ data = [] }) {
    const [metric, setMetric] = useState("revenue");

    const totalBookings = useMemo(
        () => data.reduce((sum, item) => sum + (item.bookings || 0), 0),
        [data],
    );

    const isRevenue = metric === "revenue";
    const valueLabel = isRevenue ? revenueMeta.total : `${numberFormatter.format(totalBookings)} lượt`;
    const gradientId = `revenue-fill-${metric}`;

    return (
        <article className="dash-card revenue-card">
            <div className="card-head">
                <div>
                    <h3 className="card-title">Doanh thu</h3>
                    <p className="card-subtitle">{revenueMeta.period}</p>
                </div>

                <div className="segmented" role="tablist" aria-label="Chọn chỉ số biểu đồ">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={isRevenue}
                        className={isRevenue ? "active" : ""}
                        onClick={() => setMetric("revenue")}
                    >
                        Doanh thu
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={!isRevenue}
                        className={!isRevenue ? "active" : ""}
                        onClick={() => setMetric("bookings")}
                    >
                        Lượt đặt
                    </button>
                </div>
            </div>

            <div className="revenue-summary">
                <strong>{valueLabel}</strong>
                <span className="growth-pill">
                    <TrendingUp size={13} /> {revenueMeta.growth}
                </span>
            </div>

            <div className="revenue-chart">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0284c7" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#0284c7" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#e8eef5" />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            dy={6}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            tickFormatter={(value) => (isRevenue ? `${value}tr` : value)}
                            width={40}
                        />
                        <Tooltip
                            cursor={{ stroke: "#0284c7", strokeWidth: 1, strokeDasharray: "4 4" }}
                            contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
                                fontSize: 12,
                            }}
                            formatter={(value) => [
                                isRevenue
                                    ? `${numberFormatter.format(value)} triệu đ`
                                    : `${numberFormatter.format(value)} lượt`,
                                isRevenue ? "Doanh thu" : "Lượt đặt",
                            ]}
                            labelFormatter={(label) => `Ngày ${label}`}
                        />
                        <Area
                            type="monotone"
                            dataKey={metric}
                            stroke="#0284c7"
                            strokeWidth={2.5}
                            fill={`url(#${gradientId})`}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </article>
    );
}
