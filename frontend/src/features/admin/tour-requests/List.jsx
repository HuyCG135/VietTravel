import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import Loading from "../../../components/Loading";
import Modal from "../../../components/Modal";
import SelectMenu from "../../../components/SelectMenu";
import Pagination from "../../tours/Pagination";
import StatusBadge from "../../tour-requests/StatusBadge";
import {
    formatDate,
    formatDateTime,
    formatMoneyOrDash,
    STATUS_META,
    STATUS_OPTIONS,
} from "../../tour-requests/tourRequestUtils";
import AdminTourRequestDetail from "./AdminTourRequestDetail";
import { getTourRequest, getTourRequests } from "./tourRequests.api";

const PAGE_LIMIT = 10;

const EMPTY_PAGINATION = {
    currentPage: 1,
    totalPages: 0,
    total: 0,
    limit: PAGE_LIMIT,
};

const EMPTY_COUNTS = {
    pending: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0,
};

const STAT_ITEMS = [
    {
        key: "pending",
        label: "Chờ duyệt",
        icon: "fa-solid fa-clock",
        chip: "bg-warning/10 text-warning",
        active: "border-warning/50 bg-warning/5",
    },
    {
        key: "reviewing",
        label: "Đang xem xét",
        icon: "fa-solid fa-magnifying-glass",
        chip: "bg-info/10 text-info",
        active: "border-info/50 bg-info/5",
    },
    {
        key: "approved",
        label: "Đã duyệt",
        icon: "fa-solid fa-circle-check",
        chip: "bg-success/10 text-success",
        active: "border-success/50 bg-success/5",
    },
    {
        key: "rejected",
        label: "Từ chối",
        icon: "fa-solid fa-circle-xmark",
        chip: "bg-danger/10 text-danger",
        active: "border-danger/50 bg-danger/5",
    },
];

export default function TourRequestList() {
    const toast = useToast();
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [counts, setCounts] = useState(EMPTY_COUNTS);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selected, setSelected] = useState(null);

    const requestSeq = useRef(0);
    const detailSeq = useRef(0);

    const load = useCallback(
        async (targetPage = 1) => {
            const seq = ++requestSeq.current;
            setLoading(true);
            setError("");

            try {
                const res = await getTourRequests({
                    page: targetPage,
                    limit: PAGE_LIMIT,
                    status,
                    search: activeSearch,
                });

                if (seq !== requestSeq.current) return;

                if (res?.httpStatus === 401) {
                    toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                    navigate(`/login?redirect=${encodeURIComponent("/admin/tour-requests")}`);
                    return;
                }

                if (res?.httpStatus === 403) {
                    toast.error("Bạn không có quyền truy cập trang này.");
                    navigate("/admin");
                    return;
                }

                if (!res?.success) {
                    setError(res?.message || "Không thể tải danh sách đề xuất.");
                    setRequests([]);
                    return;
                }

                setRequests(res.data ?? []);
                setCounts({ ...EMPTY_COUNTS, ...(res.counts ?? {}) });
                setPagination(res.pagination ?? EMPTY_PAGINATION);
            } catch {
                if (seq === requestSeq.current) {
                    setError("Không thể kết nối đến máy chủ.");
                    setRequests([]);
                }
            } finally {
                if (seq === requestSeq.current) setLoading(false);
            }
        },
        [activeSearch, navigate, status, toast],
    );

    useEffect(() => {
        load(1);
    }, [load]);

    const handleSearch = () => {
        const next = searchInput.trim();
        if (next === activeSearch) {
            load(1);
            return;
        }
        setActiveSearch(next);
    };

    const handleStatusFilter = (value) => {
        setStatus((prev) => (prev === value ? "" : value));
    };

    const clearFilters = () => {
        setSearchInput("");
        setActiveSearch("");
        setStatus("");
    };

    const openDetail = async (id) => {
        const seq = ++detailSeq.current;
        setDetailOpen(true);
        setDetailLoading(true);
        setSelected(null);

        try {
            const res = await getTourRequest(id);
            if (seq !== detailSeq.current) return;

            if (res?.httpStatus === 401) {
                toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                setDetailOpen(false);
                navigate(`/login?redirect=${encodeURIComponent("/admin/tour-requests")}`);
                return;
            }

            if (res?.httpStatus === 403) {
                toast.error("Bạn không có quyền xem đề xuất này.");
                setDetailOpen(false);
                return;
            }

            if (!res?.success) {
                toast.error(res?.message || "Không thể tải chi tiết đề xuất.");
                setDetailOpen(false);
                return;
            }

            setSelected(res.data ?? null);
        } catch {
            if (seq === detailSeq.current) {
                toast.error("Không thể kết nối đến máy chủ.");
                setDetailOpen(false);
            }
        } finally {
            if (seq === detailSeq.current) setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        detailSeq.current += 1;
        setDetailOpen(false);
        setDetailLoading(false);
        setSelected(null);
    };

    const handleUpdated = (updated) => {
        setSelected(updated);
        load(pagination.currentPage || 1);
    };

    const statusOptions = [
        { value: "", label: "Tất cả trạng thái", icon: "fa-solid fa-list" },
        ...STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            icon: STATUS_META[option.value].icon,
        })),
    ];

    const hasFilters = Boolean(status || activeSearch);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Đề xuất tour</h2>
                    <p className="mt-1 text-sm text-muted">
                        Đề xuất tour do khách hàng gửi qua trợ lý AI. Duyệt, từ chối và phản hồi trực tiếp cho
                        khách.
                    </p>
                </div>
                <Link
                    to="/admin/tours"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-muted no-underline transition-colors duration-150 hover:border-primary/40 hover:text-primary"
                >
                    <i className="fa-solid fa-map" aria-hidden="true" />
                    Quản lý tour
                </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {STAT_ITEMS.map((item) => {
                    const isActive = status === item.key;

                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => handleStatusFilter(item.key)}
                            className={`rounded-2xl border bg-surface p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${
                                isActive ? item.active : "border-border"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.chip}`}>
                                    <i className={item.icon} aria-hidden="true" />
                                </span>
                                <span className="text-2xl font-extrabold tabular-nums text-foreground">
                                    {counts[item.key] ?? 0}
                                </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-foreground">{item.label}</p>
                            <p className="mt-0.5 text-xs text-muted">
                                {isActive ? "Đang lọc — bấm để bỏ lọc" : "Bấm để lọc"}
                            </p>
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    <i className="fa-solid fa-circle-exclamation mr-1.5" aria-hidden="true" />
                    {error}
                </div>
            )}

            <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <i
                            className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted"
                            aria-hidden="true"
                        />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") handleSearch();
                            }}
                            placeholder="Tìm theo tên tour, điểm đến, khách hàng..."
                            className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                        />
                    </div>

                    <SelectMenu
                        id="tour-request-status"
                        ariaLabel="Lọc theo trạng thái đề xuất"
                        icon="fa-solid fa-filter"
                        value={status}
                        onChange={(value) => setStatus(value)}
                        options={statusOptions}
                        className="lg:w-56"
                    />

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSearch}
                            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark"
                        >
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            Tìm kiếm
                        </button>
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted transition-colors duration-150 hover:border-primary/40 hover:text-primary"
                            >
                                <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                                Xóa lọc
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div
                className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-opacity duration-150 ${
                    loading && requests.length > 0 ? "opacity-60" : ""
                }`}
                aria-busy={loading}
            >
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                {[
                                    "ID",
                                    "Khách hàng",
                                    "Đề xuất",
                                    "Thời gian",
                                    "Ngày dự kiến",
                                    "Ngân sách/người",
                                    "Tổng dự kiến",
                                    "Trạng thái",
                                    "Ngày gửi",
                                    "Hành động",
                                ].map((label) => (
                                    <th
                                        key={label}
                                        className="border-b border-border bg-slate-50 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted whitespace-nowrap"
                                    >
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && requests.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-5 py-8 text-center text-sm text-muted">
                                        <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true" />
                                        Đang tải danh sách đề xuất...
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-5 py-10 text-center text-sm text-muted">
                                        <i
                                            className="fa-solid fa-inbox mb-2 block text-primary"
                                            style={{ fontSize: 32 }}
                                            aria-hidden="true"
                                        />
                                        {hasFilters
                                            ? "Không tìm thấy đề xuất phù hợp. Vui lòng thử tiêu chí khác."
                                            : "Chưa có đề xuất tour nào."}
                                    </td>
                                </tr>
                            ) : (
                                requests.map((request) => (
                                    <tr
                                        key={request.id}
                                        onClick={() => openDetail(request.id)}
                                        className="cursor-pointer border-b border-border/70 transition-colors duration-150 last:border-b-0 even:bg-slate-50/60 hover:bg-primary-50/60"
                                    >
                                        <td className="px-4 py-3.5 align-middle text-sm font-semibold text-foreground">
                                            #{request.id}
                                        </td>
                                        <td className="px-4 py-3.5 align-middle">
                                            <p className="text-sm font-semibold text-foreground">
                                                {request.user_fullname || "Khách đã xóa"}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted">
                                                {request.user_email || "—"}
                                            </p>
                                            {request.user_phone && (
                                                <p className="text-xs text-muted">{request.user_phone}</p>
                                            )}
                                        </td>
                                        <td className="max-w-[240px] px-4 py-3.5 align-middle">
                                            <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                                {request.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted">
                                                <i
                                                    className="fa-solid fa-location-dot mr-1 text-primary/70"
                                                    aria-hidden="true"
                                                />
                                                {request.destination}
                                            </p>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle text-sm text-muted">
                                            {request.duration || "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle text-sm text-muted">
                                            {formatDate(request.expected_start_date)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle text-sm tabular-nums text-foreground">
                                            {formatMoneyOrDash(request.budget_per_person)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle text-sm font-bold tabular-nums text-primary">
                                            {formatMoneyOrDash(request.total_estimate)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                                            <StatusBadge status={request.status} />
                                        </td>
                                        <td
                                            className="whitespace-nowrap px-4 py-3.5 align-middle text-sm text-muted"
                                            title={formatDateTime(request.created_at)}
                                        >
                                            {formatDate(request.created_at)}
                                        </td>
                                        <td
                                            className="whitespace-nowrap px-4 py-3.5 align-middle"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => openDetail(request.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-primary transition-colors duration-150 hover:border-primary/40 hover:bg-primary-50"
                                            >
                                                <i className="fa-solid fa-eye" aria-hidden="true" />
                                                Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination
                page={pagination.currentPage}
                totalPages={pagination.totalPages}
                onChange={(targetPage) => load(targetPage)}
            />

            <Modal
                open={detailOpen}
                onClose={closeDetail}
                size="xl"
                ariaLabel="Chi tiết đề xuất tour"
            >
                <div className="p-5 sm:p-7">
                    {detailLoading ? (
                        <Loading />
                    ) : selected ? (
                        <AdminTourRequestDetail
                            key={selected.id}
                            request={selected}
                            onClose={closeDetail}
                            onUpdated={handleUpdated}
                        />
                    ) : (
                        <p className="py-8 text-center text-sm text-muted">
                            Không thể tải chi tiết đề xuất.
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
}
