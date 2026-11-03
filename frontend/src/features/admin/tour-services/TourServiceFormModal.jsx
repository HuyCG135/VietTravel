import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../context/ToastContext";
import Modal from "../../../components/Modal";
import { getTourServiceDetail, updateTourServices } from "./tour-services.api";

const normalize = (value) =>
    String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");

const extractError = (res, fallback) => {
    if (Array.isArray(res?.errors) && res.errors.length) return res.errors.join(", ");
    return res?.message || fallback;
};

export default function TourServiceFormModal({ tour, onClose, onSaved }) {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [services, setServices] = useState([]);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!tour) return;
        let cancelled = false;

        getTourServiceDetail(tour.id)
            .then((res) => {
                if (cancelled) return;
                if (!res?.success) {
                    setLoadError(extractError(res, "Không thể tải danh sách dịch vụ của tour này."));
                    return;
                }
                const list = res.data?.services || [];
                setServices(list);
                setSelectedIds(
                    new Set(list.filter((service) => service.selected).map((service) => Number(service.id))),
                );
            })
            .catch(() => {
                if (!cancelled) setLoadError("Không thể kết nối đến máy chủ.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [tour]);

    const visibleServices = useMemo(() => {
        const keyword = normalize(search.trim());
        if (!keyword) return services;
        return services.filter(
            (service) =>
                normalize(service.name).includes(keyword) ||
                normalize(service.description ?? "").includes(keyword),
        );
    }, [services, search]);

    const toggleService = (service) => {
        const id = Number(service.id);
        const isSelected = selectedIds.has(id);
        if (Number(service.status) !== 1 && !isSelected) return;

        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (isSelected) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (saving || loading) return;

        setSaving(true);
        try {
            const res = await updateTourServices(tour.id, [...selectedIds]);
            if (!res?.success) throw new Error(extractError(res, "Không thể lưu dịch vụ tour"));
            toast.success(res?.message || "Đã cập nhật dịch vụ cho tour.");
            onSaved();
        } catch (err) {
            toast.error(err?.message || "Không thể kết nối đến máy chủ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={saving ? undefined : onClose}
            closeOnBackdrop={!saving}
            size="lg"
            showClose={false}
            ariaLabel="Chọn dịch vụ cho tour"
        >
            <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                    <div className="min-w-0">
                        <h3 id="tour-service-form-title" className="text-lg font-bold text-foreground">
                            Chọn dịch vụ cho tour
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-muted">{tour?.name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Đóng"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-primary-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="border-b border-border bg-primary-50/40 px-5 py-3">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
                        <span className="text-muted">
                            Mã tour: <b className="text-foreground">#{tour?.id}</b>
                        </span>
                        <span className="text-muted">
                            Miền: <b className="text-foreground">{tour?.region || "—"}</b>
                        </span>
                        <span className="text-muted">
                            Thời gian: <b className="text-foreground">{tour?.duration || "—"}</b>
                        </span>
                        <span className="text-muted">
                            Đã chọn: <b className="text-primary">{selectedIds.size}</b> dịch vụ
                        </span>
                    </div>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" />
                        </div>
                    ) : loadError ? (
                        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                            <i className="fa-solid fa-circle-exclamation mr-1.5" />
                            {loadError}
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                                    <i className="fa-solid fa-magnifying-glass text-sm text-muted" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Tìm dịch vụ theo tên hoặc mô tả..."
                                        aria-label="Tìm dịch vụ"
                                        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-slate-400"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch("")}
                                            aria-label="Xóa tìm kiếm"
                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-slate-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        >
                                            <i className="fa-solid fa-xmark text-xs" />
                                        </button>
                                    )}
                                </div>
                                {selectedIds.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        className="shrink-0 self-start text-sm font-semibold text-danger transition-colors duration-150 hover:text-danger/80 sm:self-auto"
                                    >
                                        <i className="fa-solid fa-rotate-left mr-1" />
                                        Bỏ chọn tất cả
                                    </button>
                                )}
                            </div>

                            {visibleServices.length === 0 ? (
                                <div className="py-14 text-center text-muted">
                                    <i className="fa-solid fa-concierge-bell mb-3 text-primary" style={{ fontSize: 36 }} />
                                    <p className="text-sm">
                                        {services.length === 0
                                            ? "Chưa có dịch vụ nào trong hệ thống."
                                            : "Không tìm thấy dịch vụ phù hợp."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                                    {visibleServices.map((service) => {
                                        const id = Number(service.id);
                                        const selected = selectedIds.has(id);
                                        const inactive = Number(service.status) !== 1;
                                        const disabled = inactive && !selected;
                                        return (
                                            <label
                                                key={id}
                                                className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors duration-150 ${
                                                    disabled
                                                        ? "cursor-not-allowed border-border bg-slate-50 opacity-70"
                                                        : selected
                                                            ? "cursor-pointer border-primary bg-primary-50/50"
                                                            : "cursor-pointer border-border hover:border-primary/40"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    disabled={disabled}
                                                    onChange={() => toggleService(service)}
                                                    aria-label={`Chọn dịch vụ ${service.name}`}
                                                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                                                />
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                                                    <i className={service.icon || "fa-solid fa-concierge-bell"} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <b className="text-sm text-foreground">{service.name}</b>
                                                        <span
                                                             className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                                inactive
                                                                    ? "bg-slate-100 text-muted"
                                                                    : "bg-success/10 text-success"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`h-1.5 w-1.5 rounded-full ${
                                                                    inactive ? "bg-slate-400" : "bg-success"
                                                                }`}
                                                            />
                                                            {inactive ? "Tạm ẩn" : "Đang hoạt động"}
                                                        </span>
                                                    </span>
                                                    {service.description && (
                                                        <span className="mt-1 block line-clamp-2 text-sm text-muted">
                                                            {service.description}
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            <p className="mt-4 text-xs text-muted">
                                Dịch vụ tạm ẩn chỉ được giữ lại nếu đang gắn với tour.
                            </p>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
                    <span className="text-sm text-muted">
                        {loading || loadError ? "—" : `${selectedIds.size}/${services.length} dịch vụ`}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-slate-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving || loading || Boolean(loadError)}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                        >
                            {saving && <i className="fa-solid fa-spinner fa-spin mr-2" />}
                            Lưu dịch vụ
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
