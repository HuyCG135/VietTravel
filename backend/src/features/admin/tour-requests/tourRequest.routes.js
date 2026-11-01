import express from "express";
import {
    getAllRequests,
    getRequestDetail,
    updateRequestStatus,
} from "./tourRequest.controller.js";
import {
    validateIdParam,
    validateListQuery,
    validateStatusUpdate,
} from "./tourRequest.validate.js";
import { isTourStaff, verifyToken } from "../../../middlewares/auth.js";

const router = express.Router();

router.get("/", verifyToken, isTourStaff, validateListQuery, getAllRequests);
router.get("/:id", verifyToken, isTourStaff, validateIdParam, getRequestDetail);
router.put(
    "/:id/status",
    verifyToken,
    isTourStaff,
    validateStatusUpdate,
    updateRequestStatus,
);

export default router;
