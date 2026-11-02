import express from "express";
import { createBooking, getMyBookings, getBookingDetail, cancelBooking, getBookingRefundInfo, getAllBookings, updateStatus, deleteBooking } from "./booking.controller.js";
import { createVNPayUrl, vnpayReturn, getPaymentSummary, payLater } from "./booking.payment.controller.js";
import { verifyToken, isAdmin, isBookingStaff, isUser } from "../../middlewares/auth.js";
import { validateBooking, validateIdParam, validateStatusUpdate } from "./booking.validate.js";

const router = express.Router();

router.post("/", verifyToken, isUser, validateBooking, createBooking);
router.get("/my-bookings", verifyToken, isUser, getMyBookings);
router.get("/:id/refund-info", verifyToken, isUser, validateIdParam, getBookingRefundInfo);
router.put("/:id/cancel", verifyToken, isUser, validateIdParam, cancelBooking);

router.get("/", verifyToken, isBookingStaff, getAllBookings);
router.put("/:id/status", verifyToken, isBookingStaff, validateIdParam, validateStatusUpdate, updateStatus);
// Xóa booking là thao tác phá hủy → chỉ admin
router.delete("/:id", verifyToken, isAdmin, validateIdParam, deleteBooking);

// ============ VNPay ============
// Callback từ cổng VNPay - public, phải đặt trước route param
router.get("/vnpay-return", vnpayReturn);

// Thanh toán từ link email - public, không cần đăng nhập (dựa trên token ký riêng)
router.get("/payment-summary/:booking_id", getPaymentSummary);
router.post("/pay-later", payLater);

// Chi tiết booking cho user (đặt sau /vnpay-return để không nuốt route callback)
router.get("/:id", verifyToken, isUser, validateIdParam, getBookingDetail);

// Tạo URL thanh toán VNPay cho booking đã tồn tại
router.post("/create-payment-url", verifyToken, isUser, createVNPayUrl);

export default router;