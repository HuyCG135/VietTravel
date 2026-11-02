import {
    getBookingDetailService,
    getStatsService,
    getTopPackagesService,
    getTripsOverviewService,
    listBookingsService,
    updateBookingStatusService,
    refundBookingService,
    rejectCancelBookingService,
} from "./booking.service.js";
import { calculateRefund } from "./refund.service.js";

const handleError = (res, error) => {
    // Lỗi nghiệp vụ có status (400/403/404) → trả thẳng message.
    if (error.status && error.status < 500) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
        });
    }

    console.error("Lỗi admin booking:", error);
    res.status(500).json({
        success: false,
        message: error.message,
    });
};

// GET /api/admin/bookings — danh sách + search + lọc status + phân trang.
export const getAllBookings = async (req, res) => {
    try {
        const result = await listBookingsService(req.query);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                currentPage: result.page,
                totalPages: Math.ceil(result.total / result.limit),
                total: result.total,
                limit: result.limit,
            },
        });
    } catch (error) {
        handleError(res, error);
    }
};

// GET /api/admin/bookings/stats — số liệu 3 thẻ StatCards.
export const getStats = async (req, res) => {
    try {
        const data = await getStatsService();

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// GET /api/admin/bookings/trips?range=12m — done/canceled theo thời gian.
export const getTripsOverview = async (req, res) => {
    try {
        const data = await getTripsOverviewService(req.query.range);

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// GET /api/admin/bookings/top-packages?range=12m&limit=5 — top tour.
export const getTopPackages = async (req, res) => {
    try {
        const data = await getTopPackagesService(req.query.range, req.query.limit);

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// GET /api/admin/bookings/:id — chi tiết booking + passengers.
export const getBookingDetail = async (req, res) => {
    try {
        const data = await getBookingDetailService(Number(req.params.id));

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// PUT /api/admin/bookings/:id/status — đổi trạng thái (kèm hoàn/trừ ghế).
export const updateBookingStatus = async (req, res) => {
    try {
        const data = await updateBookingStatusService(
            Number(req.params.id),
            req.body.status,
        );

        res.json({
            success: true,
            message: "Cập nhật trạng thái booking thành công",
            data,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// GET /api/admin/bookings/:id/refund-info — tính phí phạt / số tiền hoàn dự kiến
// (chính sách mới: >=15 ngày 10%, 10-14 ngày 50%, 7-9 ngày 70%, <7 ngày 100%).
export const getRefundInfo = async (req, res) => {
    try {
        const booking = await getBookingDetailService(Number(req.params.id));

        if (!booking) {
            return res.status(404).json({ success: false, message: "Không tìm thấy booking" });
        }

        const info = calculateRefund(booking.departure_date, booking.paid_amount);

        res.json({
            success: true,
            data: {
                bookingId: booking.id,
                status: booking.status,
                paymentStatus: booking.payment_status,
                paidAmount: booking.paid_amount,
                departureDate: booking.departure_date,
                daysRemaining: info.daysDiff,
                penaltyPct: info.penaltyPct,
                ruleLabel: info.ruleLabel,
                refundAmount: info.refundAmount,
                refundedAt: booking.refunded_at || null,
            },
        });
    } catch (error) {
        handleError(res, error);
    }
};

// POST /api/admin/bookings/:id/refund — Admin duyệt hoàn tiền (ghi nhận thủ công).
// Body: { refundAmount?, refundMethod?, providerRef?, note? }
// refundAmount: số tiền hoàn thực tế (mặc định tính theo chính sách, không vượt quá paid_amount).
export const refundBooking = async (req, res) => {
    try {
        const bookingId = Number(req.params.id);
        const booking = await getBookingDetailService(bookingId);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Không tìm thấy booking" });
        }

        if (booking.status === "cancelled" && booking.payment_status === "refunded") {
            return res.status(400).json({
                success: false,
                message: "Đơn này đã được hoàn tiền trước đó",
            });
        }

        const info = calculateRefund(booking.departure_date, booking.paid_amount);
        const requestedAmount = Number(req.body?.refundAmount);
        const refundAmount = Number.isFinite(requestedAmount) && requestedAmount > 0
            ? Math.min(requestedAmount, info.refundAmount)
            : info.refundAmount;

        const data = await refundBookingService(bookingId, {
            refundAmount,
            refundMethod: req.body?.refundMethod || "chuyen_khoan",
            providerRef: req.body?.providerRef || null,
            note: req.body?.note || null,
            approvedBy: req.user.id,
        });

        res.json({
            success: true,
            message: "Đã ghi nhận hoàn tiền",
            data,
        });
    } catch (error) {
        handleError(res, error);
    }
};

// POST /api/admin/bookings/:id/reject-cancel — Admin từ chối yêu cầu hủy
export const rejectCancelBooking = async (req, res) => {
    try {
        const bookingId = Number(req.params.id);
        const data = await rejectCancelBookingService(bookingId);

        res.json({
            success: true,
            message: "Đã từ chối yêu cầu hủy booking",
            data,
        });
    } catch (error) {
        handleError(res, error);
    }
};