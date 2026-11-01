// ============================================================
// Dữ liệu mẫu cho Dashboard Admin.
// Toàn bộ số liệu hiện được hard-code tại đây. Khi nối API thật,
// chỉ cần thay giá trị trong file này (giữ nguyên cấu trúc) là các
// component tự cập nhật — không phải sửa component.
// ============================================================

// Ảnh tour lấy từ bộ seed thật của dự án (Cloudinary).
const TOUR_IMAGES = {
    dalat: "https://res.cloudinary.com/dtsroyjxz/image/upload/v1774281041/travel-website/dalat.jpg",
    hoian: "https://res.cloudinary.com/dtsroyjxz/image/upload/v1774281149/travel-website/hoian.png",
    halong: "https://res.cloudinary.com/dtsroyjxz/image/upload/v1774280971/travel-website/halong.jpg",
    phuquoc: "https://res.cloudinary.com/dtsroyjxz/image/upload/v1774281352/travel-website/phuquoc.png",
    sapa: "https://res.cloudinary.com/dtsroyjxz/image/upload/v1774281088/travel-website/sapa.jpg",
    nhatrang: "https://res.cloudinary.com/dtsroyjxz/image/upload/v1774281066/travel-website/nhatrang.jpg",
};

const avatar = (n) => `https://i.pravatar.cc/80?img=${n}`;

// ---------- 3 thẻ KPI ----------
export const stats = [
    {
        id: "bookings",
        title: "Tổng đặt tour",
        value: "1.284",
        change: "+2,98%",
        up: true,
        icon: "CalendarCheck",
        note: "so với 30 ngày trước",
        spark: [18, 26, 22, 34, 30, 42, 48],
    },
    {
        id: "customers",
        title: "Khách hàng mới",
        value: "2.845",
        change: "-1,45%",
        up: false,
        icon: "UserPlus",
        note: "so với 30 ngày trước",
        spark: [42, 38, 40, 33, 36, 31, 29],
    },
    {
        id: "earnings",
        title: "Doanh thu",
        value: "1,29 tỷ đ",
        change: "+3,75%",
        up: true,
        icon: "CircleDollarSign",
        note: "so với 30 ngày trước",
        spark: [22, 30, 27, 38, 35, 46, 52],
    },
];

// ---------- Biểu đồ doanh thu 7 ngày (đơn vị: triệu đồng) ----------
export const revenueData = [
    { day: "CN", revenue: 12.4, bookings: 38 },
    { day: "T2", revenue: 9.8, bookings: 31 },
    { day: "T3", revenue: 7.6, bookings: 24 },
    { day: "T4", revenue: 16.2, bookings: 52 },
    { day: "T5", revenue: 11.5, bookings: 36 },
    { day: "T6", revenue: 14.8, bookings: 44 },
    { day: "T7", revenue: 15.6, bookings: 47 },
];

export const revenueMeta = {
    total: "87,9 triệu đ",
    growth: "+12,5%",
    period: "7 ngày gần nhất",
};

// ---------- Top điểm đến (donut) ----------
export const destinations = [
    { id: 1, name: "Đà Nẵng – Hội An", percent: 35, participants: 2458, color: "#0369a1" },
    { id: 2, name: "Phú Quốc", percent: 28, participants: 1964, color: "#0284c7" },
    { id: 3, name: "Đà Lạt", percent: 22, participants: 1543, color: "#38bdf8" },
    { id: 4, name: "Hạ Long", percent: 15, participants: 1052, color: "#bae6fd" },
];

// ---------- Tổng quan chuyến đi ----------
export const tripsSummary = {
    total: "1.200",
    items: [
        { key: "done", label: "Hoàn thành", value: 620, color: "success" },
        { key: "booked", label: "Đã đặt", value: 465, color: "primary" },
        { key: "canceled", label: "Đã hủy", value: 115, color: "danger" },
    ],
};

// ---------- Gói du lịch nổi bật ----------
export const travelPackages = [
    {
        id: 1,
        tag: "Khám phá miền Trung",
        city: "Đà Nẵng – Hội An",
        duration: "3 ngày 2 đêm",
        price: "3.000.000 đ",
        image: TOUR_IMAGES.hoian,
    },
    {
        id: 2,
        tag: "Nghỉ dưỡng biển đảo",
        city: "Phú Quốc",
        duration: "4 ngày 3 đêm",
        price: "5.200.000 đ",
        image: TOUR_IMAGES.phuquoc,
    },
    {
        id: 3,
        tag: "Chinh phục núi rừng",
        city: "Hà Nội – Sapa – Fansipan",
        duration: "3 ngày 2 đêm",
        price: "3.100.000 đ",
        image: TOUR_IMAGES.sapa,
    },
];

// ---------- Tin nhắn / yêu cầu khách hàng ----------
export const messages = [
    {
        id: 1,
        name: "Nguyễn Minh Anh",
        text: "Tôi muốn đổi ngày khởi hành sang tuần sau...",
        time: "11:00",
        unread: 1,
        avatar: avatar(5),
    },
    {
        id: 2,
        name: "Trần Quốc Bảo",
        text: "Cho tôi hỏi tour Phú Quốc còn chỗ không?",
        time: "14:30",
        unread: 3,
        avatar: avatar(12),
    },
    {
        id: 3,
        name: "Lê Thu Hà",
        text: "Cảm ơn anh/chị, chuyến đi rất tuyệt vời...",
        time: "09:45",
        unread: 5,
        avatar: avatar(9),
    },
    {
        id: 4,
        name: "Phạm Nhật Nam",
        text: "Tôi cần xuất hóa đơn cho booking BK-1024...",
        time: "10:15",
        unread: 2,
        avatar: avatar(15),
    },
    {
        id: 5,
        name: "Võ Thanh Trúc",
        text: "Có ưu đãi nào cho nhóm 10 người không?",
        time: "13:20",
        unread: 1,
        avatar: avatar(45),
    },
    {
        id: 6,
        name: "Đặng Hữu Phước",
        text: "Tôi muốn nâng cấp lên phòng view biển...",
        time: "10:00",
        unread: 1,
        avatar: avatar(33),
    },
    {
        id: 7,
        name: "Hoàng Mai Lan",
        text: "Công ty tôi quan tâm tour team building...",
        time: "12:30",
        unread: 2,
        avatar: avatar(20),
    },
];

// ---------- Booking gần đây ----------
export const recentBookings = [
    {
        id: "BK-1024",
        name: "Nguyễn Thu Hà",
        package: "Đà Nẵng – Hội An – Bà Nà Hills",
        duration: "3N2Đ",
        date: "15/11 - 17/11",
        price: "3.000.000 đ",
        status: "confirmed",
    },
    {
        id: "BK-1023",
        name: "Trần Quốc Bảo",
        package: "Phú Quốc",
        duration: "4N3Đ",
        date: "18/11 - 21/11",
        price: "5.200.000 đ",
        status: "pending",
    },
    {
        id: "BK-1022",
        name: "Lê Minh Châu",
        package: "Hà Nội – Sapa – Fansipan",
        duration: "3N2Đ",
        date: "20/11 - 22/11",
        price: "3.100.000 đ",
        status: "confirmed",
    },
    {
        id: "BK-1021",
        name: "Phạm Nhật Nam",
        package: "Nha Trang",
        duration: "4N3Đ",
        date: "22/11 - 25/11",
        price: "4.500.000 đ",
        status: "cancelled",
    },
    {
        id: "BK-1020",
        name: "Hoàng Mai Lan",
        package: "Đà Lạt",
        duration: "3N2Đ",
        date: "24/11 - 26/11",
        price: "3.200.000 đ",
        status: "confirmed",
    },
];

// ---------- Lịch tháng hiện tại ----------
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function buildCalendar(baseDate = new Date()) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const today = baseDate.getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = firstDay - 1; i >= 0; i -= 1) {
        cells.push({ day: daysInPrevMonth - i, muted: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push({ day });
    }
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remainder; day += 1) {
        cells.push({ day, muted: true });
    }

    return {
        title: `Tháng ${month + 1}, ${year}`,
        weekdays: WEEKDAYS,
        today,
        rangeStart: 12,
        rangeEnd: 19,
        // Ngày có chuyến khởi hành (chấm nhỏ dưới số ngày).
        departureDays: [12, 15, 18, 22, 26],
        cells,
    };
}

export const calendarData = buildCalendar();

// ---------- Chuyến sắp khởi hành ----------
export const upcomingTrips = [
    {
        id: 1,
        tag: "Khám phá miền Trung",
        city: "Đà Nẵng – Hội An",
        extra: "+9",
        dates: "12 - 14/11",
        image: TOUR_IMAGES.hoian,
        people: [3, 8, 20],
    },
    {
        id: 2,
        tag: "Chinh phục núi rừng",
        city: "Hà Nội – Sapa",
        extra: "+17",
        dates: "15 - 17/11",
        image: TOUR_IMAGES.sapa,
        people: [11, 25, 31],
        highlight: true,
    },
    {
        id: 3,
        tag: "Nghỉ dưỡng biển đảo",
        city: "Phú Quốc",
        extra: "+12",
        dates: "18 - 21/11",
        image: TOUR_IMAGES.phuquoc,
        people: [14, 22, 40],
    },
    {
        id: 4,
        tag: "Di sản miền Bắc",
        city: "Hạ Long",
        extra: "+22",
        dates: "22 - 23/11",
        image: TOUR_IMAGES.halong,
        people: [17, 28, 52],
    },
];

// ---------- Hoạt động gần đây ----------
export const activities = [
    {
        id: 1,
        icon: "RefreshCw",
        text: "Nguyễn Thu Hà vừa cập nhật thông tin liên hệ cho booking BK-1024.",
        time: "09:30",
    },
    {
        id: 2,
        icon: "CalendarCheck",
        text: "Trần Quốc Bảo đã đặt tour Phú Quốc 4N3Đ khởi hành ngày 18/11.",
        time: "10:00",
    },
    {
        id: 3,
        icon: "BadgeCheck",
        text: "Thanh toán 3.000.000 đ cho booking BK-1024 đã được xác nhận.",
        time: "11:15",
    },
    {
        id: 4,
        icon: "CircleX",
        text: "Phạm Nhật Nam đã hủy tour Nha Trang 4N3Đ.",
        time: "12:45",
    },
    {
        id: 5,
        icon: "Star",
        text: "Lê Minh Châu gửi đánh giá 5 sao cho tour Sapa – Fansipan.",
        time: "14:30",
    },
];

// ---------- Thông báo trên Header ----------
export const notifications = [
    {
        id: 1,
        title: "3 booking đang chờ xác nhận",
        text: "Ưu tiên xử lý trước 17:00 hôm nay.",
        time: "5 phút trước",
        icon: "CalendarCheck",
        to: "/admin/bookings",
        roles: ["admin", "booking-staff"],
    },
    {
        id: 2,
        title: "2 đề xuất tour mới cần duyệt",
        text: "Khách hàng vừa gửi yêu cầu thiết kế tour riêng.",
        time: "20 phút trước",
        icon: "Lightbulb",
        to: "/admin/tour-requests",
        roles: ["admin", "tour-staff"],
    },
    {
        id: 3,
        title: "Doanh thu tuần này tăng 12,5%",
        text: "Xem báo cáo chi tiết tại trang thống kê.",
        time: "1 giờ trước",
        icon: "ChartColumn",
        to: "/admin/statistics",
        roles: ["admin"],
    },
];
