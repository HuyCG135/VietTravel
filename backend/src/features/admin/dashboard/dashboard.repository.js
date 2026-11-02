import db from "../../../config/knex.js";

const toNumber = (value) =>
    value === null || value === undefined || value === "" ? 0 : Number(value);

// Data access thuần cho dashboard quản trị (Knex query builder).
// Mọi phép tổng hợp đều tính trong SQL; service chỉ format lại cho frontend.
class AdminDashboard {
    // ---------- KPI ----------
    static async getTotals() {
        const row = await db("bookings")
            .select(
                db.raw("COUNT(*) as total_bookings"),
                db.raw("COALESCE(SUM(paid_amount), 0) as earnings"),
            )
            .first();

        return {
            bookings: toNumber(row?.total_bookings),
            earnings: toNumber(row?.earnings),
        };
    }

    static async getPeriodTotals(from, to) {
        const row = await db("bookings")
            .where("created_at", ">=", from)
            .where("created_at", "<", to)
            .select(
                db.raw("COUNT(*) as total_bookings"),
                db.raw("COALESCE(SUM(paid_amount), 0) as earnings"),
            )
            .first();

        return {
            bookings: toNumber(row?.total_bookings),
            earnings: toNumber(row?.earnings),
        };
    }

    static async getCustomerTotal() {
        const row = await db("users").where("role", "customer").count({ total: "id" }).first();
        return toNumber(row?.total);
    }

    static async getPeriodCustomers(from, to) {
        const row = await db("users")
            .where("role", "customer")
            .where("created_at", ">=", from)
            .where("created_at", "<", to)
            .count({ total: "id" })
            .first();
        return toNumber(row?.total);
    }

    static async getMonthlyBookings(from) {
        return db("bookings")
            .where("created_at", ">=", from)
            .select(
                db.raw("DATE_FORMAT(created_at, '%Y-%m') as period"),
                db.raw("COUNT(*) as bookings"),
                db.raw("COALESCE(SUM(paid_amount), 0) as earnings"),
            )
            .groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
            .orderBy("period", "asc");
    }

    static async getMonthlyCustomers(from) {
        return db("users")
            .where("role", "customer")
            .where("created_at", ">=", from)
            .select(
                db.raw("DATE_FORMAT(created_at, '%Y-%m') as period"),
                db.raw("COUNT(*) as customers"),
            )
            .groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
            .orderBy("period", "asc");
    }

    static async getDailyBookings(from) {
        return db("bookings")
            .where("created_at", ">=", from)
            .select(
                db.raw("DATE_FORMAT(created_at, '%Y-%m-%d') as period"),
                db.raw("COUNT(*) as bookings"),
                db.raw("COALESCE(SUM(paid_amount), 0) as revenue"),
            )
            .groupByRaw("DATE_FORMAT(created_at, '%Y-%m-%d')")
            .orderBy("period", "asc");
    }

    // ---------- Điểm đến / trạng thái ----------
    static async getDestinations(from, limit = 4) {
        return db("bookings as b")
            .join("tour_departures as d", "b.departure_id", "d.id")
            .join("tours as t", "d.tour_id", "t.id")
            .where("b.created_at", ">=", from)
            .whereNot("b.status", "cancelled")
            .select("t.id", "t.name")
            .select(db.raw("COALESCE(SUM(b.adults + b.children), 0) as participants"))
            .groupBy("t.id", "t.name")
            .orderBy("participants", "desc")
            .orderBy("t.id", "asc")
            .limit(limit);
    }

    static async getStatusTotals() {
        return db("bookings")
            .select("status")
            .count({ total: "id" })
            .groupBy("status");
    }

    // ---------- Gói du lịch ----------
    static async getTopTours(from, limit = 3) {
        return db("bookings as b")
            .join("tour_departures as d", "b.departure_id", "d.id")
            .join("tours as t", "d.tour_id", "t.id")
            .where("b.created_at", ">=", from)
            .select(
                "t.id",
                "t.name",
                "t.duration",
                "t.region",
                "t.cover_image",
                "t.price_default",
            )
            .select(db.raw("COUNT(b.id) as bookings"))
            .groupBy("t.id", "t.name", "t.duration", "t.region", "t.cover_image", "t.price_default")
            .orderBy("bookings", "desc")
            .orderBy("t.id", "asc")
            .limit(limit);
    }

    // ---------- Đề xuất tour (thay cho "tin nhắn" mẫu) ----------
    static async getRecentRequests(limit = 7) {
        return db("tour_requests as tr")
            .leftJoin("users as u", "tr.user_id", "u.id")
            .select(
                "tr.id",
                "tr.title",
                "tr.destination",
                "tr.status",
                "tr.created_at",
                "u.fullname",
                "u.email",
            )
            .orderBy("tr.created_at", "desc")
            .limit(limit);
    }

    static async countRequestsByStatus(status) {
        const row = await db("tour_requests")
            .where("status", status)
            .count({ total: "id" })
            .first();
        return toNumber(row?.total);
    }

    // ---------- Booking ----------
    static async getRecentBookings(limit = 5) {
        return db("bookings as b")
            .join("tour_departures as d", "b.departure_id", "d.id")
            .join("tours as t", "d.tour_id", "t.id")
            .select(
                "b.id",
                "b.contact_name",
                "b.status",
                "b.payment_status",
                "b.total_price",
                "b.paid_amount",
                "b.created_at",
                "b.updated_at",
                "t.name as tour_name",
                "t.duration",
                "d.departure_date",
            )
            .orderBy("b.created_at", "desc")
            .orderBy("b.id", "desc")
            .limit(limit);
    }

    static async getRecentPaidBookings(limit = 3) {
        return db("bookings as b")
            .join("tour_departures as d", "b.departure_id", "d.id")
            .join("tours as t", "d.tour_id", "t.id")
            .whereIn("b.payment_status", ["paid", "deposit_paid"])
            .select(
                "b.id",
                "b.paid_amount",
                "b.payment_status",
                "b.updated_at",
                "t.name as tour_name",
            )
            .orderBy("b.updated_at", "desc")
            .limit(limit);
    }

    // ---------- Lịch khởi hành ----------
    static async getDeparturesBetween(from, to) {
        return db("tour_departures")
            .where("departure_date", ">=", from)
            .where("departure_date", "<", to)
            .select(
                db.raw("DATE_FORMAT(departure_date, '%Y-%m') as month_key"),
                db.raw("DAY(departure_date) as day"),
                "id",
            )
            .orderBy("departure_date", "asc")
            .orderBy("id", "asc");
    }

    static async getUpcomingDepartures(from, to, limit = 4) {
        return db("tour_departures as d")
            .join("tours as t", "d.tour_id", "t.id")
            .where("d.departure_date", ">=", from)
            .where("d.departure_date", "<=", to)
            .where("d.seats_available", ">", 0)
            .select(
                "d.id",
                "d.departure_date",
                "d.departure_location",
                "d.seats_available",
                "d.seats_total",
                "t.name",
                "t.duration",
                "t.cover_image",
            )
            .orderBy("d.departure_date", "asc")
            .orderBy("d.id", "asc")
            .limit(limit);
    }

    // ---------- Đánh giá ----------
    static async getRecentReviews(limit = 3) {
        return db("reviews as r")
            .join("users as u", "r.user_id", "u.id")
            .join("tours as t", "r.tour_id", "t.id")
            .select("r.id", "r.rating", "r.created_at", "u.fullname", "t.name as tour_name")
            .orderBy("r.created_at", "desc")
            .limit(limit);
    }
}

export default AdminDashboard;
