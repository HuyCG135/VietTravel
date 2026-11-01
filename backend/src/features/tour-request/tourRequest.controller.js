import {
    createTourRequestService,
    generateDraftService,
    getMyRequestService,
    listMyRequestsService,
} from "./tourRequest.service.js";

const handleError = (res, error, fallbackMessage) => {
    if (error.status && error.status < 500) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
        });
    }

    console.error(`${fallbackMessage}:`, error);
    res.status(500).json({
        success: false,
        message: fallbackMessage,
    });
};

// POST /api/tour-requests/draft
export const generateDraft = async (req, res) => {
    try {
        const result = await generateDraftService(req.body || {});

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi tạo đề xuất bằng AI");
    }
};

// POST /api/tour-requests
export const createRequest = async (req, res) => {
    try {
        const result = await createTourRequestService(req.user.id, req.body || {});

        res.status(201).json({
            success: true,
            message: "Đã gửi đề xuất tới admin",
            data: result,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi gửi đề xuất");
    }
};

// GET /api/tour-requests/mine
export const getMyRequests = async (req, res) => {
    try {
        const result = await listMyRequestsService(req.user.id, req.query || {});

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                currentPage: result.page,
                totalPages: Math.ceil(result.total / result.limit),
                total: result.total,
                limit: result.limit,
            },
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi tải danh sách đề xuất");
    }
};

// GET /api/tour-requests/mine/:id
export const getMyRequest = async (req, res) => {
    try {
        const request = await getMyRequestService(req.user.id, req.params.id);

        res.json({
            success: true,
            data: request,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi tải chi tiết đề xuất");
    }
};
