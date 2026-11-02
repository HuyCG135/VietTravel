import db from "../../../config/knex.js";
import AdminBooking from "./booking.repository.js";

const createHttpError = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

// Chỉ 3 trạng thái theo yêu cầu (không suy diễn "Completed").
const STATUS_LABEL = {
    pending: "Chờ xử lý",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
};

// Cấu hình range cho TripsOverview + TopPackages.
const RANGE_CONFIG = {
    "7d": { days: 7, granularity: "day", label: "7 ngày gần nhất" },
    "30d": { days: 30, granularity: "day", label: "30 ngày gần nhất" },
    "3m": { months: 3, granularity: "month", label: "3 tháng gần nhất" },
    "12m": { months: 12, granularity: "month", label: "12 tháng gần nhất" },
};

const pad2 = (value) => String(value).padStart(2, "0");

const startOfDay = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const startOfMonth = (value) => {
    const date = new Date(value);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
};

const addDays = (value, days) => {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
};

const addMonths = (value, months) => {
    const date = new Date(value);
    date.setMonth(date.getMonth() + months);
    return date;
};

const monthKey = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
const dateKey = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// % thay đổi có guard chia 0 (kỳ trước = 0 → 100% nếu kỳ này có dữ liệu, ngược lại 0%).
const percentChange = (current, previous) => {
    if (!previous) {
        return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
};

const trendOf = (change) => (change >= 0 ? "up" : "down");

// Chuẩn hóa range; giá trị lạ fallback về "12m".
export const resolveRange = (range) => {
    const key = RANGE_CONFIG[range] ? range : "12m";
    const config = RANGE_CONFIG[key];
    const now = new Date();

    if (config.granularity === "day") {
        return {
            key,
            ...config,
            from: startOfDay(addDays(now, -(config.days - 1))),
            to: now,
        };
    }

    return {
        key,
        ...config,
        from: startOfMonth(addMonths(now, -(config.months - 1))),
        to: now,
    };
};

// Danh sách booking + map sang shape frontend (BookingsTable) đang dùng.
export const listBookingsService = async (query = {}) => {
    const result = await AdminBooking.list({
        page: query.page,
        limit: query.limit,
        search: typeof query.search === "string" ? query.search.trim() : "",
        status: query.status,
        fromDate: query.fromDate,
        toDate: query.toDate,
    });

    return {
        rows: result.rows.map((row) => ({
            id: row.id,
            code: `BK-${String(row.id).padStart(5, "0")}`,
            name: row.fullname || row.contact_name || "",
            package: row.tour_name || "",
            duration: row.duration || "",
            date: row.departure_date_text || "",
            price: Number(row.total_price) || 0,
            status: row.status,
            status_label: STATUS_LABEL[row.status] || row.status,
            payment_status: row.payment_status,
            adults: Number(row.adults) || 0,
            children: Number(row.children) || 0,
            created_at: row.created_at,
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
    };
};

// 3 thẻ StatCards: tổng all-time + spark/change 12 tháng gần nhất theo created_at.
export const getStatsService = async () => {
    const now = new Date();
    const seriesStart = startOfMonth(addMonths(now, -11));
    const currentStart = startOfMonth(now);
    const previousStart = startOfMonth(addMonths(now, -1));
    const tomorrow = addDays(startOfDay(now), 1);

    const [totals, current, previous, monthlyRows] = await Promise.all([
        AdminBooking.getTotals(),
        AdminBooking.getPeriodTotals(currentStart, tomorrow),
        AdminBooking.getPeriodTotals(previousStart, currentStart),
        AdminBooking.getMonthlyStats(seriesStart),
    ]);

    // Zero-fill đủ 12 tháng để sparkline không bị hụt.
    const monthMap = new Map(monthlyRows.map((row) => [row.period, row]));
    const spark = { bookings: [], participants: [], earnings: [] };

    for (let i = 0; i < 12; i += 1) {
        const month = addMonths(seriesStart, i);
        const row = monthMap.get(monthKey(month));
        spark.bookings.push(Number(row?.bookings) || 0);
        spark.participants.push(Number(row?.participants) || 0);
        spark.earnings.push(Number(row?.earnings) || 0);
    }

    const bookingsChange = percentChange(current.totalBookings, previous.totalBookings);
    const participantsChange = percentChange(current.participants, previous.participants);
    const earningsChange = percentChange(current.earnings, previous.earnings);

    return {
        totalBookings: totals.totalBookings,
        totalBookingsChange: bookingsChange,
        totalBookingsTrend: trendOf(bookingsChange),
        participants: totals.participants,
        participantsChange,
        participantsTrend: trendOf(participantsChange),
        earnings: totals.earnings,
        earningsChange,
        earningsTrend: trendOf(earningsChange),
        spark,
    };
};

// TripsOverview: done = confirmed, canceled = cancelled, zero-fill theo range.
export const getTripsOverviewService = async (range) => {
    const resolved = resolveRange(range);
    const rows =
        resolved.granularity === "month"
            ? await AdminBooking.getTripsMonthly(resolved.from)
            : await AdminBooking.getTripsDaily(resolved.from);

    const rowMap = new Map(rows.map((row) => [row.period, row]));
    const data = [];

    if (resolved.granularity === "month") {
        for (let i = 0; i < resolved.months; i += 1) {
            const month = addMonths(resolved.from, i);
            const key = monthKey(month);
            const row = rowMap.get(key);
            data.push({
                period: key,
                month: `${pad2(month.getMonth() + 1)}/${month.getFullYear()}`,
                done: Number(row?.done) || 0,
                canceled: Number(row?.canceled) || 0,
            });
        }
        return data;
    }

    for (let i = 0; i < resolved.days; i += 1) {
        const day = addDays(resolved.from, i);
        const key = dateKey(day);
        const row = rowMap.get(key);
        data.push({
            period: key,
            month: `${pad2(day.getDate())}/${pad2(day.getMonth() + 1)}`,
            done: Number(row?.done) || 0,
            canceled: Number(row?.canceled) || 0,
        });
    }

    return data;
};

// TopPackages: top tour theo số lượt đặt trong 1 năm,
// percent tính trên tổng lượt đặt của range (tour nhiều booking nhất đứng đầu).
export const getTopPackagesService = async (range, limit) => {
    const resolved = resolveRange(range);
    const limitNum = Math.min(20, Math.max(1, Number(limit) || 5));

    const [rows, totalBookings] = await Promise.all([
        AdminBooking.getTopPackages(resolved.from, limitNum),
        AdminBooking.getBookingsTotal(resolved.from),
    ]);

    return {
        period: resolved.label,
        totalBookings,
        items: rows.map((row) => {
            const bookings = Number(row.bookings) || 0;
            return {
                id: row.id,
                name: row.name,
                bookings,
                percent:
                    totalBookings > 0
                        ? Math.round((bookings / totalBookings) * 100)
                        : 0,
            };
        }),
    };
};

// Lịch sử hoạt động: DB chưa có bảng audit nên suy ra từ created_at/updated_at
// + status/payment_status. Thời điểm thanh toán/hủy lấy theo updated_at.
const HISTORY_PRIORITY = { cancelled: 0, refunded: 0, paid: 1, confirmed: 2, created: 3 };

const buildHistory = (booking) => {
    const createdTime = booking.created_at;
    const updatedTime = booking.updated_at || createdTime;
    const events = [
        {
            id: "created",
            type: "created",
            tone: "primary",
            title: "Khách hàng khởi tạo đặt tour",
            time: createdTime,
        },
    ];

    if (booking.status === "confirmed") {
        events.push({
            id: "confirmed",
            type: "confirmed",
            tone: "success",
            title: "Booking đã được xác nhận",
            time: updatedTime,
        });
    }

    if (booking.payment_status === "paid") {
        events.push({
            id: "paid",
            type: "paid",
            tone: "success",
            title: "Thanh toán thành công qua VNPay",
            time: updatedTime,
        });
    }

    if (booking.payment_status === "refunded") {
        events.push({
            id: "refunded",
            type: "refunded",
            tone: "info",
            title: "Đã hoàn tiền cho khách hàng",
            time: updatedTime,
        });
    }

    if (booking.status === "cancelled") {
        events.push({
            id: "cancelled",
            type: "cancelled",
            tone: "danger",
            title: "Booking đã bị hủy",
            time: updatedTime,
        });
    }

    return events.sort((a, b) => {
        const timeA = new Date(a.time).getTime() || 0;
        const timeB = new Date(b.time).getTime() || 0;
        if (timeA !== timeB) return timeB - timeA;
        return (HISTORY_PRIORITY[a.type] ?? 99) - (HISTORY_PRIORITY[b.type] ?? 99);
    });
};

// Chi tiết booking cho admin (kèm passengers + thông tin tour/lịch khởi hành).
export const getBookingDetailService = async (id) => {
    const booking = await AdminBooking.findDetailById(id);
    if (!booking) {
        throw createHttpError(404, "Không tìm thấy booking");
    }

    const passengers = await AdminBooking.getPassengers(id);

    return {
        ...booking,
        status_label: STATUS_LABEL[booking.status] || booking.status,
        passengers,
        history: buildHistory(booking),
    };
};

// Đổi trạng thái: hoàn ghế khi hủy, trừ ghế khi mở lại — trong 1 transaction.
export const updateBookingStatusService = async (id, status) => {
    if (!STATUS_LABEL[status]) {
        throw createHttpError(
            400,
            "Trạng thái không hợp lệ. Chỉ chấp nhận: pending, confirmed, cancelled",
        );
    }

    return db.transaction(async (trx) => {
        const booking = await AdminBooking.findRawById(id, trx, true);
        if (!booking) {
            throw createHttpError(404, "Không tìm thấy booking");
        }

        if (booking.status !== status) {
            const pax = Number(booking.adults) + Number(booking.children);

            // Hủy booking -> hoàn ghế.
            if (booking.status !== "cancelled" && status === "cancelled") {
                await AdminBooking.adjustSeats(booking.departure_id, pax, trx);
            }

            // Mở lại booking đã hủy -> cần đủ chỗ rồi trừ ghế.
            if (booking.status === "cancelled" && status !== "cancelled") {
                const available = Number(booking.seats_available);
                if (available < pax) {
                    throw createHttpError(
                        400,
                        `Không đủ chỗ trống để mở lại booking (cần ${pax} chỗ, còn ${available} chỗ)`,
                    );
                }
                await AdminBooking.adjustSeats(booking.departure_id, -pax, trx);
            }

            await AdminBooking.updateStatus(id, status, trx);
        }

        return {
            id: Number(id),
            status,
            status_label: STATUS_LABEL[status],
        };
    });
};

// Ghi nhận hoàn tiền: set payment_status=refunded + refunded_at,
// lưu các trường bên phụ, đồng tác tài khoản đã duyệt.
// (không tự đổi ghế tại đây — caller quyết định đã trừ ghế hay chưa).
export const refundBookingService = async (id, payload) => {
    const { refundAmount, refundMethod, providerRef, note } = payload || {};
    const booking = await AdminBooking.findDetailById(id);
    if (!booking) {
        throw new Error("Không tìm thấy booking");
    }

    const now = new Date();
    const updated = await AdminBooking.refund(
        id,
        refundAmount || 0,
        refundMethod || "chuyen_khoan",
        providerRef || null,
        note || null,
    );

    // Cập nhật cache / log đơn giản ở đây
    return {
        id: booking.id,
        refundAmount: booking.refund_amount || refundAmount || 0,
        refundMethod: booking.refund_method || refundMethod || "chuyen_khoan",
        providerRef: booking.refund_provider_ref || providerRef || null,
        refundedAt: booking.refunded_at || now,
        note: booking.refund_note || note || null,
        approvedBy: payload?.approvedBy || null,
        status: booking.payment_status,
        updatedAt: updated ? now : null,
    };
};
