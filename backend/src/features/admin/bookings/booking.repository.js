import db from "../../../config/knex.js";

const toNumber = (value) =>
    value === null || value === undefined || value === "" ? 0 : Number(value);

// Data access thuần cho admin booking (Knex query builder).
// Mọi phép tính tiền/tổng đều convert sang Number vì mysql2 trả DECIMAL dạng string.
class AdminBooking {
    // Query danh sách: join user + lịch khởi hành + tour, áp filter search/status/ngày.
    static buildListQuery({ search, status, fromDate, toDate } = {}) {
        const query = db("bookings as b")
            .leftJoin("users as u", "b.user_id", "u.id")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .leftJoin("tours as t", "d.tour_id", "t.id");

        if (status) {
            query.where("b.status", status);
        }

        // Lọc theo ngày khởi hành (cột Date đang hiển thị trên bảng).
        if (fromDate) {
            query.where("d.departure_date", ">=", fromDate);
        }

        if (toDate) {
            query.where("d.departure_date", "<=", toDate);
        }

        const keyword = typeof search === "string" ? search.trim() : "";
        if (keyword) {
            const like = `%${keyword}%`;

            query.where((builder) => {
                builder
                    .where("b.contact_name", "like", like)
                    .orWhere("u.fullname", "like", like)
                    .orWhere("t.name", "like", like);

                // Cho phép tìm theo mã booking: "5", "BK-00005", "bk5"...
                const matched = keyword.match(/^(?:bk-?)?0*(\d+)$/i);
                if (matched) {
                    builder.orWhere("b.id", Number(matched[1]));
                }
            });
        }

        return query;
    }

    // Danh sách booking có phân trang, mới nhất trước.
    static async list({ page, limit, search, status, fromDate, toDate }) {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
        const filters = { search, status, fromDate, toDate };

        const countRows = await this.buildListQuery(filters).count({ total: "b.id" });
        const total = toNumber(countRows?.[0]?.total);

        const rows = await this.buildListQuery(filters)
            .select(
                "b.id",
                "b.status",
                "b.payment_status",
                "b.deposit_amount",
                "b.paid_amount",
                "b.balance_due_at",
                "b.adults",
                "b.children",
                "b.total_price",
                "b.contact_name",
                "b.contact_email",
                "b.contact_phone",
                "b.created_at",
                "u.fullname",
                "t.name as tour_name",
                "t.duration",
                "d.departure_date",
                // Format sẵn theo giờ DB để tránh lệch ngày do timezone ở client.
                db.raw("DATE_FORMAT(d.departure_date, '%d/%m/%Y') as departure_date_text"),
            )
            .orderBy("b.created_at", "desc")
            .orderBy("b.id", "desc")
            .limit(limitNum)
            .offset((pageNum - 1) * limitNum);

        return { rows, total, page: pageNum, limit: limitNum };
    }

    static async findDetailById(id) {
        return db("bookings as b")
            .leftJoin("users as u", "b.user_id", "u.id")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .leftJoin("tours as t", "d.tour_id", "t.id")
            .select(
                "b.*",
                "u.fullname as customer_name",
                "u.email as user_email",
                "u.phone as user_phone",
                "t.name as tour_name",
                "t.duration",
                "t.region",
                "t.cover_image",
                "t.price_default",
                "t.price_child",
                "d.departure_location",
                "d.departure_date",
                "d.price_moving",
                "d.price_moving_child",
                "d.seats_total",
                "d.seats_available",
                db.raw("DATE_FORMAT(d.departure_date, '%d/%m/%Y') as departure_date_text"),
            )
            .where("b.id", id)
            .first();
    }

    // Booking gốc + thông tin ghế, dùng cho cập nhật trạng thái.
    static async findRawById(id, trx = db, lock = false) {
        const query = trx("bookings as b")
            .leftJoin("tour_departures as d", "b.departure_id", "d.id")
            .select(
                "b.id",
                "b.status",
                "b.departure_id",
                "b.adults",
                "b.children",
                "d.seats_available",
                "d.seats_total",
            )
            .where("b.id", id);

        if (lock) {
            query.forUpdate();
        }

        return query.first();
    }

    static async getPassengers(bookingId, trx = db) {
        return trx("passengers")
            .select(
                "id",
                "fullname",
                "gender",
                "dob",
                "passenger_type",
                trx.raw("DATE_FORMAT(dob, '%d/%m/%Y') as dob_text"),
            )
            .where("booking_id", bookingId)
            .orderBy("id", "asc");
    }

    static async updateStatus(id, status, trx = db) {
        return trx("bookings")
            .where("id", id)
            .update({ status, updated_at: trx.fn.now() });
    }

    // delta > 0: hoàn ghế (không vượt seats_total); delta < 0: trừ ghế (không âm).
    static async adjustSeats(departureId, delta, trx = db) {
        const expression =
            delta > 0
                ? trx.raw("LEAST(seats_total, seats_available + ?)", [delta])
                : trx.raw("GREATEST(0, seats_available + ?)", [delta]);

        return trx("tour_departures")
            .where("id", departureId)
            .update({ seats_available: expression });
    }

    // Tổng all-time cho 3 thẻ StatCards.
    static async getTotals() {
        const row = await db("bookings")
            .select(
                db.raw("COUNT(*) as total_bookings"),
                db.raw("COALESCE(SUM(adults + children), 0) as participants"),
                db.raw(
                    "COALESCE(SUM(paid_amount), 0) as earnings",
                ),
            )
            .first();

        return {
            totalBookings: toNumber(row?.total_bookings),
            participants: toNumber(row?.participants),
            earnings: toNumber(row?.earnings),
        };
    }

    // Tổng trong khoảng [from, to) — dùng tính % thay đổi so với kỳ trước.
    static async getPeriodTotals(from, to) {
        const row = await db("bookings")
            .where("created_at", ">=", from)
            .where("created_at", "<", to)
            .select(
                db.raw("COUNT(*) as total_bookings"),
                db.raw("COALESCE(SUM(adults + children), 0) as participants"),
                db.raw(
                    "COALESCE(SUM(paid_amount), 0) as earnings",
                ),
            )
            .first();

        return {
            totalBookings: toNumber(row?.total_bookings),
            participants: toNumber(row?.participants),
            earnings: toNumber(row?.earnings),
        };
    }

    // Thống kê theo tháng (created_at) — chỉ trả tháng có dữ liệu.
    static async getMonthlyStats(from) {
        return db("bookings")
            .where("created_at", ">=", from)
            .select(
                db.raw("DATE_FORMAT(created_at, '%Y-%m') as period"),
                db.raw("COUNT(*) as bookings"),
                db.raw("COALESCE(SUM(adults + children), 0) as participants"),
                db.raw(
                    "COALESCE(SUM(paid_amount), 0) as earnings",
                ),
            )
            .groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
            .orderBy("period", "asc");
    }

    // Số chuyến done/canceled theo tháng của created_at.
    static async getTripsMonthly(from) {
        return db("bookings as b")
            .where("b.created_at", ">=", from)
            .select(
                db.raw("DATE_FORMAT(b.created_at, '%Y-%m') as period"),
                db.raw("COALESCE(SUM(b.status = 'confirmed'), 0) as done"),
                db.raw("COALESCE(SUM(b.status = 'cancelled'), 0) as canceled"),
            )
            .groupByRaw("DATE_FORMAT(b.created_at, '%Y-%m')")
            .orderBy("period", "asc");
    }

    // Số chuyến done/canceled theo ngày của created_at (range ngắn).
    static async getTripsDaily(from) {
        return db("bookings as b")
            .where("b.created_at", ">=", from)
            .select(
                db.raw("DATE_FORMAT(b.created_at, '%Y-%m-%d') as period"),
                db.raw("COALESCE(SUM(b.status = 'confirmed'), 0) as done"),
                db.raw("COALESCE(SUM(b.status = 'cancelled'), 0) as canceled"),
            )
            .groupByRaw("DATE_FORMAT(b.created_at, '%Y-%m-%d')")
            .orderBy("period", "asc");
    }

    // Top tour theo số lượt đặt (booking) trong khoảng thời gian.
    static async getTopPackages(from, limit) {
        return db("bookings as b")
            .join("tour_departures as d", "b.departure_id", "d.id")
            .join("tours as t", "d.tour_id", "t.id")
            .where("b.created_at", ">=", from)
            .select("t.id", "t.name")
            .select(db.raw("COUNT(b.id) as bookings"))
            .groupBy("t.id", "t.name")
            .orderBy("bookings", "desc")
            .orderBy("t.id", "asc")
            .limit(limit);
    }

    // Tổng số lượt đặt trong khoảng (mẫu số tính %).
    static async getBookingsTotal(from) {
        const row = await db("bookings")
            .where("created_at", ">=", from)
            .count({ total: "id" })
            .first();

        return toNumber(row?.total);
    }

    // Hoàn tiền: set payment_status=refunded, status=cancelled, updated_at
    static async refund(id) {
        const updated = await db("bookings")
            .where("id", id)
            .update({
                payment_status: "refunded",
                status: "cancelled",
                updated_at: db.raw("NOW()"),
            });
        return updated > 0;
    }
}

export default AdminBooking;
