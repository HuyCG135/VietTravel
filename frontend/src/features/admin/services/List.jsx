import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import {
    createService,
    deleteService,
    getAllServices,
    updateService,
} from "./services.api";
import ServiceFormModal from "./ServiceFormModal";
import Pagination from "../../tours/Pagination";
import SearchBox from "../../../components/SearchBox";
import SelectMenu from "../../../components/SelectMenu";
import Modal from "../../../components/Modal";

const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
};

const normalizeParams = (searchParams) => ({
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "",
    sort: searchParams.get("sort") ?? "newest",
    page: Math.max(1, Number(searchParams.get("page")) || 1),
});

const buildQueryString = (params) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status !== undefined && params.status !== null && params.status !== "") {
        sp.set("status", params.status);
    }
    if (params.sort && params.sort !== "newest") sp.set("sort", params.sort);
    if (params.page > 1) sp.set("page", params.page);
    return sp.toString();
};

const extractError = (res, fallback) => {
    if (Array.isArray(res?.errors) && res.errors.length) return res.errors.join(", ");
    return res?.message || fallback;
};

export default function ServiceList() {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const current = normalizeParams(searchParams);

    const [services, setServices] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [draft, setDraft] = useState({ q: current.q });
    const [initialized, setInitialized] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deletingLoading, setDeletingLoading] = useState(false);
    const [form, setForm] = useState({ open: false, mode: "create", service: null });
    const [saving, setSaving] = useState(false);
    const requestSeq = useRef(0);

    const loadServices = useCallback(async () => {
        const seq = ++requestSeq.current;
        setLoading(true);
        setError("");
        try {
            const res = await getAllServices(normalizeParams(searchParams));
            if (seq !== requestSeq.current) return;
            if (res?.success) {
                setServices(res.data || []);
                setPagination(res.pagination || null);
            } else {
                setServices([]);
                setPagination(null);
                setError(extractError(res, "Không thể tải danh sách dịch vụ"));
            }
        } catch {
            if (seq !== requestSeq.current) return;
            setServices([]);
            setPagination(null);
            setError("Không thể kết nối đến máy chủ");
        } finally {
            if (seq === requestSeq.current) {
                setLoading(false);
                setInitialized(true);
            }
        }
    }, [searchParams]);

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (saving || deletingLoading) return;
            setForm((prev) => ({ ...prev, open: false }));
            setDeleting(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [saving, deletingLoading]);

    const commit = (params) => {
        setDraft({ q: params.q ?? "" });
        setSearchParams(buildQueryString(params), { replace: true });
    };

    const applyFilters = (next) => {
        commit({ ...current, ...next, page: 1 });
    };

    const changePage = (page) => {
        if (page < 1 || (pagination && page > pagination.totalPages)) return;
        commit({ ...current, page });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const clearFilters = () => {
        commit({ q: "", status: "", sort: "newest", page: 1 });
    };

    const openCreate = () => setForm({ open: true, mode: "create", service: null });
    const openEdit = (service) => setForm({ open: true, mode: "edit", service });
    const closeForm = () => {
        if (saving) return;
        setForm({ open: false, mode: "create", service: null });
    };

    const handleFormSubmit = async (payload) => {
        setSaving(true);
        try {
            if (form.mode === "edit" && form.service) {
                const res = await updateService(form.service.id, payload);
                if (!res?.success) throw new Error(extractError(res, "Không thể lưu dịch vụ"));
                toast.success(res?.message || "Đã cập nhật dịch vụ.");
            } else {
                const res = await createService(payload);
                if (!res?.success) throw new Error(extractError(res, "Không thể tạo dịch vụ"));
                toast.success(res?.message || "Đã thêm dịch vụ mới.");
            }
            setForm({ open: false, mode: "create", service: null });
            await loadServices();
        } catch (err) {
            toast.error(err?.message || "Không thể kết nối đến máy chủ");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!deleting) return;
        setDeletingLoading(true);
        deleteService(deleting.id)
            .then((res) => {
                setDeleting(null);
                if (res?.success) {
                    toast.success(res.message || "Đã xóa dịch vụ.");
                    if (pagination && current.page > 1 && services.length === 1) {
                        changePage(current.page - 1);
                    } else {
                        loadServices();
                    }
                } else {
                    toast.error(extractError(res, "Không thể xóa dịch vụ"));
                }
            })
            .catch(() => {
                setDeleting(null);
                toast.error("Không thể kết nối đến máy chủ");
            })
            .finally(() => setDeletingLoading(false));
    };

    const hasFilters = Boolean(current.q || current.status);
    const refetching = loading && initialized;

    if (!initialized) {
        return (
            <div className="flex justify-center items-center py-16">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Quản lý dịch vụ</h2>
                    <p className="mt-1 text-sm text-muted">
                        Quản lý danh mục dịch vụ dùng cho tour — bấm &quot;Sửa&quot; để chỉnh sửa
                        ngay trên popup.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <i className="fa-solid fa-plus" />
                    Thêm dịch vụ
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    <i className="fa-solid fa-circle-exclamation mr-1.5" />
                    {error}
                </div>
            )}

            <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-4">
                    <SearchBox
                        value={draft.q}
                        onChange={(value) => setDraft((prev) => ({ ...prev, q: value }))}
                        onSearch={(value) => applyFilters({ q: value.trim() })}
                        placeholder="Tìm kiếm theo tên, slug hoặc mô tả..."
                        className="search-group--full"
                    />
                </div>

                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div>
                            <label htmlFor="service-status" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Trạng thái</label>
                            <SelectMenu
                                id="service-status"
                                ariaLabel="Lọc theo trạng thái dịch vụ"
                                icon="fa-solid fa-toggle-on"
                                value={current.status}
                                onChange={(value) => applyFilters({ status: value })}
                                options={[
                                    { value: "", label: "Tất cả trạng thái", icon: "fa-solid fa-list" },
                                    { value: "1", label: "Đang hoạt động", icon: "fa-solid fa-circle-check" },
                                    { value: "0", label: "Tạm ẩn", icon: "fa-solid fa-circle-pause" },
                                ]}
                                className="sm:w-48"
                            />
                        </div>

                        <div>
                            <label htmlFor="service-sort" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Sắp xếp</label>
                            <SelectMenu
                                id="service-sort"
                                ariaLabel="Sắp xếp danh sách dịch vụ"
                                icon="fa-solid fa-arrow-down-wide-short"
                                value={current.sort}
                                onChange={(value) => applyFilters({ sort: value })}
                                options={[
                                    { value: "newest", label: "Mới nhất", icon: "fa-solid fa-clock-rotate-left" },
                                    { value: "updated_desc", label: "Cập nhật gần đây", icon: "fa-solid fa-pen-to-square" },
                                    { value: "name_asc", label: "Tên A-Z", icon: "fa-solid fa-font" },
                                    { value: "name_desc", label: "Tên Z-A", icon: "fa-solid fa-arrow-down-z-a" },
                                ]}
                                className="sm:w-48"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:justify-end">
                        <p className="text-sm text-muted">
                            Tìm thấy <b className="text-foreground">{pagination?.total ?? services.length}</b> dịch vụ
                            {refetching && (
                                <i className="fa-solid fa-spinner fa-spin ml-1.5 text-xs text-primary" aria-hidden="true" />
                            )}
                        </p>
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="cursor-pointer text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-dark"
                            >
                                <i className="fa-solid fa-rotate-left mr-1" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={`transition-opacity duration-150 ${refetching ? "opacity-60 pointer-events-none" : ""}`}>
                {services.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-surface py-16 text-center text-muted">
                        <i className="fa-solid fa-concierge-bell mb-3 text-primary" style={{ fontSize: 40 }} />
                        <p>Không có dịch vụ nào phù hợp.</p>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <i className="fa-solid fa-plus" />
                            Thêm dịch vụ
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {services.map((service) => {
                                const isActive = Number(service.status) === 1;
                                return (
                                    <div
                                        key={service.id}
                                        className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg text-primary">
                                                <i className={service.icon || "fa-solid fa-concierge-bell"} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="break-words text-base font-semibold text-foreground">
                                                            {service.name}
                                                        </h3>
                                                        {service.slug && (
                                                            <p className="mt-0.5 break-all text-xs text-muted">/{service.slug}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                isActive
                                                                    ? "bg-success/10 text-success"
                                                                    : "bg-slate-100 text-muted"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`h-1.5 w-1.5 rounded-full ${
                                                                    isActive ? "bg-success" : "bg-slate-400"
                                                                }`}
                                                            />
                                                            {isActive ? "Đang hoạt động" : "Tạm ẩn"}
                                                        </span>
                                                    </div>
                                                </div>
                                                {service.description && (
                                                    <p className="mt-3 line-clamp-2 text-sm text-muted">{service.description}</p>
                                                )}
                                                <div className="mt-3 text-xs text-muted">
                                                    Cập nhật lần cuối: {formatDate(service.updated_at)}
                                                </div>
                                            </div>
                                            <div className="hidden shrink-0 gap-2 sm:flex">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(service)}
                                                    className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                >
                                                    <i className="fa-solid fa-pen" />
                                                    Sửa
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(service)}
                                                    className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-danger/30 px-3 py-1.5 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                                                >
                                                    <i className="fa-solid fa-trash" />
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2 sm:hidden">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(service)}
                                                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-dark"
                                            >
                                                <i className="fa-solid fa-pen" />
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleting(service)}
                                                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-danger/30 px-3 py-2 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger/10"
                                            >
                                                <i className="fa-solid fa-trash" />
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {pagination && (
                            <Pagination page={current.page} totalPages={pagination.totalPages} onChange={changePage} />
                        )}
                    </>
                )}
            </div>

            {form.open && (
                <ServiceFormModal
                    mode={form.mode}
                    service={form.service}
                    saving={saving}
                    onClose={closeForm}
                    onSubmit={handleFormSubmit}
                />
            )}

            {deleting && (
                <Modal
                    open
                    onClose={deletingLoading ? undefined : () => setDeleting(null)}
                    closeOnBackdrop={!deletingLoading}
                    size="sm"
                    showClose={false}
                    ariaLabel="Xác nhận xóa dịch vụ"
                >
                    <div className="p-6">
                        <h3 id="delete-service-title" className="mb-3 flex items-center gap-2 text-lg font-bold text-danger">
                            <i className="fa-solid fa-triangle-exclamation" />
                            Xóa dịch vụ
                        </h3>
                        <p className="mb-4 text-sm text-muted">
                            Bạn chắc chắn muốn xóa dịch vụ <b className="text-foreground">“{deleting.name}”</b> không?
                        </p>
                        <div className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                            <i className="fa-solid fa-circle-info mr-1.5" />
                            Dịch vụ sẽ bị gỡ khỏi tất cả tour đang sử dụng và không thể khôi phục.
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={deletingLoading}
                                onClick={() => setDeleting(null)}
                                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-slate-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                            >
                                Không, quay lại
                            </button>
                            <button
                                type="button"
                                disabled={deletingLoading}
                                onClick={handleDelete}
                                className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 disabled:opacity-50"
                            >
                                {deletingLoading && <i className="fa-solid fa-spinner fa-spin" />}
                                Chắc chắn xóa
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
