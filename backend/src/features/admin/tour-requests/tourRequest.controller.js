import {
    getRequestService,
    listRequestsService,
    updateRequestStatusService,
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

// GET /api/admin/tour-requests
export const getAllRequests = async (req, res) => {
    try {
        const result = await listRequestsService(req.query || {});

        res.json({
            success: true,
            data: result.rows,
            counts: result.counts,
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

// GET /api/admin/tour-requests/:id
export const getRequestDetail = async (req, res) => {
    try {
        const request = await getRequestService(req.params.id);

        res.json({
            success: true,
            data: request,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi tải chi tiết đề xuất");
    }
};

// PUT /api/admin/tour-requests/:id/status
export const updateRequestStatus = async (req, res) => {
    try {
        const request = await updateRequestStatusService(
            req.params.id,
            req.body || {},
            req.user.id,
        );

        res.json({
            success: true,
            message: "Cập nhật trạng thái đề xuất thành công",
            data: request,
        });
    } catch (error) {
        handleError(res, error, "Lỗi khi cập nhật trạng thái đề xuất");
    }
};
