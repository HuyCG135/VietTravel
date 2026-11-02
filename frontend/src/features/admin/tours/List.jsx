import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { getAllTours, deleteTour, getTourFilters, createTour, updateTour } from "./tours.api";
import TourFormModal from "./TourFormModal";
import Pagination from "../../tours/Pagination";
import SearchBox from "../../../components/SearchBox";
import SelectMenu from "../../../components/SelectMenu";
import ImageLightbox from "../../../components/ImageLightbox";
import Modal from "../../../components/Modal";

const formatPrice = (value) => new Intl.NumberFormat("vi-VN").format(value || 0);
const formatMoney = (value) => `${new Intl.NumberFormat("vi-VN").format(value || 0)}đ`;

const normalizeParams = (searchParams) => ({
    q: searchParams.get("q") ?? "",
    region: searchParams.get("region") ?? "",
    min_price: searchParams.get("min_price") ?? "",
    max_price: searchParams.get("max_price") ?? "",
    sort: searchParams.get("sort") ?? "newest",
    page: Math.max(1, Number(searchParams.get("page")) || 1),
});

const buildQueryString = (params) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.region) sp.set("region", params.region);
    if (params.min_price) sp.set("min_price", params.min_price);
    if (params.max_price) sp.set("max_price", params.max_price);
    if (params.sort && params.sort !== "newest") sp.set("sort", params.sort);
    if (params.page > 1) sp.set("page", params.page);
    return sp.toString();
};

const extractError = (res, fallback) => {
    if (Array.isArray(res?.errors) && res.errors.length) return res.errors.join(", ");
    return res?.message || fallback;
};

export default function TourList() {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const current = normalizeParams(searchParams);

    const [tours, setTours] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState(null);
    const [deletingLoading, setDeletingLoading] = useState(false);
    const [form, setForm] = useState({ open: false, mode: "create", tour: null });
    const [saving, setSaving] = useState(false);
    const [filters, setFilters] = useState({ regions: [], priceRange: { min: 0, max: 0 } });
    const [draft, setDraft] = useState({ q: current.q, min_price: current.min_price, max_price: current.max_price });
    const [initialized, setInitialized] = useState(false);
    const [preview, setPreview] = useState(null);
    const priceTimer = useRef(null);
    const requestSeq = useRef(0);

    const loadTours = useCallback(async () => {
        const seq = ++requestSeq.current;
        setLoading(true);
        setError("");
        try {
            const res = await getAllTours(normalizeParams(searchParams));
            if (seq !== requestSeq.current) return;
            if (res?.success) {
                setTours(res.data || []);
                setPagination(res.pagination || null);
            } else {
                setTours([]);
                setPagination(null);
                setError(extractError(res, "Không thể tải danh sách tour"));
            }
        } catch {
            if (seq !== requestSeq.current) return;
            setTours([]);
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
        loadTours();
    }, [loadTours]);

    useEffect(() => () => clearTimeout(priceTimer.current), []);

    useEffect(() => {
        let ignore = false;
        getTourFilters()
            .then((res) => {
                if (!ignore && res?.success) setFilters(res.data);
            })
            .catch(() => {});
        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            setForm((prev) => ({ ...prev, open: false }));
            setDeleting(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const priceRange = filters.priceRange;
    const priceReady = priceRange.max > priceRange.min;
    const priceStep = priceReady ? Math.max(100000, Math.round((priceRange.max - priceRange.min) / 50)) : 100000;
    const pricePct = (value) => ((value - priceRange.min) / (priceRange.max - priceRange.min)) * 100;
    const clampPrice = (value, min, max) => Math.min(Math.max(value, min), max);

    const lo = clampPrice(
        draft.min_price !== "" ? Number(draft.min_price) : priceRange.min,
        priceRange.min,
        priceRange.max,
    );
    const hi = clampPrice(
        draft.max_price !== "" ? Number(draft.max_price) : priceRange.max,
        priceRange.min,
        priceRange.max,
    );
    const sliderMin = Math.min(lo, hi);
    const sliderMax = Math.max(lo, hi);

    const commit = (params) => {
        setDraft({ q: params.q ?? "", min_price: params.min_price ?? "", max_price: params.max_price ?? "" });
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

    const updatePrice = (minValue, maxValue) => {
        const nextMin = Math.min(minValue, maxValue);
        const nextMax = Math.max(minValue, maxValue);

        setDraft((prev) => ({ ...prev, min_price: String(nextMin), max_price: String(nextMax) }));

        const nextMinParam = nextMin <= priceRange.min ? "" : String(nextMin);
        const nextMaxParam = nextMax >= priceRange.max ? "" : String(nextMax);

        clearTimeout(priceTimer.current);
        priceTimer.current = setTimeout(() => {
            const params = normalizeParams(searchParams);
            const next = { ...params, min_price: nextMinParam, max_price: nextMaxParam, page: 1 };
            setSearchParams(buildQueryString(next), { replace: true });
            setDraft((prev) => ({
                ...prev,
                min_price: next.min_price,
                max_price: next.max_price,
            }));
        }, 300);
    };

    const handleMinChange = (value) => updatePrice(Math.min(Number(value), sliderMax), sliderMax);

    const handleMaxChange = (value) => updatePrice(sliderMin, Math.max(Number(value), sliderMin));

    const hasFilters = Boolean(current.q || current.region || current.min_price || current.max_price);

    const clearFilters = () => {
        clearTimeout(priceTimer.current);
        commit({ q: "", region: "", min_price: "", max_price: "", sort: "newest", page: 1 });
    };

    const openCreate = () => setForm({ open: true, mode: "create", tour: null });
    const openEdit = (tour) => setForm({ open: true, mode: "edit", tour });
    const closeForm = () => {
        if (saving) return;
        setForm({ open: false, mode: "create", tour: null });
    };

    const handleFormSubmit = async (payload) => {
        setSaving(true);
        try {
            if (form.mode === "edit" && form.tour) {
                const res = await updateTour(form.tour.id, payload);
                if (!res?.success) throw new Error(extractError(res, "Không thể lưu tour"));
                toast.success(res?.message || "Đã cập nhật tour.");
            } else {
                const res = await createTour(payload);
                if (!res?.success) throw new Error(extractError(res, "Không thể tạo tour"));
                toast.success(res?.message || "Đã thêm tour mới.");
            }
            setForm({ open: false, mode: "create", tour: null });
            await loadTours();
        } catch (err) {
            toast.error(err?.message || "Không thể kết nối đến máy chủ");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!deleting) return;
        setDeletingLoading(true);
        deleteTour(deleting.id)
            .then((data) => {
                setDeleting(null);
                if (data.success) {
                    setError("");
                    toast.success(data.message || "Đã xóa tour.");
                    if (pagination && current.page > 1 && tours.length === 1) {
                        changePage(current.page - 1);
                    } else {
                        loadTours();
                    }
                } else {
                    toast.error(extractError(data, "Không thể xóa tour"));
                }
            })
            .catch(() => {
                setDeleting(null);
                toast.error("Không thể kết nối đến máy chủ");
            })
            .finally(() => setDeletingLoading(false));
    };

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
                    <h2 className="text-xl font-bold text-foreground">Quản lý Tour</h2>
                    <p className="mt-1 text-sm text-muted">
                        Quản lý thông tin, giá mặc định và ảnh bìa của các tour — bấm &quot;Sửa&quot; để
                        chỉnh sửa ngay trên popup.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <i className="fa-solid fa-plus" />
                    Thêm Tour
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
                        placeholder="Tìm kiếm theo tên tour, địa điểm..."
                        className="search-group--full"
                    />
                </div>

                <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Khoảng giá</span>
                        <span className="text-sm font-bold tabular-nums text-primary">
                            {formatMoney(sliderMin)} – {formatMoney(sliderMax)}
                        </span>
                    </div>

                    <div className="dual-range">
                        <div className="dual-range__track" />
                        {priceReady && (
                            <div
                                className="dual-range__filled"
                                style={{ left: `${pricePct(sliderMin)}%`, right: `${100 - pricePct(sliderMax)}%` }}
                            />
                        )}
                        <input
                            type="range"
                            aria-label="Giá tối thiểu"
                            min={priceRange.min}
                            max={priceRange.max}
                            step={priceStep}
                            value={sliderMin}
                            disabled={!priceReady}
                            onChange={(e) => handleMinChange(e.target.value)}
                        />
                        <input
                            type="range"
                            aria-label="Giá tối đa"
                            min={priceRange.min}
                            max={priceRange.max}
                            step={priceStep}
                            value={sliderMax}
                            disabled={!priceReady}
                            onChange={(e) => handleMaxChange(e.target.value)}
                        />
                    </div>

                    <div className="mt-1 flex justify-between text-xs tabular-nums text-muted">
                        <span>{formatMoney(priceRange.min)}</span>
                        <span>{formatMoney(priceRange.max)}</span>
                    </div>
                </div>

                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div>
                            <label htmlFor="tour-region" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Miền</label>
                            <SelectMenu
                                id="tour-region"
                                ariaLabel="Lọc theo miền"
                                icon="fa-solid fa-location-dot"
                                value={current.region}
                                onChange={(value) => applyFilters({ region: value })}
                                options={[
                                    { value: "", label: "Tất cả miền", icon: "fa-solid fa-earth-asia" },
                                    ...filters.regions.map((region) => ({
                                        value: region,
                                        label: region,
                                        icon: "fa-solid fa-location-dot",
                                    })),
                                ]}
                                className="sm:w-48"
                            />
                        </div>

                        <div>
                            <label htmlFor="tour-sort" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Sắp xếp</label>
                            <SelectMenu
                                id="tour-sort"
                                ariaLabel="Sắp xếp danh sách tour"
                                icon="fa-solid fa-arrow-down-wide-short"
                                value={current.sort}
                                onChange={(value) => applyFilters({ sort: value })}
                                options={[
                                    { value: "newest", label: "Mới nhất", icon: "fa-solid fa-clock-rotate-left" },
                                    { value: "price_asc", label: "Giá tăng dần", icon: "fa-solid fa-arrow-up" },
                                    { value: "price_desc", label: "Giá giảm dần", icon: "fa-solid fa-arrow-down" },
                                    { value: "name_asc", label: "Tên A-Z", icon: "fa-solid fa-font" },
                                ]}
                                className="sm:w-44"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:justify-end">
                        <p className="text-sm text-muted">
                            Tìm thấy <b className="text-foreground">{pagination?.total ?? tours.length}</b> tour
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
                {tours.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-surface py-16 text-center text-muted">
                        <i className="fa-solid fa-map mb-3 text-primary" style={{ fontSize: 40 }} />
                        <p>Không có tour nào phù hợp.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {tours.map((tour) => (
                                <div
                                    key={tour.id}
                                    className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-3 sm:flex-row"
                                >
                                    <div className="shrink-0 sm:w-72">
                                        {tour.cover_image ? (
                                            <button
                                                type="button"
                                                onClick={() => setPreview({ src: tour.cover_image, alt: tour.name, caption: tour.name })}
                                                title="Bấm để xem ảnh bìa"
                                                className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                            >
                                                <img
                                                    src={tour.cover_image}
                                                    alt={tour.name}
                                                    className="h-40 w-full object-cover transition-transform duration-200 group-hover:scale-105 sm:h-[150px]"
                                                />
                                                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition-opacity duration-200 group-hover:bg-slate-950/35 group-hover:opacity-100">
                                                    <i className="fa-solid fa-magnifying-glass-plus" style={{ fontSize: 22 }} />
                                                </span>
                                            </button>
                                        ) : (
                                            <div className="flex h-40 w-full items-center justify-center rounded-xl bg-primary-50 sm:h-[150px]">
                                                <i className="fa-solid fa-image text-primary" style={{ fontSize: 32 }} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1 p-4 sm:p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="line-clamp-2 text-base font-semibold text-foreground">
                                                    {tour.name}
                                                </h3>
                                                {tour.slug && (
                                                    <div className="mt-0.5 text-xs text-muted">/{tour.slug}</div>
                                                )}
                                            </div>
                                            <div className="shrink-0 flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(tour)}
                                                    className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                >
                                                    <i className="fa-solid fa-pen" />
                                                    Sửa
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(tour)}
                                                    className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-danger/30 px-3 py-1.5 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                                                >
                                                    <i className="fa-solid fa-trash" />
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                            <span className="text-muted">
                                                <span className="text-primary/70">Miền:</span>{" "}
                                                <span className="font-medium text-foreground">{tour.region || "—"}</span>
                                            </span>
                                            <span className="text-muted">
                                                <span className="text-primary/70">Địa điểm:</span>{" "}
                                                <span className="font-medium text-foreground">{tour.location || "—"}</span>
                                            </span>
                                            <span className="text-muted">
                                                <span className="text-primary/70">Thời gian:</span>{" "}
                                                <span className="font-medium text-foreground">{tour.duration || "—"}</span>
                                            </span>
                                            <span className="text-muted">
                                                <span className="text-primary/70">Giá người lớn:</span>{" "}
                                                <span className="font-bold text-primary">
                                                    {formatPrice(tour.price_default)} VNĐ
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {pagination && (
                            <Pagination page={current.page} totalPages={pagination.totalPages} onChange={changePage} />
                        )}
                    </>
                )}
            </div>

            {form.open && (
                <TourFormModal
                    mode={form.mode}
                    tour={form.tour}
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
                    ariaLabel="Xác nhận xóa tour"
                >
                    <div className="p-6">
                        <h3 id="delete-tour-title" className="mb-3 flex items-center gap-2 text-lg font-bold text-danger">
                            <i className="fa-solid fa-triangle-exclamation" />
                            Xóa tour
                        </h3>
                        <p className="mb-4 text-sm text-muted">
                            Bạn chắc chắn muốn xóa tour <b className="text-foreground">“{deleting.name}”</b> không?
                        </p>
                        <div className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                            <i className="fa-solid fa-circle-info mr-1.5" />
                            Tour và lịch trình, hình ảnh liên quan sẽ bị xóa vĩnh viễn và không thể khôi phục.
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

            {preview && (
                <ImageLightbox
                    src={preview.src}
                    alt={preview.alt}
                    caption={preview.caption}
                    onClose={() => setPreview(null)}
                />
            )}
        </div>
    );
}
