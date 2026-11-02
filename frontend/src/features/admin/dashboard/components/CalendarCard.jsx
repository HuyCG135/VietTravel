import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const pad2 = (value) => String(value).padStart(2, "0");

function buildMonth(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let index = firstDay - 1; index >= 0; index -= 1) {
        cells.push({ day: daysInPrevMonth - index, muted: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push({ day });
    }
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remainder; day += 1) {
        cells.push({ day, muted: true });
    }

    return {
        title: `Tháng ${month + 1}, ${year}`,
        monthKey: `${year}-${pad2(month + 1)}`,
        cells,
        isCurrentMonth:
            year === new Date().getFullYear() && month === new Date().getMonth(),
    };
}

const EMPTY_CALENDAR = {
    weekdays: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    today: new Date().getDate(),
    departuresByMonth: {},
};

// Lịch tháng có đánh dấu ngày hiện tại và ngày có chuyến khởi hành (dữ liệu thật).
export default function CalendarCard({ data = EMPTY_CALENDAR }) {
    const [offset, setOffset] = useState(0);

    const weekdays = data.weekdays || EMPTY_CALENDAR.weekdays;
    const departuresByMonth = data.departuresByMonth || {};
    const today = data.today || EMPTY_CALENDAR.today;

    const view = useMemo(() => {
        const base = new Date();
        return buildMonth(base.getFullYear(), base.getMonth() + offset);
    }, [offset]);

    const departureDays = departuresByMonth[view.monthKey] || [];

    return (
        <article className="dash-card calendar-card">
            <div className="card-head">
                <div>
                    <h3 className="card-title">
                        <CalendarDays size={16} /> Lịch khởi hành
                    </h3>
                    <p className="card-subtitle">Theo dõi chuyến trong tháng</p>
                </div>
                <div className="calendar-nav">
                    <button
                        type="button"
                        aria-label="Tháng trước"
                        onClick={() => setOffset((value) => value - 1)}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        aria-label="Tháng sau"
                        onClick={() => setOffset((value) => value + 1)}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <p className="calendar-title">{view.title}</p>

            <div className="calendar-grid">
                {weekdays.map((weekday) => (
                    <span className="calendar-weekday" key={weekday}>
                        {weekday}
                    </span>
                ))}

                {view.cells.map((cell, index) => {
                    const isToday = !cell.muted && view.isCurrentMonth && cell.day === today;
                    const hasDeparture = !cell.muted && departureDays.includes(cell.day);

                    const classes = [
                        "calendar-day",
                        cell.muted ? "muted" : "",
                        isToday ? "today" : "",
                        hasDeparture ? "has-departure" : "",
                    ]
                        .filter(Boolean)
                        .join(" ");

                    return (
                        <span className={classes} key={`${cell.day}-${index}`}>
                            {cell.day}
                        </span>
                    );
                })}
            </div>

            <div className="calendar-legend">
                <span>
                    <i className="legend-dot primary" /> Hôm nay
                </span>
                <span>
                    <i className="legend-dot warning" /> Có chuyến
                </span>
            </div>
        </article>
    );
}
