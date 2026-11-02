import express from "express";
import { getDashboard, getDashboardShell } from "./dashboard.controller.js";
import { ROLE, authorize, isAdmin, verifyToken } from "../../../middlewares/auth.js";

const router = express.Router();

// Chỉ nhân viên khu quản trị mới cần thông báo/badge.
const isStaff = authorize(ROLE.ADMIN, ROLE.TOUR_STAFF, ROLE.BOOKING_STAFF);

// Route tĩnh khai báo trước "/" để không bị nuốt.
router.get("/shell", verifyToken, isStaff, getDashboardShell);
router.get("/", verifyToken, isAdmin, getDashboard);

export default router;
