import db from "../../config/knex.js";

const toNumber = (value) =>
    value === null || value === undefined || value === "" ? 0 : Number(value);

// mysql2 có thể trả cột JSON dạng object hoặc string tùy cấu hình.
// Chuẩn hóa để service/controller luôn nhận object.
const parseJson = (value, fallback = {}) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }
    return value;
};

const mapSummary = (row) => ({
    ...row,
    adults: toNumber(row.adults),
    children: toNumber(row.children),
    budget_per_person:
        row.budget_per_person === null || row.budget_per_person === undefined
            ? null
            : toNumber(row.budget_per_person),
    total_estimate: toNumber(row.total_estimate),
});

const mapDetail = (row) => {
    if (!row) return null;

    const {
        user_fullname,
        user_email,
        user_phone,
        user_address,
        ...requestRow
    } = row;

    return {
        ...mapSummary(requestRow),
        request_data: parseJson(row.request_data, {}),
        ai_draft: parseJson(row.ai_draft, {}),
        user:
            user_fullname || user_email || user_phone
                ? {
                      fullname: user_fullname ?? null,
                      email: user_email ?? null,
                      phone: user_phone ?? null,
                      address: user_address ?? null,
                  }
                : null,
    };
};

const groupBy = (rows, key) => {
    const map = new Map();
    for (const row of rows) {
        const value = row[key];
        if (!map.has(value)) map.set(value, []);
        map.get(value).push(row);
    }
    return map;
};

const SUMMARY_FIELDS = [
    "id",
    "user_id",
    "title",
    "destination",
    "region",
    "duration",
    "departure_location",
    "expected_start_date",
    "adults",
    "children",
    "budget_per_person",
    "total_estimate",
    "status",
    "admin_note",
    "reviewed_by",
    "reviewed_at",
    "created_at",
    "updated_at",
];

class TourRequest {
    static async create(data) {
        const [id] = await db("tour_requests").insert({
            user_id: data.user_id,
            title: data.title,
            destination: data.destination,
            region: data.region ?? null,
            duration: data.duration ?? null,
            departure_location: data.departure_location ?? null,
            expected_start_date: data.expected_start_date ?? null,
            adults: data.adults ?? 1,
            children: data.children ?? 0,
            budget_per_person: data.budget_per_person ?? null,
            total_estimate: data.total_estimate ?? 0,
            status: "pending",
            request_data: JSON.stringify(data.request_data ?? {}),
            ai_draft: JSON.stringify(data.ai_draft ?? {}),
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
        });

        return id;
    }

    static async listByUser(userId, { page, limit } = {}) {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));

        const [{ total }] = await db("tour_requests")
            .where("user_id", userId)
            .count({ total: "id" });

        const rows = await db("tour_requests")
            .where("user_id", userId)
            .select(SUMMARY_FIELDS)
            .orderBy("created_at", "desc")
            .orderBy("id", "desc")
            .limit(limitNum)
            .offset((pageNum - 1) * limitNum);

        return {
            rows: rows.map(mapSummary),
            total: Number(total),
            page: pageNum,
            limit: limitNum,
        };
    }

    static async findByIdForUser(id, userId) {
        const row = await db("tour_requests")
            .where("id", id)
            .where("user_id", userId)
            .first();

        return mapDetail(row);
    }

    static async findById(id) {
        const row = await db("tour_requests as tr")
            .leftJoin("users as u", "u.id", "tr.user_id")
            .select(
                "tr.*",
                "u.fullname as user_fullname",
                "u.email as user_email",
                "u.phone as user_phone",
                "u.address as user_address",
            )
            .where("tr.id", id)
            .first();

        return mapDetail(row);
    }

    static buildAdminQuery({ status, search } = {}) {
        const query = db("tour_requests as tr").leftJoin(
            "users as u",
            "u.id",
            "tr.user_id",
        );

        if (status) {
            query.where("tr.status", status);
        }

        const keyword = typeof search === "string" ? search.trim() : "";
        if (keyword) {
            const like = `%${keyword}%`;
            query.where((builder) => {
                builder
                    .where("tr.title", "like", like)
                    .orWhere("tr.destination", "like", like)
                    .orWhere("u.fullname", "like", like)
                    .orWhere("u.email", "like", like)
                    .orWhere("u.phone", "like", like);
            });
        }

        return query;
    }

    static async listAdmin({ status, search, page, limit } = {}) {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
        const filters = { status, search };

        const countRows = await this.buildAdminQuery(filters).count({
            total: "tr.id",
        });
        const total = toNumber(countRows?.[0]?.total);

        const rows = await this.buildAdminQuery(filters)
            .select(
                "tr.id",
                "tr.title",
                "tr.destination",
                "tr.region",
                "tr.duration",
                "tr.expected_start_date",
                "tr.adults",
                "tr.children",
                "tr.budget_per_person",
                "tr.total_estimate",
                "tr.status",
                "tr.admin_note",
                "tr.created_at",
                "tr.updated_at",
                "u.fullname as user_fullname",
                "u.email as user_email",
                "u.phone as user_phone",
            )
            .orderBy("tr.created_at", "desc")
            .orderBy("tr.id", "desc")
            .limit(limitNum)
            .offset((pageNum - 1) * limitNum);

        return {
            rows: rows.map(mapSummary),
            total,
            page: pageNum,
            limit: limitNum,
        };
    }

    static async statusCounts() {
        const rows = await db("tour_requests")
            .select("status")
            .count({ count: "id" })
            .groupBy("status");

        const counts = {
            pending: 0,
            reviewing: 0,
            approved: 0,
            rejected: 0,
        };

        for (const row of rows) {
            if (Object.hasOwn(counts, row.status)) {
                counts[row.status] = Number(row.count);
            }
        }

        return counts;
    }

    static async updateStatus(id, { status, admin_note, reviewed_by }) {
        const data = {
            status,
            admin_note: admin_note ?? null,
            reviewed_by: reviewed_by ?? null,
            updated_at: db.fn.now(),
        };

        // reviewed_at chỉ có ý nghĩa khi đã duyệt/từ chối.
        data.reviewed_at =
            status === "approved" || status === "rejected" ? db.fn.now() : null;

        const updated = await db("tour_requests").where("id", id).update(data);
        return updated > 0;
    }

    // Lấy tối đa 5 tour tương tự để làm mốc giá/lịch trình cho AI.
    static async findSimilarTours({ destination, region, limit = 5 } = {}) {
        const like = destination ? `%${destination}%` : null;
        let query = db("tours").select(
            "id",
            "name",
            "location",
            "region",
            "duration",
            "price_default",
            "price_child",
            "description",
        );

        if (like) {
            query = query.where((builder) => {
                builder.where("name", "like", like).orWhere("location", "like", like);
                if (region) builder.orWhere("region", region);
            });
        } else if (region) {
            query = query.where("region", region);
        }

        const limitNum = Math.min(10, Math.max(1, Number(limit) || 5));
        const tours = await query.orderBy("id").limit(limitNum);

        if (tours.length === 0) return [];

        const ids = tours.map((tour) => tour.id);

        const [itineraries, services, departures] = await Promise.all([
            db("tour_itineraries")
                .whereIn("tour_id", ids)
                .select("tour_id", "day_number", "description")
                .orderBy("tour_id")
                .orderBy("day_number"),
            db("tour_services")
                .join("services", "tour_services.service_id", "services.id")
                .whereIn("tour_services.tour_id", ids)
                .where("services.status", 1)
                .select("tour_services.tour_id", "services.name"),
            db("tour_departures")
                .whereIn("tour_id", ids)
                .whereNot("status", "closed")
                .select(
                    "tour_id",
                    "departure_location",
                    "departure_date",
                    "price_moving",
                    "seats_available",
                )
                .orderBy("tour_id")
                .orderBy("departure_date"),
        ]);

        const itineraryByTour = groupBy(itineraries, "tour_id");
        const serviceByTour = groupBy(services, "tour_id");
        const departureByTour = groupBy(departures, "tour_id");

        return tours.map((tour) => ({
            ...tour,
            price_default: toNumber(tour.price_default),
            price_child: toNumber(tour.price_child),
            itineraries: itineraryByTour.get(tour.id) || [],
            services: serviceByTour.get(tour.id) || [],
            departures: departureByTour.get(tour.id) || [],
        }));
    }
}

export default TourRequest;
