import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import RequestDetailContent from "../../tour-requests/RequestDetailContent";
import {
    buildDraftClipboardText,
    STATUS_META,
    STATUS_OPTIONS,
} from "../../tour-requests/tourRequestUtils";
import { updateTourRequestStatus } from "./tourRequests.api";

const ACTIVE_STATUS_CLASS = {
    pending: "border-warning bg-warning/10 text-warning",
    reviewing: "border-info bg-info/10 text-info",
    approved: "border-success bg-success/10 text-success",
    rejected: "border-danger bg-danger/10 text-danger",
};

export default function AdminTourRequestDetail({ request, onClose, onUpdated }) {
    const toast = useToast();
    const [status, setStatus] = useState(request.status);
    const [adminNote, setAdminNote] = useState(request.admin_note ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleCopy = async () => {
        if (!navigator.clipboard?.writeText) {
            toast.error("Trình duyệt không hỗ trợ sao chép tự động.");
            return;
        }

        try {
            await navigator.clipboard.writeText(buildDraftClipboardText(request));
            toast.success("Đã sao chép nội dung đề xuất.");
        } catch {
            toast.error("Không thể sao chép. Vui lòng thử lại.");
        }
    };

    const handleSave = async () => {
        if (status === "rejected" && !adminNote.trim()) {
            setError("Vui lòng nhập lý do từ chối để khách hàng biết.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const res = await updateTourRequestStatus(request.id, {
                status,
                admin_note: adminNote.trim() || null,
            });

            if (res?.httpStatus === 401) {
                toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                return;
            }

            if (res?.httpStatus === 403) {
                toast.error("Bạn không có quyền cập nhật đề xuất này.");
                return;
            }

            if (!res?.success) {
                const message =
                    Array.isArray(res?.errors) && res.errors.length
                        ? res.errors.join(", ")
                        : res?.message || "Không thể cập nhật đề xuất.";
                setError(message);
                toast.error(message);
                return;
            }

            toast.success(res.message || "Đã cập nhật đề xuất.");
            onUpdated?.(res.data);
        } catch {
            const message = "Không thể kết nối đến máy chủ.";
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            <RequestDetailContent request={request} showUser />

            <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-foreground">
                        <i className="fa-solid fa-clipboard-check mr-1.5 text-primary" aria-hidden="true" />
                        Xử lý đề xuất
                    </h4>
                    <span className="text-xs text-muted">
                        Cập nhật trạng thái và phản hồi cho khách hàng
                    </span>
                </div>

                <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Trạng thái
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {STATUS_OPTIONS.map((option) => {
                            const meta = STATUS_META[option.value];
                            const active = status === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        setStatus(option.value);
                                        setError("");
                                    }}
                                    disabled={saving}
                                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                                        active
                                            ? ACTIVE_STATUS_CLASS[option.value]
                                            : "border-border bg-surface text-muted hover:border-primary/40 hover:text-primary"
                                    }`}
                                >
                                    <i className={meta.icon} aria-hidden="true" />
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4">
                    <label
                        htmlFor="admin-note"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                    >
                        Ghi chú gửi khách hàng
                    </label>
                    <textarea
                        id="admin-note"
                        rows={4}
                        value={adminNote}
                        onChange={(event) => {
                            setAdminNote(event.target.value);
                            setError("");
                        }}
                        maxLength={2000}
                        disabled={saving}
                        placeholder="Ví dụ: Đề xuất khả thi, sẽ liên hệ tư vấn và báo giá chính thức..."
                        className="w-full resize-y rounded-xl border border-slate-300 bg-surface px-4 py-3 text-sm text-foreground transition-colors duration-150 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span>Ghi chú này sẽ hiển thị cho khách hàng.</span>
                        <span className="tabular-nums">{adminNote.length}/2000</span>
                    </div>
                </div>

                {error && (
                    <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                        <i className="fa-solid fa-circle-exclamation mr-1.5" aria-hidden="true" />
                        {error}
                    </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-slate-50 hover:text-foreground disabled:opacity-50"
                    >
                        Đóng
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors duration-150 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                            <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
                        )}
                        {saving ? "Đang lưu..." : "Lưu cập nhật"}
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary-50/60 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h4 className="text-sm font-bold text-foreground">
                            <i className="fa-solid fa-map mr-1.5 text-primary" aria-hidden="true" />
                            Tạo tour thủ công
                        </h4>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                            Duyệt đề xuất không tự tạo tour. Sao chép nội dung bên dưới rồi tạo tour mới ở trang
                            Quản lý tour để kiểm soát giá và lịch trình chính thức.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:border-primary/40 hover:text-primary"
                        >
                            <i className="fa-solid fa-copy" aria-hidden="true" />
                            Sao chép nội dung
                        </button>
                        <Link
                            to="/admin/tours"
                            onClick={onClose}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white no-underline transition-colors duration-150 hover:bg-primary-dark"
                        >
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                            Tạo tour
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
