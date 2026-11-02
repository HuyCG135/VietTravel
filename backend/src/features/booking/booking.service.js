import Booking from "./booking.repository.js";
import BookingPayment from "./bookingPayment.repository.js";
import Tour from "../tour/tour.repository.js";
import jwt from "jsonwebtoken";
import { ProductCode, VnpLocale, dateFormat } from "vnpay";
import { ROLE, BOOKING_MANAGEMENT } from "../../middlewares/auth.js";
import { calculateRefund } from "../admin/bookings/refund.service.js";
import {
    DEPOSIT_PERCENT,
    BALANCE_DUE_DAYS,
    BALANCE_DUE_MARGIN_DAYS,
    MIN_DAYS_FOR_DEPOSIT,
    PAYMENT_URL_TTL_MINUTES,
    MAX_UNPAID_BOOKINGS,
} from "../../config/booking.constants.js";
import { scheduleBalanceExpireJob } from "../../jobs/expireQueue.js";
import { sendBookingConfirmedEmail } from "../../shared/mailService.js";

const createHttpError = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

// Lỗi có mã nghiệp vụ để controller IPN map sang RspCode (Bước 5)
const createPaymentError = (code, message, status = 400) => {
    const err = createHttpError(status, message);
    err.code = code;
    return err;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ============ Tiện ích thời gian / tiền ============
// A25: tính mốc bằng JS theo giờ local rồi truyền Date xuống DB (không dùng NOW() + INTERVAL).
const toLocalMidnight = (value) => {
    if (!value) return null;
    // MySQL DATE có thể trả về Date hoặc chuỗi 'YYYY-MM-DD'
    const date =
        value instanceof Date
            ? new Date(value.getTime())
            : new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const todayMidnight = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
};

// Số ngày còn lại tới ngày khởi hành (âm = đã qua)
const getDaysUntilDeparture = (departureDate) => {
    const departure = toLocalMidnight(departureDate);
    if (!departure) return 0;
    return Math.round((departure.getTime() - todayMidnight().getTime()) / DAY_MS);
};

// Chỉ cho đặt cọc khi còn đủ xa ngày khởi hành (A22)
const isDepositAllowed = (departureDate) =>
    getDaysUntilDeparture(departureDate) >= MIN_DAYS_FOR_DEPOSIT;

// Hạn trả nốt = min(now + 7 ngày, ngày khởi hành - 3 ngày) (A25)
const computeBalanceDueAt = (departureDate, now = new Date()) => {
    const maxDue = new Date(now.getTime() + BALANCE_DUE_DAYS * DAY_MS);
    const departure = toLocalMidnight(departureDate);
    if (!departure) return maxDue;

    const departureMargin = new Date(departure.getTime() - BALANCE_DUE_MARGIN_DAYS * DAY_MS);
    return departureMargin.getTime() < maxDue.getTime() ? departureMargin : maxDue;
};

// Tiền cọc làm tròn tới đồng (A10)
const computeDepositAmount = (totalPrice) =>
    Math.round(((Number(totalPrice) || 0) * DEPOSIT_PERCENT) / 100);

// Snapshot tiền của đơn: tổng / đã trả / cọc / còn lại
const getBookingAmounts = (booking) => {
    const total = Number(booking.total_price) || 0;
    const paid = Number(booking.paid_amount) || 0;
    const deposit =
        Number(booking.deposit_amount) > 0
            ? Number(booking.deposit_amount)
            : computeDepositAmount(total);

    return {
        total,
        paid,
        deposit,
        remaining: Math.max(0, total - paid),
    };
};

const getPaxCount = (booking) =>
    Number(booking.adults || 0) + Number(booking.children || 0);

// ============ Hết hạn thanh toán ============
// Sau khi bỏ rule "24h chưa cọc thì tự hủy", chỉ còn 1 nhánh tự hủy:
// đơn ĐÃ CỌC (deposit_paid + confirmed) mà quá balance_due_at → hủy, mất cọc.
// Đơn chưa cọc (pending + unpaid) chỉ bị hủy khi user/admin hủy tay.
const expireOrCancelIfDue = async (booking) => {
    // Đã hủy / đã trả đủ → không xử lý (idempotent)
    if (!booking || booking.status === "cancelled" || booking.payment_status === "paid") {
        return booking;
    }

    // Chỉ đơn đã cọc mới có hạn trả nốt
    if (booking.payment_status !== "deposit_paid" || booking.status !== "confirmed") {
        return booking;
    }
    if (!booking.balance_due_at) return booking;

    const balanceDueMs = new Date(booking.balance_due_at).getTime();
    if (!Number.isFinite(balanceDueMs) || Date.now() <= balanceDueMs) return booking;

    // Đang có phiên VNPay còn hiệu lực → chưa hủy (A8)
    if (await BookingPayment.hasActivePendingPayment(booking.id)) return booking;

    // Hủy + hủy phiên thanh toán + nhả ghế trong 1 transaction (A4).
    // Conditional update bên trong: chỉ request đầu tiên đổi được trạng thái,
    // request song song thấy false sẽ đọc lại DB thay vì nhả ghế lần 2.
    const didCancel = await Booking.cancelWithRelease(booking.id, "balance_expired");
    if (didCancel) {
        return { ...booking, status: "cancelled", cancel_reason: "balance_expired" };
    }
    // Không đổi được → vừa có request khác hủy/đóng tiền, đọc lại DB cho đúng
    const fresh = await Booking.getById(booking.id);
    return fresh || booking;
};

// ============ Gói nghiệp vụ hết hạn — dùng chung cho BullMQ worker/sweep ============
// Cả hai chỉ "gói" lại expireOrCancelIfDue() ở trên: cùng 1 quy tắc idempotent,
// nên chạy trùng với lazy-check (user chạm đơn) cũng không hủy lặp / trả ghế 2 lần.

// Worker gọi khi job "expire-balance" đến hạn: hủy 1 đơn nếu đúng điều kiện
export const expireBookingById = async (bookingId) => {
    const booking = await Booking.getById(bookingId);
    if (!booking) return null;
    return expireOrCancelIfDue(booking);
};

// Sweep gọi định kỳ (mỗi 5 phút):
// 1) Nhả ghế của các phiên thanh toán quá hạn (khách bỏ ngang, không còn giữ chỗ).
// 2) Hủy các đơn đã cọc nhưng quá hạn trả nốt còn trôi (job mất do Redis rớt/app nghỉ).
export const sweepExpiredBookings = async () => {
    // 1) Phiên thanh toán quá hạn → đánh dấu expired; nếu đơn vẫn chưa cọc và
    //    không còn phiên nào hiệu lực thì nhả ghế.
    const expiredPayments = await BookingPayment.findExpiredPending(new Date());
    for (const payment of expiredPayments) {
        await BookingPayment.markExpired(payment.txn_ref);

        const booking = await Booking.getById(payment.booking_id);
        if (!booking || booking.payment_status !== "unpaid") continue;
        if (await BookingPayment.hasActivePendingPayment(booking.id)) continue;
        await Booking.releaseHeldSeats(booking.id);
    }

    // 2) Hủy đơn đã cọc quá hạn trả nốt
    const dueBookings = await Booking.findExpiredDeposit(new Date());
    let expiredCount = 0;
    for (const b of dueBookings) {
        const result = await expireOrCancelIfDue(b);
        if (result?.status === "cancelled") expiredCount++;
    }
    return expiredCount;
};

export const createBookingService = async (userId, role, payload) => {
    if (role !== ROLE.CUSTOMER && role !== ROLE.ADMIN) {
        throw createHttpError(403, "Chỉ tài khoản khách hàng mới có thể đặt tour");
    }

    const {
        departure_id,
        adults,
        children = 0,
        contact_name,
        contact_phone,
        contact_email,
        contact_dob,
        contact_gender,
        note,
        passengers,
    } = payload;

    const departure = await Booking.getDeparture(departure_id);
    if (!departure) {
        throw createHttpError(404, "Không tìm thấy lịch khởi hành");
    }

    if (
        departure.status === "closed" ||
        departure.status === "full" ||
        Number(departure.seats_available) <= 0
    ) {
        throw createHttpError(400, "Lịch khởi hành này hiện không nhận đặt chỗ");
    }

    // Chặn đặt tour đã đi qua ngày
    const depDate = new Date(departure.departure_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (depDate < today) {
        throw createHttpError(400, "Lịch khởi hành này đã qua ngày, không thể đặt tour");
    }

    const adultCount = Number(adults);
    const childCount = Number(children);
    const totalPax = adultCount + childCount;

    // Chỉ kiểm tra còn đủ chỗ — KHÔNG trừ ghế ở bước tạo đơn.
    // Ghế chỉ bị giữ khi khách bắt đầu thanh toán (holdSeats trong createPaymentSession).
    if (totalPax > departure.seats_available) {
        throw createHttpError(
            400,
            `Số lượng khách vượt quá chỗ trống còn lại (${departure.seats_available} chỗ)`,
        );
    }

    // A23: chống spam đơn chưa cọc (không giữ ghế, không tự hết hạn)
    const unpaidCount = await Booking.countActiveUnpaidByUser(userId);
    if (unpaidCount >= MAX_UNPAID_BOOKINGS) {
        throw createHttpError(
            400,
            `Bạn đang có ${unpaidCount} đơn chưa thanh toán (tối đa ${MAX_UNPAID_BOOKINGS}). Vui lòng thanh toán hoặc hủy bớt đơn cũ.`,
        );
    }

    const tour = await Tour.getById(departure.tour_id);
    if (!tour) {
        throw createHttpError(404, "Không tìm thấy tour");
    }

    // Giá tính server-side: (giá tour + chi phí di chuyển) theo từng loại
    const adultUnitPrice =
        Number(tour.price_default) + Number(departure.price_moving || 0);
    const childUnitPrice =
        Number(tour.price_child) + Number(departure.price_moving_child || 0);
    const total_price = adultCount * adultUnitPrice + childCount * childUnitPrice;

    // Snapshot cọc tại thời điểm đặt (không tính lại sau này)
    const deposit_amount = computeDepositAmount(total_price);
    const remaining_amount = Math.max(0, total_price - deposit_amount);
    const deposit_allowed = isDepositAllowed(departure.departure_date);

    const bookingId = await Booking.createWithPassengers({
        user_id: userId,
        departure_id,
        adults: adultCount,
        children: childCount,
        total_price,
        deposit_percent: DEPOSIT_PERCENT,
        deposit_amount,
        contact_name: contact_name.trim(),
        contact_phone: contact_phone.trim(),
        contact_email: contact_email.trim(),
        contact_dob: contact_dob || null,
        contact_gender: contact_gender || null,
        note,
        passengers,
    });

    // KHÔNG gửi email tại thời điểm tạo đơn và KHÔNG hẹn job tự hủy đơn chưa cọc.
    // Email xác nhận chỉ gửi sau khi thanh toán thành công (cọc / trả đủ / trả nốt).

    return {
        id: bookingId,
        tour_name: tour.name,
        departure_id,
        departure_date: departure.departure_date,
        adults: adultCount,
        children: childCount,
        total_price,
        deposit_percent: DEPOSIT_PERCENT,
        deposit_amount,
        remaining_amount,
        deposit_allowed,
        payment_status: "unpaid",
        status: "pending",
    };
};

export const getMyBookingsService = async (userId) => {
    const bookings = await Booking.getByUserId(userId);
    const results = [];
    for (const b of bookings) {
        results.push(await expireOrCancelIfDue(b));
    }
    return results;
};

export const getBookingDetailService = async (userId, role, bookingId) => {
    const booking = await Booking.getDetailForUser(bookingId);
    if (!booking) {
        throw createHttpError(404, "Không tìm thấy booking");
    }

    if (String(booking.user_id) !== String(userId) && !BOOKING_MANAGEMENT.includes(role)) {
        throw createHttpError(403, "Bạn không có quyền xem booking này");
    }

    // Kiểm tra & xử lý hết hạn (lazy-check)
    const currentBooking = await expireOrCancelIfDue(booking);

    const passengers = await Booking.getPassengersByBookingId(bookingId);
    return { ...currentBooking, passengers };
};

export const getAllBookingsService = async () => {
    return Booking.getAll();
};

export const getBookingRefundInfoService = async (userId, role, bookingId) => {
    const booking = await Booking.getDetailForUser(bookingId);
    if (!booking) {
        throw createHttpError(404, "Không tìm thấy booking");
    }
    if (booking.user_id !== userId && !BOOKING_MANAGEMENT.includes(role)) {
        throw createHttpError(403, "Bạn không có quyền xem thông tin booking này");
    }
    if (booking.payment_status !== "paid") {
        throw createHttpError(400, "Chỉ có thể xem thông tin hoàn tiền cho đơn đã thanh toán đầy đủ");
    }
    const info = calculateRefund(booking.departure_date, booking.paid_amount || booking.total_price);
    return {
        bookingId: booking.id,
        tourName: booking.tour_name,
        departureDate: booking.departure_date,
        paidAmount: booking.paid_amount || booking.total_price,
        ...info,
    };
};

export const cancelBookingService = async (userId, role, bookingId) => {
    const booking = await Booking.getDetailForUser(bookingId);
    if (!booking) {
        throw createHttpError(404, "Không tìm thấy booking");
    }
    if (booking.user_id !== userId && !BOOKING_MANAGEMENT.includes(role)) {
        throw createHttpError(403, "Bạn không có quyền hủy booking này");
    }
    if (booking.payment_status !== "paid") {
        throw createHttpError(400, "Chỉ có thể yêu cầu hủy đơn đã thanh toán đầy đủ");
    }
    if (booking.status === "cancel_requested" || booking.status === "cancelled") {
        throw createHttpError(400, "Booking này đã gửi yêu cầu hủy hoặc đã bị hủy");
    }
    const dep = new Date(String(booking.departure_date).slice(0, 10) + "T00:00:00");
    if (dep.getTime() <= Date.now()) {
        throw createHttpError(400, "Tour đã khởi hành hoặc đã kết thúc, không thể yêu cầu hủy");
    }
    const refundInfo = calculateRefund(booking.departure_date, booking.paid_amount || booking.total_price);
    await Booking.updateStatus(bookingId, "cancel_requested");
    return {
        success: true,
        message: "Đã gửi yêu cầu hủy booking thành công. Vui lòng chờ quản trị viên phê duyệt.",
        refundInfo,
    };
};

export const updateStatusService = async (bookingId, status) => {
    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) {
        throw createHttpError(400, "Trạng thái không hợp lệ. Chỉ chấp nhận: pending, confirmed, cancelled");
    }

    const booking = await Booking.getById(bookingId);
    if (!booking) {
        throw createHttpError(404, "Không tìm thấy booking");
    }

    // Không cho xác nhận đơn khi chưa thu được đồng nào (rule đã chốt)
    if (status === "confirmed" && booking.payment_status === "unpaid") {
        throw createHttpError(400, "Không thể xác nhận đơn chưa thanh toán");
    }

    if (status === "cancelled") {
        const didCancel = await Booking.cancelWithRelease(bookingId, "admin");
        if (!didCancel) {
            throw createHttpError(400, "Không thể hủy booking ở trạng thái hiện tại");
        }
        return;
    }

    const updated = await Booking.updateStatus(bookingId, status);
    if (!updated) {
        throw createHttpError(404, "Không tìm thấy booking");
    }
};

export const deleteBookingService = async (bookingId) => {
    // Đã phát sinh giao dịch thì không xóa — phải giữ lịch sử để đối soát (A15)
    if (await BookingPayment.existsByBooking(bookingId)) {
        throw createHttpError(
            400,
            "Booking đã có giao dịch thanh toán, không thể xóa. Hãy hủy đơn để giữ lịch sử đối soát.",
        );
    }

    const deleted = await Booking.delete(bookingId);
    if (!deleted) {
        throw createHttpError(404, "Không tìm thấy booking");
    }
};

// ================= VNPay =================

const PAYMENT_TYPE_LABEL = {
    deposit: "coc",
    balance: "phan con lai",
    full: "toan bo",
};

const getClientIp = (req) => {
    const forwarded = req.headers?.["x-forwarded-for"];
    const raw = forwarded ? String(forwarded).split(",")[0].trim() : req.socket?.remoteAddress || req.ip;
    return raw || "127.0.0.1";
};

// Dựng URL thanh toán VNPay (dùng chung cho thanh toán ngay & thanh toán từ email).
// vnp_Amount là số VND nguyên; SDK tự nhân 100 khi tạo URL và chia 100 khi verify.
const buildVnpayUrl = async ({ booking, amount, type, txnRef, expiresAt, ipAddr, vnpay }) => {
    const { VNP_RETURN_URL } = process.env;
    if (!VNP_RETURN_URL) {
        throw createHttpError(500, "Thiếu VNP_RETURN_URL trong cấu hình");
    }

    // Loại bỏ ký tự đặc biệt trong tên tour (VNPay dễ lỗi với ký tự lạ)
    const safeTourName = String(booking.tour_name || "").replace(/[^\w\s]/gi, "");
    const label = PAYMENT_TYPE_LABEL[type] || "toan bo";
    const orderInfo = `Thanh toan ${label} tour ${safeTourName} BOK${booking.id}`.slice(0, 250);

    const vnpayResponse = await vnpay.buildPaymentUrl({
        vnp_Amount: Math.round(Number(amount)),
        vnp_IpAddr: ipAddr,
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: VNP_RETURN_URL,
        vnp_Locale: VnpLocale.VN,
        vnp_CreateDate: dateFormat(new Date()),
        vnp_ExpireDate: dateFormat(expiresAt),
    });

    return typeof vnpayResponse === "string" ? vnpayResponse : vnpayResponse.url || vnpayResponse.paymentUrl;
};

// ============ Chọn loại thanh toán theo trạng thái đơn ============
// Không tin `type` từ client (A/#6): server luôn kiểm tra lại theo payment_status.
const VALID_PAYMENT_TYPES = ["deposit", "balance", "full"];

const resolvePaymentType = (booking, requestedType) => {
    if (requestedType && !VALID_PAYMENT_TYPES.includes(requestedType)) {
        throw createHttpError(400, "Loại thanh toán không hợp lệ (deposit, balance, full)");
    }

    if (booking.payment_status === "paid" || booking.payment_status === "refunded") {
        throw createHttpError(400, "Đơn này đã được thanh toán");
    }

    if (booking.payment_status === "deposit_paid") {
        if (requestedType && requestedType !== "balance") {
            throw createHttpError(400, "Đơn đã cọc, chỉ có thể thanh toán phần còn lại");
        }
        return "balance";
    }

    if (booking.payment_status === "unpaid") {
        const type = requestedType || "full";

        if (type === "balance") {
            throw createHttpError(400, "Đơn chưa cọc nên không có phần còn lại để thanh toán");
        }

        if (type === "deposit" && !isDepositAllowed(booking.departure_date)) {
            const days = getDaysUntilDeparture(booking.departure_date);
            throw createHttpError(
                400,
                `Chỉ còn ${days} ngày trước khởi hành (cần tối thiểu ${MIN_DAYS_FOR_DEPOSIT} ngày), vui lòng thanh toán toàn bộ.`,
            );
        }

        return type;
    }

    throw createHttpError(400, "Trạng thái thanh toán của đơn không hợp lệ");
};

const getAmountForType = (booking, type) => {
    const { total, paid, deposit, remaining } = getBookingAmounts(booking);
    if (type === "deposit") return deposit;
    if (type === "balance") return remaining;
    return Math.max(0, total - paid);
};

// Chỉ nhả ghế khi đơn CHƯA cọc và không còn phiên thanh toán nào hiệu lực.
// Đơn đã cọc / đã trả giữ ghế vĩnh viễn tới khi hủy.
const releaseSeatsIfUnused = async (bookingId) => {
    const booking = await Booking.getById(bookingId);
    if (!booking || booking.payment_status !== "unpaid") return false;
    if (await BookingPayment.hasActivePendingPayment(bookingId)) return false;
    return Booking.releaseHeldSeats(bookingId);
};

// ============ Tạo phiên thanh toán (dùng chung cho 2 luồng) ============
// 1. Giữ ghế (holdSeats) TRƯỚC khi tạo URL — không đủ chỗ thì 409, không thu tiền oan.
// 2. Thay thế phiên pending cùng loại bằng phiên mới (transaction, A24).
// 3. Dựng URL; lỗi thì đánh dấu failed + nhả ghế (nếu đơn chưa cọc).
const createPaymentSession = async ({ booking, type, req, vnpay }) => {
    const amount = getAmountForType(booking, type);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw createHttpError(400, "Số tiền thanh toán không hợp lệ");
    }

    const now = new Date();

    // Hạn phiên = min(now + 30 phút, hạn trả nốt của giai đoạn)
    let expiresAt = new Date(now.getTime() + PAYMENT_URL_TTL_MINUTES * 60 * 1000);
    if (type === "balance" && booking.balance_due_at) {
        const phaseDeadline = new Date(booking.balance_due_at);
        if (phaseDeadline.getTime() < expiresAt.getTime()) expiresAt = phaseDeadline;
    }
    if (expiresAt.getTime() <= now.getTime()) {
        throw createHttpError(400, "Đã quá hạn thanh toán phần còn lại của đơn");
    }

    // Giữ ghế trước khi cho khách sang cổng thanh toán
    const held = await Booking.holdSeats(booking.id, booking.departure_id, getPaxCount(booking));
    if (!held) {
        throw createHttpError(409, "Chuyến đã hết chỗ, vui lòng chọn chuyến khác");
    }

    const uniqueStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    const txnRef = `BOK${booking.id}_${type.toUpperCase()}_${Date.now()}_${uniqueStr}`;
    let sessionCreated = false;

    try {
        await BookingPayment.createReplacingPending({
            booking_id: booking.id,
            type,
            amount,
            txn_ref: txnRef,
            expires_at: expiresAt,
        });
        sessionCreated = true;

        const vnpayUrl = await buildVnpayUrl({
            booking,
            amount,
            type,
            txnRef,
            expiresAt,
            ipAddr: getClientIp(req),
            vnpay,
        });

        return { vnpayUrl, type, amount, bookingId: booking.id, expiresAt };
    } catch (error) {
        // Dọn dấu vết phiên lỗi để không giữ ghế/chặn đơn oan
        if (sessionCreated) {
            await BookingPayment.markFailed(txnRef).catch(() => {});
        }
        if (booking.payment_status === "unpaid") {
            await releaseSeatsIfUnused(booking.id).catch(() => {});
        }
        throw error;
    }
};

// Kiểm tra token ký riêng cho phép thanh toán 1 booking cụ thể (link trong email)
const verifyPaymentToken = (bookingId, token) => {
    if (!token) {
        throw createHttpError(401, "Thiếu token thanh toán");
    }
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        throw createHttpError(401, "Token thanh toán không hợp lệ hoặc đã hết hạn");
    }
    if (decoded.purpose !== "booking_payment" || String(decoded.bookingId) !== String(bookingId)) {
        throw createHttpError(403, "Token thanh toán không khớp đơn này");
    }
    return decoded;
};

// Token trong email phải sống đủ lâu để trả nốt (A20):
// max(7 ngày, hạn trả nốt + 1 ngày).
const signPaymentToken = (bookingId, balanceDueAt = null) => {
    const now = Date.now();
    const minExpiry = now + 7 * DAY_MS;
    const dueExpiry = balanceDueAt ? new Date(balanceDueAt).getTime() + DAY_MS : 0;
    const expiresIn = Math.max(60, Math.floor((Math.max(minExpiry, dueExpiry) - now) / 1000));

    return jwt.sign({ purpose: "booking_payment", bookingId: Number(bookingId) }, process.env.JWT_SECRET, {
        expiresIn,
    });
};

// Email xác nhận CHỈ gửi sau khi thanh toán thành công (deposit / full / balance).
// Fail-soft: lỗi mail không được làm hỏng giao dịch đã thu tiền.
const sendPaymentConfirmation = async ({ booking, type, amount, balanceDueAt }) => {
    try {
        const amounts = getBookingAmounts(booking);
        let payUrl = null;

        if (type === "deposit" && amounts.remaining > 0) {
            const token = signPaymentToken(booking.id, balanceDueAt);
            const frontendBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
            payUrl = `${frontendBaseUrl}/payment/${booking.id}?token=${encodeURIComponent(token)}`;
        }

        return await sendBookingConfirmedEmail({
            email: booking.contact_email,
            contactName: booking.contact_name,
            bookingId: booking.id,
            tourName: booking.tour_name,
            departureDate: booking.departure_date,
            type,
            amount,
            totalPrice: amounts.total,
            paidAmount: amounts.paid,
            remainingAmount: amounts.remaining,
            balanceDueAt,
            payUrl,
        });
    } catch (error) {
        console.warn(`[MAIL] Không gửi được email xác nhận đơn #${booking.id}: ${error.message}`);
        return { sent: false };
    }
};

// Tạo URL thanh toán cho booking đã tồn tại (đang đăng nhập)
export const createPaymentUrlService = async (req, bookingId, type, vnpay) => {
    if (!bookingId || isNaN(bookingId)) {
        throw createHttpError(400, "Thiếu booking_id");
    }

    let booking = await Booking.getByIdWithDeparture(bookingId);
    if (!booking) {
        throw createHttpError(404, "Không tìm thấy booking");
    }

    // Lazy-check hết hạn: đơn đã cọc quá hạn trả nốt vừa bị hủy → chặn thanh toán
    booking = await expireOrCancelIfDue(booking);
    if (booking.status === "cancelled") {
        throw createHttpError(400, "Đơn đã bị hủy, vui lòng đặt lại");
    }

    // Kiểm tra quyền sở hữu
    if (String(booking.user_id) !== String(req.user.id) && !BOOKING_MANAGEMENT.includes(req.user.role)) {
        throw createHttpError(403, "Bạn không có quyền thanh toán booking này");
    }

    const paymentType = resolvePaymentType(booking, type);
    return createPaymentSession({ booking, type: paymentType, req, vnpay });
};

// Thông tin tóm tắt đơn cho trang thanh toán public (từ link email)
export const getPaymentSummaryService = async (bookingId, token) => {
    if (!bookingId || isNaN(bookingId)) {
        throw createHttpError(400, "Thiếu booking_id");
    }
    verifyPaymentToken(bookingId, token);

    let booking = await Booking.getByIdWithDeparture(bookingId);
    if (!booking) {
        throw createHttpError(404, "Không tìm thấy booking");
    }

    // Lazy-check hết hạn: KHÔNG throw — trả data kèm status='cancelled' để trang
    // thanh toán hiển thị UI "đơn đã bị hủy" (2 endpoint TẠO thanh toán vẫn chặn 400)
    booking = await expireOrCancelIfDue(booking);
    const amounts = getBookingAmounts(booking);

    return {
        id: booking.id,
        tour_id: booking.tour_id,
        tour_name: booking.tour_name,
        departure_date: booking.departure_date,
        departure_location: booking.departure_location,
        adults: booking.adults,
        children: booking.children,
        total_price: amounts.total,
        // A33: thông tin cọc / đã trả / còn lại / hạn trả nốt cho UI
        deposit_percent: Number(booking.deposit_percent) || DEPOSIT_PERCENT,
        deposit_amount: amounts.deposit,
        paid_amount: amounts.paid,
        remaining_amount: amounts.remaining,
        balance_due_at: booking.balance_due_at,
        deposit_allowed:
            booking.status !== "cancelled" &&
            booking.payment_status === "unpaid" &&
            isDepositAllowed(booking.departure_date),
        contact_name: booking.contact_name,
        payment_status: booking.payment_status,
        status: booking.status,
        cancel_reason: booking.cancel_reason,
        cancelled_at: booking.cancelled_at,
    };
};

// Tạo URL thanh toán từ link email (không cần đăng nhập, dựa trên token ký riêng).
// Server tự suy loại thanh toán từ trạng thái đơn, không nhận `type` từ client.
export const payLaterService = async (bookingId, token, vnpay, req) => {
    if (!bookingId || isNaN(bookingId)) {
        throw createHttpError(400, "Thiếu booking_id");
    }
    verifyPaymentToken(bookingId, token);

    let booking = await Booking.getByIdWithDeparture(bookingId);
    if (!booking) {
        throw createHttpError(404, "Không tìm thấy booking");
    }

    // Lazy-check hết hạn → chặn
    booking = await expireOrCancelIfDue(booking);
    if (booking.status === "cancelled") {
        throw createHttpError(400, "Đơn đã bị hủy, vui lòng đặt lại");
    }

    // deposit_paid -> balance; unpaid -> full (email chỉ phát sau khi thanh toán,
    // nên luồng từ email chủ yếu là trả nốt).
    const paymentType = resolvePaymentType(booking, null);
    return createPaymentSession({ booking, type: paymentType, req, vnpay });
};

// ============ Xác nhận thanh toán (dùng chung Return URL + IPN) ============
// Transaction + conditional update: callback trùng chỉ áp dụng tiền 1 lần.
// Trả về object để controller IPN map RspCode (Bước 5).
export const confirmPaymentByTxnRef = async (txnRef, query = {}) => {
    if (!txnRef) {
        throw createPaymentError("order_not_found", "Không tìm thấy mã giao dịch");
    }

    const payment = await BookingPayment.findByTxnRef(txnRef);
    if (!payment) {
        throw createPaymentError("order_not_found", "Không tìm thấy giao dịch");
    }

    // A19: chống sửa giá — số tiền VNPay báo phải khớp row đã tạo
    const paidAmount = Number(payment.amount);
    const vnpAmount = Number(query.vnp_Amount);
    if (!Number.isFinite(vnpAmount) || Math.round(vnpAmount) !== Math.round(paidAmount)) {
        throw createPaymentError("invalid_amount", "Số tiền giao dịch không khớp");
    }

    const responseCode =
        query.vnp_ResponseCode === undefined || query.vnp_ResponseCode === null
            ? "00"
            : String(query.vnp_ResponseCode);
    const providerTxnNo = query.vnp_TransactionNo ? String(query.vnp_TransactionNo) : null;
    const providerResponse = JSON.stringify({
        vnp_ResponseCode: responseCode,
        vnp_TransactionNo: providerTxnNo,
        vnp_BankCode: query.vnp_BankCode || null,
        vnp_PayDate: query.vnp_PayDate || null,
    });

    // Giao dịch thất bại / bị hủy: đánh dấu failed, nhả ghế nếu không còn phiên khác
    if (responseCode !== "00") {
        await BookingPayment.markFailed(txnRef);
        await releaseSeatsIfUnused(payment.booking_id).catch(() => {});

        return {
            success: false,
            processed: false,
            alreadyProcessed: false,
            applied: false,
            needsReview: false,
            bookingId: payment.booking_id,
            type: payment.type,
            amount: paidAmount,
        };
    }

    // Đã xử lý rồi (IPN/Return gọi trùng) → không cộng tiền lần 2
    if (payment.status === "paid") {
        return {
            success: true,
            processed: true,
            alreadyProcessed: true,
            applied: false,
            needsReview: false,
            bookingId: payment.booking_id,
            type: payment.type,
            amount: paidAmount,
        };
    }

    const outcome = await BookingPayment.transaction(async (trx) => {
        // Khóa booking TRƯỚC (cùng thứ tự với cancelWithRelease) để tránh deadlock
        const booking = await Booking.findByIdForUpdate(payment.booking_id, trx);
        if (!booking) {
            throw createPaymentError("order_not_found", "Không tìm thấy booking");
        }

        const current = await BookingPayment.findByTxnRef(txnRef, trx);
        if (!current) {
            throw createPaymentError("order_not_found", "Không tìm thấy giao dịch");
        }

        // Request khác vừa xác nhận xong → idempotent
        if (current.status === "paid") {
            return { alreadyProcessed: true, applied: false, needsReview: false, booking };
        }

        let markedPaid = await BookingPayment.markPaidIfPending(
            txnRef,
            { provider_txn_no: providerTxnNo, provider_response: providerResponse },
            trx,
        );
        let needsReview = false;

        if (!markedPaid) {
            // Row đã cancelled/expired/failed nhưng tiền vẫn về → VẪN ghi nhận paid để đối soát (A9)
            await BookingPayment.markPaidRegardless(
                txnRef,
                { provider_txn_no: providerTxnNo, provider_response: providerResponse },
                trx,
            );
            needsReview = true;
        }

        // Đơn đã hủy / đã trả đủ → chỉ ghi nhận tiền, KHÔNG hồi sinh đơn
        if (booking.status === "cancelled" || ["paid", "refunded"].includes(booking.payment_status)) {
            await BookingPayment.cancelPendingByBooking(booking.id, { trx });
            return { alreadyProcessed: false, applied: false, needsReview: true, booking };
        }

        // Đảm bảo ghế vẫn đang giữ (phiên có thể đã hết hạn và bị sweep nhả)
        let seatsOk = Boolean(booking.seats_held);
        if (!seatsOk) {
            seatsOk = await Booking.holdSeats(
                booking.id,
                booking.departure_id,
                getPaxCount(booking),
                trx,
            );
        }

        // Tiền về nhưng hết ghế → vẫn ghi nhận paid, admin hoàn tiền (không xác nhận chỗ)
        if (!seatsOk) {
            console.warn(
                `[VNPay] Tiền đã về nhưng chuyến đã hết chỗ — giao dịch ${txnRef} cần đối soát/hoàn tiền`,
            );
            await BookingPayment.cancelPendingByBooking(booking.id, { trx });
            return { alreadyProcessed: false, applied: false, needsReview: true, booking };
        }

        let applied = false;
        let balanceDueAt = null;

        if (current.type === "deposit") {
            balanceDueAt = computeBalanceDueAt(booking.departure_date);
            applied = await Booking.markDepositPaidIfUnpaid(
                booking.id,
                current.amount,
                balanceDueAt,
                trx,
            );
        } else if (current.type === "balance") {
            applied = await Booking.markBalancePaidIfDepositPaid(booking.id, current.amount, trx);
        } else if (current.type === "full") {
            applied = await Booking.markFullPaidIfUnpaid(booking.id, current.amount, trx);
        }

        // Update 0 dòng = trùng/không còn áp dụng được → commit khoản paid để đối soát (A9)
        if (!applied) needsReview = true;

        // Chặn khách dùng tiếp các URL cũ còn treo của đơn
        await BookingPayment.cancelPendingByBooking(booking.id, { trx });

        const updatedBooking = applied ? await Booking.getById(booking.id, trx) : booking;
        return { alreadyProcessed: false, applied, needsReview, booking: updatedBooking, balanceDueAt };
    });

    if (outcome.needsReview) {
        console.warn(
            `[VNPay] Giao dịch ${txnRef} đã thu tiền nhưng không áp dụng trọn vẹn vào booking #${payment.booking_id} — cần đối soát`,
        );
    }

    // Sau khi commit: hẹn job hết hạn trả nốt + gửi email xác nhận (fail-soft)
    if (outcome.applied) {
        try {
            if (payment.type === "deposit" && outcome.balanceDueAt) {
                await scheduleBalanceExpireJob(payment.booking_id, outcome.balanceDueAt);
            }

            const fullBooking = await Booking.getByIdWithDeparture(payment.booking_id);
            if (fullBooking) {
                await sendPaymentConfirmation({
                    booking: fullBooking,
                    type: payment.type,
                    amount: paidAmount,
                    balanceDueAt: outcome.balanceDueAt,
                });
            }
        } catch (error) {
            console.warn(`[VNPay] Lỗi sau xác nhận thanh toán ${txnRef}: ${error.message}`);
        }
    }

    return {
        success: true,
        processed: true,
        alreadyProcessed: outcome.alreadyProcessed,
        applied: outcome.applied,
        needsReview: outcome.needsReview,
        bookingId: payment.booking_id,
        type: payment.type,
        amount: paidAmount,
    };
};
