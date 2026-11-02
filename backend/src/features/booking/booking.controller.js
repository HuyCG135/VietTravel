import {
    createBookingService,
    getMyBookingsService,
    getBookingDetailService,
    getAllBookingsService,
    cancelBookingService,
    getBookingRefundInfoService,
    updateStatusService,
    deleteBookingService,
} from "./booking.service.js";

const handleError = (res, error, fallbackMessage) => {
    if (error.status && error.status < 500) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
        });
    }

    console.error(`${fallbackMessage}:`, error);
    res.status(500).json({
        success: false,
        message: fallbackMessage,
        error: error.message,
    });
};

export const createBooking = async (req, res) => {
    try {
        const booking = await createBookingService(req.user.id, req.user.role, req.body);

        res.status(201).json({
            success: true,
            message: "Đặt tour thành công!",
            data: booking,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi đặt tour");
    }
};

export const getMyBookings = async (req, res) => {
    try {
        const bookings = await getMyBookingsService(req.user.id);

        res.json({
            success: true,
            count: bookings.length,
            data: bookings,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi lấy danh sách đặt tour");
    }
};

export const getBookingDetail = async (req, res) => {
    try {
        const booking = await getBookingDetailService(req.user.id, req.user.role, req.params.id);

        res.json({
            success: true,
            data: booking,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi lấy chi tiết booking");
    }
};

export const getBookingRefundInfo = async (req, res) => {
    try {
        const data = await getBookingRefundInfoService(req.user.id, req.user.role, req.params.id);

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi lấy thông tin hoàn tiền");
    }
};

export const cancelBooking = async (req, res) => {
    try {
        const result = await cancelBookingService(req.user.id, req.user.role, req.params.id);

        res.json({
            success: true,
            message: result.message || "Yêu cầu hủy booking thành công",
            data: result.refundInfo,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi hủy booking");
    }
};

export const getAllBookings = async (req, res) => {
    try {
        const bookings = await getAllBookingsService();

        res.json({
            success: true,
            count: bookings.length,
            data: bookings,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi lấy danh sách bookings");
    }
};

export const updateStatus = async (req, res) => {
    try {
        await updateStatusService(req.params.id, req.body.status);

        res.json({
            success: true,
            message: "Cập nhật trạng thái thành công",
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi cập nhật trạng thái");
    }
};

export const deleteBooking = async (req, res) => {
    try {
        await deleteBookingService(req.params.id);

        res.json({
            success: true,
            message: "Xóa booking thành công",
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi xóa booking");
    }
};