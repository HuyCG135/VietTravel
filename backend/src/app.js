import express from "express";
import cors from "cors";
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import requestLogger from "./middlewares/logger.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import tourRoutes from "./features/tour/tour.routes.js";
import tourAdminRoutes from "./features/admin/tours/tour.routes.js";
import itineraryAdminRoutes from "./features/admin/itineraries/itinerary.routes.js";
import serviceAdminRoutes from "./features/admin/services/service.routes.js";
import tourServiceAdminRoutes from "./features/admin/tour-services/tour-service.routes.js";
import tourImageAdminRoutes from "./features/admin/tour-images/tourImage.routes.js";
import departureAdminRoutes from "./features/admin/departures/departure.routes.js";
import userAdminRoutes from "./features/admin/users/user.routes.js";
import bookingAdminRoutes from "./features/admin/bookings/booking.routes.js";
import authRoutes from "./features/auth/auth.routes.js";
import bookingRoutes from "./features/booking/booking.routes.js";
import favoriteRoutes from "./features/favorite/favorite.routes.js";
import reviewRoutes from "./features/review/review.routes.js";
import chatRoutes from "./features/chat/chat.routes.js";
import tourRequestRoutes from "./features/tour-request/tourRequest.routes.js";
import tourRequestAdminRoutes from "./features/admin/tour-requests/tourRequest.routes.js";
import { initRag } from "./features/chat/rag/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ============ GLOBAL MIDDLEWARES ============
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use(requestLogger);

// Rate limiter (100 requests per 15 minutes)
app.use("/api", rateLimiter(400, 15 * 60 * 1000));

const frontendDistPath = join(__dirname, "../../frontend/dist");

app.use("/api/tours", tourRoutes);
app.use("/api/admin/tours", tourAdminRoutes);
app.use("/api/admin/itineraries", itineraryAdminRoutes);
app.use("/api/admin/services", serviceAdminRoutes);
app.use("/api/admin/tour-services", tourServiceAdminRoutes);
app.use("/api/admin/tour-images", tourImageAdminRoutes);
app.use("/api/admin/departures", departureAdminRoutes);
app.use("/api/admin/users", userAdminRoutes);
app.use("/api/admin/bookings", bookingAdminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/tour-requests", tourRequestRoutes);
app.use("/api/admin/tour-requests", tourRequestAdminRoutes);

// Khởi tạo RAG (index tour) nền — không chặn server, tự thử lại nếu Ollama/DB chưa sẵn sàng
initRag();

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "API is working!",
        timestamp: new Date(),
    });
});

// ============ FRONTEND ROUTES ============
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));

    // SPA fallback for client-side routing
    app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(join(frontendDistPath, "index.html"));
    });
} else {
    app.get("/", (req, res) => {
        res.status(503).json({
            success: false,
            message: "Frontend chưa được build. Chạy: cd frontend && npm run build",
        });
    });
}

// ============ ERROR HANDLERS ============
// 404 handler - phải đặt sau tất cả routes
app.use(notFound);

// Error handler - phải đặt cuối cùng
app.use(errorHandler);

export default app;
