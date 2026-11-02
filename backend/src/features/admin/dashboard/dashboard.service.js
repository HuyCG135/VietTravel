import AdminDashboard from "./dashboard.repository.js";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DESTINATION_COLORS = ["#0369a1", "#0284c7", "#38bdf8", "#bae6fd"];

const numberFormatter = new Intl.NumberFormat("vi-VN");

const toNumber = (value) =>
    value === null || value === undefined || value === "" ? 0 : Number(value);

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

const formatInt = (value) => numberFormatter.format(Math.round(toNumber(value)));

const formatDecimal = (value, digits = 1) =>
    toNumber(value).toLocaleString("vi-VN", { maximumFractionDigits: digits });

// 1.290.000 → "1,29 tỷ đ"; 87.900.000 → "87,9 triệu đ".
const formatMoney = (value) => {
    const amount = toNumber(value);
    if (amount >= 1_000_000_000) return `${formatDecimal(amount / 1_000_000_000, 2)} tỷ đ`;
    if (amount >= 1_000_000) return `${formatDecimal(amount / 1_000_000, 1)} triệu đ`;
    return `${formatInt(amount)} đ`;
};

const percentChange = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
};

const formatPercent = (change, digits = 1) => {
    const sign = change > 0 ? "+" : change < 0 ? "-" : "";
    return `${sign}${Math.abs(change).toFixed(digits).replace(".", ",")}%`;
};

// Giờ trong ngày → "HH:mm"; khác ngày → "dd/MM".
const formatEventTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const sameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    return sameDay ? `${pad2(date.getHours())}:${pad2(date.getMinutes())}` : `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
};

const formatDayMonth = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
};

// Độ dài tour dạng "3 ngày 2 đêm" → 3 (mặc định 1 nếu không đọc được).
const durationInDays = (duration) => {
    const matched = String(duration || "").match(/(\d+)\s*ngày/i);
    return matched ? Math.max(1, Number(matched[1])) : 1;
};

const buildMonthlySeries = (rows, months, field) => {
    const map = new Map(rows.map((row) => [row.period, toNumber(row[field])]));
    return months.map((month) => map.get(month) ?? 0);
};

const now = () => new Date();

const lastMonthKeys = (reference, count) => {
    const base = startOfMonth(reference);
    return Array.from({ length: count }, (_, index) =>
        monthKey(addMonths(base, index - (count - 1))),
    );
};

// ---------- 3 thẻ KPI ----------
const buildStats = async (reference) => {
    const last30 = startOfDay(addDays(reference, -29));
    const previous30 = startOfDay(addDays(reference, -59));

    const [
        totals,
        current,
        previous,
        customerTotal,
        customerCurrent,
        customerPrevious,
        monthlyBookings,
        monthlyCustomers,
    ] = await Promise.all([
        AdminDashboard.getTotals(),
        AdminDashboard.getPeriodTotals(last30, reference),
        AdminDashboard.getPeriodTotals(previous30, last30),
        AdminDashboard.getCustomerTotal(),
        AdminDashboard.getPeriodCustomers(last30, reference),
        AdminDashboard.getPeriodCustomers(previous30, last30),
        AdminDashboard.getMonthlyBookings(addMonths(startOfMonth(reference), -6)),
        AdminDashboard.getMonthlyCustomers(addMonths(startOfMonth(reference), -6)),
    ]);

    const months = lastMonthKeys(reference, 7);
    const bookingSpark = buildMonthlySeries(monthlyBookings, months, "bookings");
    const earningsSpark = buildMonthlySeries(monthlyBookings, months, "earnings");
    const customerSpark = buildMonthlySeries(monthlyCustomers, months, "customers");

    const bookingChange = percentChange(current.bookings, previous.bookings);
    const customerChange = percentChange(customerCurrent, customerPrevious);
    const earningsChange = percentChange(current.earnings, previous.earnings);

    return {
        stats: [
            {
                id: "bookings",
                title: "Tổng đặt tour",
                value: formatInt(totals.bookings),
                change: formatPercent(bookingChange, 2),
                up: bookingChange >= 0,
                icon: "CalendarCheck",
                note: "so với 30 ngày trước",
                spark: bookingSpark,
            },
            {
                id: "customers",
                title: "Tổng khách hàng",
                value: formatInt(customerTotal),
                change: formatPercent(customerChange, 2),
                up: customerChange >= 0,
                icon: "UserPlus",
                note: "so với 30 ngày trước",
                spark: customerSpark,
            },
            {
                id: "earnings",
                title: "Doanh thu",
                value: formatMoney(totals.earnings),
                change: formatPercent(earningsChange, 2),
                up: earningsChange >= 0,
                icon: "CircleDollarSign",
                note: "so với 30 ngày trước",
                spark: earningsSpark,
            },
        ],
        change: { bookingChange, customerChange, earningsChange },
    };
};

// ---------- Biểu đồ doanh thu 7 ngày ----------
const buildRevenue = async (reference) => {
    const from = startOfDay(addDays(reference, -6));
    const previousFrom = startOfDay(addDays(reference, -13));
    const previousTo = startOfDay(addDays(reference, -6));

    const [rows, previous] = await Promise.all([
        AdminDashboard.getDailyBookings(from),
        AdminDashboard.getPeriodTotals(previousFrom, previousTo),
    ]);

    const map = new Map(rows.map((row) => [row.period, row]));

    const data = Array.from({ length: 7 }, (_, index) => {
        const date = addDays(from, index);
        const row = map.get(dateKey(date));
        return {
            day: WEEKDAY_LABELS[date.getDay()],
            revenue: Math.round(toNumber(row?.revenue) / 100_000) / 10,
            bookings: toNumber(row?.bookings),
        };
    });

    const totalRevenue = rows.reduce((sum, row) => sum + toNumber(row.revenue), 0);
    const growth = percentChange(totalRevenue, previous.earnings);

    return {
        data,
        meta: {
            total: formatMoney(totalRevenue),
            growth: formatPercent(growth, 1),
            trend: growth >= 0 ? "up" : "down",
            period: "7 ngày gần nhất",
        },
    };
};

// ---------- Top điểm đến ----------
const buildDestinations = async (reference) => {
    const rows = await AdminDashboard.getDestinations(addMonths(startOfMonth(reference), -11));
    const total = rows.reduce((sum, row) => sum + toNumber(row.participants), 0);

    return rows.map((row, index) => {
        const participants = toNumber(row.participants);
        return {
            id: row.id,
            name: row.name,
            participants,
            percent: total > 0 ? Math.round((participants / total) * 100) : 0,
            color: DESTINATION_COLORS[index % DESTINATION_COLORS.length],
        };
    });
};

// ---------- Tổng quan trạng thái booking ----------
const buildTripsSummary = async () => {
    const rows = await AdminDashboard.getStatusTotals();
    const counts = new Map(rows.map((row) => [row.status, toNumber(row.total)]));
    const total = rows.reduce((sum, row) => sum + toNumber(row.total), 0);

    return {
        total: formatInt(total),
        items: [
            { key: "confirmed", label: "Đã xác nhận", value: counts.get("confirmed") || 0, color: "success" },
            { key: "pending", label: "Chờ xử lý", value: counts.get("pending") || 0, color: "primary" },
            { key: "cancelled", label: "Đã hủy", value: counts.get("cancelled") || 0, color: "danger" },
        ],
    };
};

// ---------- Gói du lịch nổi bật ----------
const buildTravelPackages = async (reference) => {
    const monthStart = startOfMonth(reference);
    let rows = await AdminDashboard.getTopTours(monthStart, 3);

    // Đầu tháng chưa có booking → lấy top 3 của 12 tháng gần nhất để thẻ không trống.
    if (rows.length === 0) {
        rows = await AdminDashboard.getTopTours(addMonths(monthStart, -11), 3);
    }

    return rows.map((row) => ({
        id: row.id,
        tag: row.region || "Gói du lịch",
        city: row.name,
        duration: row.duration || "",
        price: formatMoney(row.price_default),
        image: row.cover_image || "",
    }));
};

// ---------- Đề xuất tour của khách (thẻ "Tin nhắn") ----------
const buildMessages = async () => {
    const rows = await AdminDashboard.getRecentRequests(7);

    return rows.map((row) => ({
        id: row.id,
        name: row.fullname || row.email || "Khách hàng",
        text: `${row.title} · ${row.destination}`,
        time: formatEventTime(row.created_at),
        unread: row.status === "pending" ? 1 : 0,
        avatar: null,
    }));
};

// ---------- Booking gần đây ----------
const buildRecentBookings = async () => {
    const rows = await AdminDashboard.getRecentBookings(5);

    return rows.map((row) => ({
        id: `BK-${String(row.id).padStart(5, "0")}`,
        name: row.contact_name || "",
        package: row.tour_name || "",
        duration: row.duration || "",
        date: formatDayMonth(row.departure_date),
        price: formatMoney(row.total_price),
        status: row.status,
    }));
};

// ---------- Lịch khởi hành theo tháng ----------
const buildCalendar = async (reference) => {
    const from = startOfMonth(addMonths(reference, -1));
    const to = startOfMonth(addMonths(reference, 3));

    const rows = await AdminDashboard.getDeparturesBetween(from, to);
    const departuresByMonth = {};

    rows.forEach((row) => {
        const key = row.month_key;
        if (!departuresByMonth[key]) departuresByMonth[key] = [];
        const day = toNumber(row.day);
        if (!departuresByMonth[key].includes(day)) departuresByMonth[key].push(day);
    });

    return {
        weekdays: WEEKDAY_LABELS,
        today: reference.getDate(),
        currentMonth: monthKey(reference),
        departuresByMonth,
    };
};

// ---------- Chuyến sắp khởi hành ----------
const buildUpcomingTrips = async (reference) => {
    const from = startOfDay(reference);
    const to = addDays(from, 30);

    const rows = await AdminDashboard.getUpcomingDepartures(from, to, 4);

    return rows.map((row) => {
        const start = new Date(row.departure_date);
        const end = addDays(start, durationInDays(row.duration) - 1);
        const seats = toNumber(row.seats_available);

        return {
            id: row.id,
            tag: row.departure_location || "Khởi hành",
            city: row.name || "",
            dates: `${formatDayMonth(start)} - ${formatDayMonth(end)}`,
            image: row.cover_image || "",
            seats,
            highlight: seats <= 5,
        };
    });
};

// ---------- Hoạt động gần đây ----------
const buildActivities = async () => {
    const [bookings, paidBookings, reviews] = await Promise.all([
        AdminDashboard.getRecentBookings(4),
        AdminDashboard.getRecentPaidBookings(3),
        AdminDashboard.getRecentReviews(2),
    ]);

    const events = [];

    bookings.forEach((row) => {
        const cancelled = row.status === "cancelled";
        events.push({
            icon: cancelled ? "CircleX" : "CalendarCheck",
            at: row.created_at,
            text: cancelled
                ? `${row.contact_name} đã hủy tour ${row.tour_name}.`
                : `${row.contact_name} đã đặt tour ${row.tour_name} khởi hành ${formatDayMonth(row.departure_date)}.`,
        });
    });

    paidBookings.forEach((row) => {
        events.push({
            icon: "BadgeCheck",
            at: row.updated_at,
            text: `Thanh toán ${formatMoney(row.paid_amount)} cho booking BK-${String(row.id).padStart(5, "0")} đã được ghi nhận.`,
        });
    });

    reviews.forEach((row) => {
        events.push({
            icon: "Star",
            at: row.created_at,
            text: `${row.fullname} gửi đánh giá ${row.rating} sao cho ${row.tour_name}.`,
        });
    });

    return events
        .filter((event) => event.at)
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 5)
        .map((event, index) => ({
            id: index + 1,
            icon: event.icon,
            text: event.text,
            time: formatEventTime(event.at),
        }));
};

// ---------- Thông báo header + badge menu ----------
export const getDashboardShellService = async () => {
    const reference = now();

    const [statusRows, pendingRequests, last7, previous7] = await Promise.all([
        AdminDashboard.getStatusTotals(),
        AdminDashboard.countRequestsByStatus("pending"),
        AdminDashboard.getPeriodTotals(startOfDay(addDays(reference, -6)), reference),
        AdminDashboard.getPeriodTotals(startOfDay(addDays(reference, -13)), startOfDay(addDays(reference, -6))),
    ]);

    const statusMap = new Map(statusRows.map((row) => [row.status, toNumber(row.total)]));
    const pendingBookings = statusMap.get("pending") || 0;
    const growth = percentChange(last7.earnings, previous7.earnings);

    const notifications = [
        {
            id: "pending-bookings",
            title: `${pendingBookings} booking đang chờ xác nhận`,
            text: pendingBookings > 0 ? "Ưu tiên xử lý sớm để giữ chỗ cho khách." : "Không còn booking nào chờ xử lý.",
            time: "Vừa cập nhật",
            icon: "CalendarCheck",
            to: "/admin/bookings",
            roles: ["admin", "booking-staff"],
        },
        {
            id: "pending-requests",
            title: `${pendingRequests} đề xuất tour cần duyệt`,
            text: pendingRequests > 0 ? "Khách hàng vừa gửi yêu cầu thiết kế tour riêng." : "Không có đề xuất nào đang chờ.",
            time: "Vừa cập nhật",
            icon: "Lightbulb",
            to: "/admin/tour-requests",
            roles: ["admin", "tour-staff"],
        },
        {
            id: "revenue-growth",
            title: `Doanh thu 7 ngày ${growth >= 0 ? "tăng" : "giảm"} ${Math.abs(growth).toFixed(1).replace(".", ",")}%`,
            text: "Xem báo cáo chi tiết tại trang Tổng quan.",
            time: "Vừa cập nhật",
            icon: "ChartColumn",
            to: "/admin",
            roles: ["admin"],
        },
    ];

    return {
        notifications,
        badges: {
            "/admin/bookings": pendingBookings,
            "/admin/tour-requests": pendingRequests,
        },
    };
};

// ---------- Toàn bộ dữ liệu trang Tổng quan ----------
export const getDashboardService = async () => {
    const reference = now();

    const [statsResult, revenue, destinations, tripsSummary, travelPackages, messages, recentBookings, calendar, upcomingTrips, activities, shell] =
        await Promise.all([
            buildStats(reference),
            buildRevenue(reference),
            buildDestinations(reference),
            buildTripsSummary(),
            buildTravelPackages(reference),
            buildMessages(),
            buildRecentBookings(),
            buildCalendar(reference),
            buildUpcomingTrips(reference),
            buildActivities(),
            getDashboardShellService(),
        ]);

    return {
        generatedAt: reference.toISOString(),
        stats: statsResult.stats,
        revenue,
        destinations,
        tripsSummary,
        travelPackages,
        messages,
        recentBookings,
        calendar,
        upcomingTrips,
        activities,
        notifications: shell.notifications,
        badges: shell.badges,
    };
};
