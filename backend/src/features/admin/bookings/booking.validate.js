const VALID_STATUSES = ["pending", "confirmed", "cancelled", "cancel_requested"];
const VALID_RANGES = ["7d", "30d", "3m", "12m"];

const respondInvalid = (res, errors) =>
    res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
    });

const isPositiveInt = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1;
};

// Chấp nhận đúng định dạng YYYY-MM-DD và là ngày có thật.
const isValidDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
};

// GET /api/admin/bookings
export const validateListQuery = (req, res, next) => {
    const errors = [];
    const { page, limit, status, search, fromDate, toDate } = req.query;

    if (page !== undefined && !isPositiveInt(page)) {
        errors.push("page phải là số nguyên dương");
    }

    if (limit !== undefined) {
        const number = Number(limit);
        if (!Number.isInteger(number) || number < 1 || number > 100) {
            errors.push("limit phải là số nguyên từ 1 đến 100");
        }
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
        errors.push("status phải là pending, confirmed hoặc cancelled");
    }

    if (typeof search === "string" && search.length > 100) {
        errors.push("Từ khóa tìm kiếm không được vượt quá 100 ký tự");
    }

    if (fromDate !== undefined && !isValidDate(fromDate)) {
        errors.push("fromDate phải có định dạng YYYY-MM-DD");
    }

    if (toDate !== undefined && !isValidDate(toDate)) {
        errors.push("toDate phải có định dạng YYYY-MM-DD");
    }

    if (
        isValidDate(fromDate) &&
        isValidDate(toDate) &&
        fromDate > toDate
    ) {
        errors.push("fromDate không được lớn hơn toDate");
    }

    if (errors.length > 0) {
        return respondInvalid(res, errors);
    }

    next();
};

// GET /api/admin/bookings/trips
export const validateRangeQuery = (req, res, next) => {
    const { range } = req.query;

    if (range !== undefined && !VALID_RANGES.includes(range)) {
        return respondInvalid(res, ["range phải là 7d, 30d, 3m hoặc 12m"]);
    }

    next();
};

// GET /api/admin/bookings/top-packages
export const validateTopPackagesQuery = (req, res, next) => {
    const errors = [];
    const { range, limit } = req.query;

    if (range !== undefined && !VALID_RANGES.includes(range)) {
        errors.push("range phải là 7d, 30d, 3m hoặc 12m");
    }

    if (limit !== undefined) {
        const number = Number(limit);
        if (!Number.isInteger(number) || number < 1 || number > 20) {
            errors.push("limit phải là số nguyên từ 1 đến 20");
        }
    }

    if (errors.length > 0) {
        return respondInvalid(res, errors);
    }

    next();
};

// GET /api/admin/bookings/:id
export const validateIdParam = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return respondInvalid(res, ["ID booking không hợp lệ"]);
    }

    next();
};

// PUT /api/admin/bookings/:id/status
export const validateStatusUpdate = (req, res, next) => {
    const { status } = req.body || {};

    if (!VALID_STATUSES.includes(status)) {
        return respondInvalid(res, [
            "Trạng thái phải là pending, confirmed hoặc cancelled",
        ]);
    }

    next();
};
