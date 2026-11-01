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
import {
    stats,
    revenueData,
    destinations,
    tripsSummary,
    travelPackages,
    messages,
    recentBookings,
    calendarData,
    upcomingTrips,
    activities,
} from "./data/mockData";

// Trang Tổng quan (/admin) — bố cục 2 cột theo thiết kế dashboard.
export default function Overview() {
    return (
        <div className="dashboard-page">
            <div className="main-grid">
                <div className="col-left">
                    <StatCards stats={stats} />

                    <div className="row-2">
                        <RevenueOverview data={revenueData} />
                        <TopDestinations data={destinations} />
                    </div>

                    <div className="row-3">
                        <div className="stack">
                            <TripsSummary data={tripsSummary} />
                            <TravelPackages packages={travelPackages} />
                        </div>
                        <Messages items={messages} />
                    </div>
                </div>

                <div className="col-right">
                    <CalendarCard data={calendarData} />
                    <UpcomingTrips trips={upcomingTrips} />
                    <RecentActivity items={activities} />
                </div>
            </div>

            {/* Bảng booking để full chiều rộng cho dễ đọc. */}
            <RecentBookings rows={recentBookings} />
        </div>
    );
}
