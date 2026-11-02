import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import TourList from "../features/tours/TourList";
import TourDetail from "../features/tours/TourDetail";
import BookingPage from "../features/user/book-tour/BookingPage";
import Login from "../features/auth/Login";
import Register from "../features/auth/Register";
import ForgotPassword from "../features/auth/ForgotPassword";
import ResetPassword from "../features/auth/ResetPassword";
import VerifyEmail from "../features/auth/VerifyEmail";
import CheckEmail from "../features/auth/CheckEmail";
import About from "../pages/About";
import Contact from "../pages/Contact";
import PaymentResult from "../pages/PaymentResult";
import PaymentPage from "../pages/PaymentPage";

import AdminLayout from "../layouts/AdminLayout";
import AdminRoutes from "./AdminRoutes";

import UserLayout from "../layouts/UserLayout";
import UserRoutes from "./UserRoutes";

import NotFound from "../pages/NotFound";

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                <Route element={<MainLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/tours" element={<TourList />} />
                    <Route path="/tours/:id" element={<TourDetail />} />
                    <Route path="/booking/:tourId" element={<BookingPage />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/payment-result" element={<PaymentResult />} />
                    <Route path="/payment/:bookingId" element={<PaymentPage />} />
                    <Route path="/register-success" element={<CheckEmail />} />

                    <Route path="*" element={<NotFound />} />
                </Route>

                <Route
                    path="/admin/*"
                    element={
                        <AdminLayout>
                            <AdminRoutes />
                        </AdminLayout>
                    }
                />
                <Route
                    path="/user/*"
                    element={
                        <UserLayout>
                            <UserRoutes />
                        </UserLayout>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
