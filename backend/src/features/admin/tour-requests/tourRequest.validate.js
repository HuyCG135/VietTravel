const VALID_STATUSES = ["pending", "reviewing", "approved", "rejected"];

const respondInvalid = (res, errors) =>
    res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
    });

const isIntegerInRange = (value, min, max) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max;
};

// GET /api/admin/tour-requests
export const validateListQuery = (req, res, next) => {
    const errors = [];
    const { page, limit, status, search } = req.query;

    if (page !== undefined && (!isIntegerInRange(page, 1, Number.MAX_SAFE_INTEGER))) {
        errors.push("page phải là số nguyên dương");
    }

    if (limit !== undefined && !isIntegerInRange(limit, 1, 100)) {
        errors.push("limit phải là số nguyên từ 1 đến 100");
    }

    if (status !== undefined && status !== "" && !VALID_STATUSES.includes(status)) {
        errors.push(
            "status phải là pending, reviewing, approved hoặc rejected",
        );
    }

    if (typeof search === "string" && search.length > 100) {
        errors.push("Từ khóa tìm kiếm không được vượt quá 100 ký tự");
    }

    if (errors.length > 0) return respondInvalid(res, errors);

    next();
};

// GET /api/admin/tour-requests/:id
export const validateIdParam = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return respondInvalid(res, ["ID đề xuất không hợp lệ"]);
    }

    next();
};

// PUT /api/admin/tour-requests/:id/status
export const validateStatusUpdate = (req, res, next) => {
    const errors = [];
    const { status, admin_note } = req.body || {};

    if (!VALID_STATUSES.includes(status)) {
        errors.push(
            "status phải là pending, reviewing, approved hoặc rejected",
        );
    }

    if (
        admin_note !== undefined &&
        admin_note !== null &&
        (typeof admin_note !== "string" || admin_note.length > 2000)
    ) {
        errors.push("Ghi chú admin không được vượt quá 2000 ký tự");
    }

    if (status === "rejected" && (!admin_note || !String(admin_note).trim())) {
        errors.push("Vui lòng nhập lý do từ chối đề xuất");
    }

    if (errors.length > 0) return respondInvalid(res, errors);

    next();
};
