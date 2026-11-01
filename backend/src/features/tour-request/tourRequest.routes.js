import express from "express";
import {
    createRequest,
    generateDraft,
    getMyRequest,
    getMyRequests,
} from "./tourRequest.controller.js";
import {
    validateCreateRequest,
    validateDraft,
    validateIdParam,
    validateListQuery,
} from "./tourRequest.validate.js";
import { isUser, verifyToken } from "../../middlewares/auth.js";
import rateLimiter from "../../middlewares/rateLimiter.js";

const router = express.Router();

// AI sinh đề xuất là thao tác nặng → giới hạn riêng, chặt hơn rate limiter chung.
const draftLimiter = rateLimiter(8, 15 * 60 * 1000);

router.post("/draft", draftLimiter, validateDraft, generateDraft);
router.post("/", verifyToken, isUser, validateCreateRequest, createRequest);
router.get("/mine", verifyToken, isUser, validateListQuery, getMyRequests);
router.get("/mine/:id", verifyToken, isUser, validateIdParam, getMyRequest);

export default router;
