const respondInvalid = (res, errors) =>
    res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
    });

const isPlainObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const isPositiveInt = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1;
};

const isIntegerInRange = (value, min, max) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max;
};

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

const isFutureOrToday = (value) => {
    if (!isValidDate(value)) return false;
    const date = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
};

const validateChatHistory = (value, errors, fieldName = "chat_history") => {
    if (value === undefined) return;
    if (!Array.isArray(value)) {
        errors.push(`${fieldName} phải là mảng`);
        return;
    }
    if (value.length > 20) {
        errors.push(`${fieldName} không được vượt quá 20 tin nhắn`);
        return;
    }

    for (const message of value) {
        if (!isPlainObject(message)) {
            errors.push(`${fieldName} chứa tin nhắn không hợp lệ`);
            return;
        }
        if (!["user", "assistant"].includes(message.role)) {
            errors.push(`${fieldName} có role không hợp lệ`);
            return;
        }
        if (typeof message.content !== "string" || message.content.length > 2000) {
            errors.push(`${fieldName} có nội dung không hợp lệ`);
            return;
        }
    }
};

// POST /api/tour-requests/draft
export const validateDraft = (req, res, next) => {
    const errors = [];
    const body = isPlainObject(req.body) ? req.body : {};

    const destination =
        typeof body.destination === "string" ? body.destination.trim() : "";
    if (!destination) {
        errors.push("Điểm đến không được để trống");
    } else if (destination.length > 100) {
        errors.push("Điểm đến không được vượt quá 100 ký tự");
    }

    if (!isIntegerInRange(body.duration_days, 1, 30)) {
        errors.push("Số ngày phải là số nguyên từ 1 đến 30");
    }

    if (!isIntegerInRange(body.adults, 1, 20)) {
        errors.push("Số người lớn phải là số nguyên từ 1 đến 20");
    }

    if (body.children !== undefined && !isIntegerInRange(body.children, 0, 20)) {
        errors.push("Số trẻ em phải là số nguyên từ 0 đến 20");
    }

    if (
        body.departure_location !== undefined &&
        (typeof body.departure_location !== "string" ||
            body.departure_location.length > 100)
    ) {
        errors.push("Điểm khởi hành không được vượt quá 100 ký tự");
    }

    if (body.region !== undefined && (typeof body.region !== "string" || body.region.length > 100)) {
        errors.push("Vùng miền không được vượt quá 100 ký tự");
    }

    if (body.expected_start_date !== undefined && body.expected_start_date !== "") {
        if (!isValidDate(body.expected_start_date)) {
            errors.push("Ngày dự kiến phải có định dạng YYYY-MM-DD");
        } else if (!isFutureOrToday(body.expected_start_date)) {
            errors.push("Ngày dự kiến không được ở quá khứ");
        }
    }

    if (body.budget_per_person !== undefined && body.budget_per_person !== "") {
        const budget = Number(body.budget_per_person);
        if (!Number.isFinite(budget) || budget < 0) {
            errors.push("Ngân sách phải là số không âm");
        }
    }

    if (
        body.preferences !== undefined &&
        (typeof body.preferences !== "string" || body.preferences.length > 1000)
    ) {
        errors.push("Sở thích/yêu cầu không được vượt quá 1000 ký tự");
    }

    if (
        body.feedback !== undefined &&
        (typeof body.feedback !== "string" || body.feedback.length > 500)
    ) {
        errors.push("Yêu cầu chỉnh sửa không được vượt quá 500 ký tự");
    }

    if (body.previousDraft !== undefined && !isPlainObject(body.previousDraft)) {
        errors.push("Bản nháp trước không hợp lệ");
    }

    validateChatHistory(body.chat_history, errors);

    if (errors.length > 0) return respondInvalid(res, errors);

    next();
};

// POST /api/tour-requests
export const validateCreateRequest = (req, res, next) => {
    const errors = [];
    const body = isPlainObject(req.body) ? req.body : {};
    const requestData = body.request_data;
    const draft = body.ai_draft;

    if (!isPlainObject(requestData)) {
        errors.push("Thiếu dữ liệu nhu cầu khách hàng");
    }

    if (!isPlainObject(draft)) {
        errors.push("Thiếu bản nháp AI");
    }

    if (isPlainObject(requestData)) {
        const destination =
            typeof requestData.destination === "string"
                ? requestData.destination.trim()
                : "";
        if (!destination) {
            errors.push("Điểm đến không được để trống");
        } else if (destination.length > 100) {
            errors.push("Điểm đến không được vượt quá 100 ký tự");
        }

        if (!isIntegerInRange(requestData.duration_days, 1, 30)) {
            errors.push("Số ngày phải là số nguyên từ 1 đến 30");
        }

        if (
            requestData.departure_location !== undefined &&
            (typeof requestData.departure_location !== "string" ||
                requestData.departure_location.length > 100)
        ) {
            errors.push("Điểm khởi hành không được vượt quá 100 ký tự");
        }

        if (
            requestData.region !== undefined &&
            (typeof requestData.region !== "string" || requestData.region.length > 100)
        ) {
            errors.push("Vùng miền không được vượt quá 100 ký tự");
        }

        if (!isIntegerInRange(requestData.adults, 1, 20)) {
            errors.push("Số người lớn phải là số nguyên từ 1 đến 20");
        }

        if (
            requestData.children !== undefined &&
            !isIntegerInRange(requestData.children, 0, 20)
        ) {
            errors.push("Số trẻ em phải là số nguyên từ 0 đến 20");
        }

        if (
            requestData.expected_start_date !== undefined &&
            requestData.expected_start_date !== ""
        ) {
            if (!isValidDate(requestData.expected_start_date)) {
                errors.push("Ngày dự kiến phải có định dạng YYYY-MM-DD");
            } else if (!isFutureOrToday(requestData.expected_start_date)) {
                errors.push("Ngày dự kiến không được ở quá khứ");
            }
        }

        if (
            requestData.budget_per_person !== undefined &&
            requestData.budget_per_person !== ""
        ) {
            const budget = Number(requestData.budget_per_person);
            if (!Number.isFinite(budget) || budget < 0) {
                errors.push("Ngân sách phải là số không âm");
            }
        }

        if (
            requestData.preferences !== undefined &&
            (typeof requestData.preferences !== "string" ||
                requestData.preferences.length > 1000)
        ) {
            errors.push("Sở thích/yêu cầu không được vượt quá 1000 ký tự");
        }

        validateChatHistory(requestData.chat_history, errors, "request_data.chat_history");
    }

    if (isPlainObject(draft) && draft.total_estimate !== undefined) {
        const total = Number(draft.total_estimate);
        if (!Number.isFinite(total) || total < 0) {
            errors.push("Tổng chi phí dự kiến phải là số không âm");
        }
    }

    if (errors.length > 0) return respondInvalid(res, errors);

    next();
};

// GET /api/tour-requests/mine
export const validateListQuery = (req, res, next) => {
    const errors = [];
    const { page, limit } = req.query;

    if (page !== undefined && !isPositiveInt(page)) {
        errors.push("page phải là số nguyên dương");
    }

    if (limit !== undefined && !isIntegerInRange(limit, 1, 50)) {
        errors.push("limit phải là số nguyên từ 1 đến 50");
    }

    if (errors.length > 0) return respondInvalid(res, errors);

    next();
};

// GET /api/tour-requests/mine/:id
export const validateIdParam = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return respondInvalid(res, ["ID đề xuất không hợp lệ"]);
    }

    next();
};
