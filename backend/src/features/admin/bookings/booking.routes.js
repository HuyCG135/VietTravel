import express from "express";
import {
    getAllBookings,
    getBookingDetail,
    getStats,
    getTopPackages,
    getTripsOverview,
    updateBookingStatus,
    refundBooking,
    getRefundInfo,
} from "./booking.controller.js";
import {
    validateIdParam,
    validateListQuery,
    validateRangeQuery,
    validateStatusUpdate,
    validateTopPackagesQuery,
} from "./booking.validate.js";
import { isBookingStaff, verifyToken, isAdmin } from "../../../middlewares/auth.js";

const router = express.Router();

router.get("/stats", verifyToken, isBookingStaff, getStats);
router.get("/trips", verifyToken, isBookingStaff, validateRangeQuery, getTripsOverview);
router.get(
    "/top-packages",
    verifyToken,
    isBookingStaff,
    validateTopPackagesQuery,
    getTopPackages,
);

router.get("/", verifyToken, isBookingStaff, validateListQuery, getAllBookings);
router.get("/:id", verifyToken, isBookingStaff, validateIdParam, getBookingDetail);
router.put(
    "/:id/status",
    verifyToken,
    isBookingStaff,
    validateIdParam,
    validateStatusUpdate,
    updateBookingStatus,
);

// ============ HOÀN TIỀN ============
router.get("/:id/refund-info", verifyToken, isAdmin, validateIdParam, getRefundInfo);
router.post("/:id/refund", verifyToken, isAdmin, validateIdParam, refundBooking);

export default router;
