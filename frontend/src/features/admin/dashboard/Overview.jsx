import { useCallback, useEffect, useState } from "react";
import StatCards from "./components/StatCards";
import RevenueOverview from "./components/RevenueOverview";
import TopDestinations from "./components/TopDestinations";
import TripsSummary from "./components/TripsSummary";
import TravelPackages from "./components/TravelPackages";
import Messages from "./components/Messages";
import RecentBookings from "./components/RecentBookings";
import CalendarCard from "./components/CalendarCard";
import UpcomingTrips from "./components/UpcomingTrips";
import RecentActivity from "./components/RecentActivity";
import { getDashboard } from "./dashboard.api";

// Dữ liệu rỗng dùng khi API chưa trả về, tránh component bị crash.
const EMPTY_DASHBOARD = {
    stats: [],
    revenue: { data: [], meta: {} },
    destinations: [],
    tripsSummary: { total: "0", items: [] },
    travelPackages: [],
    messages: [],
    recentBookings: [],
    calendar: {
        weekdays: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
        today: new Date().getDate(),
        departuresByMonth: {},
    },
    upcomingTrips: [],
    activities: [],
};

// Trang Tổng quan (/admin) — bố cục 2 cột theo thiết kế dashboard.
// Toàn bộ số liệu lấy từ API thật: GET /api/admin/dashboard.
export default function Overview() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await getDashboard();
            if (response.success) {
                setData(response.data);
            } else {
                setError(response.message || "Không tải được dữ liệu tổng quan");
            }
        } catch (err) {
            setError(err?.message || "Lỗi kết nối máy chủ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const view = data || EMPTY_DASHBOARD;

    return (
        <div className={`dashboard-page ${loading && !data ? "is-loading" : ""}`}>
            {error && (
                <div className="dash-alert" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={load} disabled={loading}>
                        {loading ? "Đang tải…" : "Thử lại"}
                    </button>
                </div>
            )}

            {!data && loading && (
                <div className="dash-skeleton" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </div>
            )}

            <div className="main-grid">
                <div className="col-left">
                    <StatCards stats={view.stats} />

                    <div className="row-2">
                        <RevenueOverview data={view.revenue.data} meta={view.revenue.meta} />
                        <TopDestinations data={view.destinations} />
                    </div>

                    <div className="row-3">
                        <div className="stack">
                            <TripsSummary data={view.tripsSummary} />
                            <TravelPackages packages={view.travelPackages} />
                        </div>
                        <Messages items={view.messages} />
                    </div>
                </div>

                <div className="col-right">
                    <CalendarCard data={view.calendar} />
                    <UpcomingTrips trips={view.upcomingTrips} />
                    <RecentActivity items={view.activities} />
                </div>
            </div>

            {/* Bảng booking để full chiều rộng cho dễ đọc. */}
            <RecentBookings rows={view.recentBookings} />
        </div>
    );
}
