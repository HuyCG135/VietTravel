import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
    CalendarCheck,
    UserPlus,
    CircleDollarSign,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";

const ICONS = {
    CalendarCheck,
    UserPlus,
    CircleDollarSign,
};

// 3 thẻ KPI đầu trang tổng quan.
export default function StatCards({ stats = [] }) {
    return (
        <section className="stats-row" aria-label="Chỉ số tổng quan">
            {stats.map((item) => {
                const Icon = ICONS[item.icon] || CalendarCheck;
                const color = item.up ? "#0284c7" : "#dc2626";
                const gradientId = `stat-spark-${item.id}`;

                return (
                    <article className="stat-card" key={item.id}>
                        <div className="stat-card-top">
                            <span className="stat-icon">
                                <Icon size={17} />
                            </span>
                            <span className="stat-title">{item.title}</span>
                        </div>

                        <strong className="stat-value">{item.value}</strong>

                        <div className="stat-card-bottom">
                            <div className="stat-main">
                                <span className={`stat-trend ${item.up ? "up" : "down"}`}>
                                    {item.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                    {item.change}
                                </span>
                                <p className="stat-note">{item.note}</p>
                            </div>

                            <div className="stat-spark" aria-hidden="true">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={item.spark.map((value, index) => ({ index, value }))}>
                                        <defs>
                                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={color}
                                            strokeWidth={2}
                                            fill={`url(#${gradientId})`}
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </article>
                );
            })}
        </section>
    );
}
