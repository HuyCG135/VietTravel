import { Routes, Route, Navigate } from "react-router-dom";
import Overview from "../features/admin/dashboard/Overview";
import Profile from "../features/user/profile/Profile";
import TourList from "../features/admin/tours/List";
import TourRequestList from "../features/admin/tour-requests/List";
import ItineraryList from "../features/admin/itineraries/List";
import DepartureList from "../features/admin/departures/List";
import BookingDashboard from "../features/admin/bookings/DashboardBooking";
import AdminBookingDetail from "../features/admin/bookings/BookingDetail";
import ServiceList from "../features/admin/services/List";
import TourServiceList from "../features/admin/tour-services/List";
import TourImageList from "../features/admin/tour-images/List";
import UserList from "../features/admin/users/List";

export default function AdminRoutes() {
    return (
        <Routes>
            <Route index element={<Overview />} />
            <Route path="profile" element={<Profile />} />
            <Route path="tours" element={<TourList />} />
            <Route path="tour-requests" element={<TourRequestList />} />
            <Route path="tours/new" element={<Navigate to="/admin/tours" replace />} />
            <Route path="tours/:id/edit" element={<Navigate to="/admin/tours" replace />} />
            <Route path="itineraries" element={<ItineraryList />} />
            <Route path="itineraries/:tourId/edit" element={<Navigate to="/admin/itineraries" replace />} />
            <Route path="departures" element={<DepartureList />} />
            <Route path="bookings" element={<BookingDashboard />} />
            <Route path="bookings/:id" element={<AdminBookingDetail />} />
            <Route path="services" element={<ServiceList />} />
            <Route path="services/new" element={<Navigate to="/admin/services" replace />} />
            <Route path="services/:id/edit" element={<Navigate to="/admin/services" replace />} />
            <Route path="tour-services" element={<TourServiceList />} />
            <Route path="tour-services/:tourId/edit" element={<Navigate to="/admin/tour-services" replace />} />
            <Route path="tour-images" element={<TourImageList />} />
            <Route path="tour-images/:tourId/edit" element={<Navigate to="/admin/tour-images" replace />} />
            <Route path="users" element={<UserList />} />
        </Routes>
    );
}
