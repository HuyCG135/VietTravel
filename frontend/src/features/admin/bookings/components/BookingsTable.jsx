import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { useToast } from "../../../../context/ToastContext";
import { getBookings } from "../bookings.api";

const columns = [
    "Mã booking",
    "Tên khách",
    "Tour",
    "Thời lượng",
    "Ngày khởi hành",
    "Giá",
    "Trạng thái",
];
const PAGE_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 350;

const priceFormatter = new Intl.NumberFormat("vi-VN");

// Dãy số trang: luôn có trang đầu/cuối + trang hiện tại và 2 trang kề.
const buildPageNumbers = (currentPage, totalPages) => {
    if (totalPages <= 0) return [];

    const pages = new Set([1, totalPages, currentPage]);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < totalPages) pages.add(currentPage + 1);

    const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    const result = [];

    sorted.forEach((page, index) => {
        if (index > 0 && page - sorted[index - 1] > 1) {
            result.push("dots");
        }
        result.push(page);
    });

    return result;
};

// Toàn bộ phần Bookings: thanh công cụ + bảng + phân trang.
// Search, lọc ngày khởi hành, lọc trạng thái và phân trang chạy phía server.
export default function BookingsTable() {
    const toast = useToast();
    const navigate = useNavigate();
    const requestSeq = useRef(0);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);

    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 0,
        total: 0,
        limit: PAGE_LIMIT,
    });
    const [loading, setLoading] = useState(true);

    const runFetch = useCallback(
        async ({ keyword, targetPage, statusFilter, from, to }) => {
            const seq = ++requestSeq.current;
            setLoading(true);

            try {
                const res = await getBookings({
                    search: keyword,
                    page: targetPage,
                    limit: PAGE_LIMIT,
                    status: statusFilter,
                    fromDate: from,
                    toDate: to,
                });

                if (seq !== requestSeq.current) return;
                if (!res?.success) {
                    throw new Error(res?.message || "Không thể tải danh sách booking.");
                }

                setRows(res.data ?? []);
                setPagination(
                    res.pagination ?? {
                        currentPage: 1,
                        totalPages: 0,
                        total: 0,
                        limit: PAGE_LIMIT,
                    },
                );
            } catch (error) {
                if (seq === requestSeq.current) {
                    toast.error(error.message);
                }
            } finally {
                if (seq === requestSeq.current) setLoading(false);
            }
        },
        [toast],
    );

    // Gõ tìm kiếm: debounce rồi quay về trang 1.
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [search]);

    // Mọi thay đổi filter/trang đều đi qua đúng một lần fetch.
    useEffect(() => {
        runFetch({
            keyword: debouncedSearch,
            targetPage: page,
            statusFilter: status,
            from: fromDate,
            to: toDate,
        });
    }, [debouncedSearch, page, status, fromDate, toDate, runFetch]);

    const goToPage = (targetPage) => {
        if (
            targetPage < 1 ||
            targetPage > pagination.totalPages ||
            targetPage === pagination.currentPage ||
            loading
        ) {
            return;
        }
        setPage(targetPage);
    };

    const handleStatusChange = (event) => {
        setStatus(event.target.value);
        setPage(1);
    };

    const handleFromDateChange = (event) => {
        setFromDate(event.target.value);
        setPage(1);
    };

    const handleToDateChange = (event) => {
        setToDate(event.target.value);
        setPage(1);
    };

    const pageNumbers = buildPageNumbers(pagination.currentPage, pagination.totalPages);
    const from = pagination.total === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1;
    const to = Math.min(pagination.currentPage * pagination.limit, pagination.total);

    return (
        <section className="bookings">
            {/* Thanh công cụ */}
            <div className="bookings-toolbar">
                <h3 className="section-title">Danh sách booking</h3>
                <div className="toolbar-actions">
                    <label className="search-box">
                        <Search size={14} color="#9aa5b1" />
                        <input
                            placeholder="Tìm theo tên, mã, tour..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>

                    <label className="filter-box">
                        <span>Từ</span>
                        <input
                            type="date"
                            value={fromDate}
                            max={toDate || undefined}
                            onChange={handleFromDateChange}
                            aria-label="Từ ngày khởi hành"
                        />
                    </label>

                    <label className="filter-box">
                        <span>Đến</span>
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate || undefined}
                            onChange={handleToDateChange}
                            aria-label="Đến ngày khởi hành"
                        />
                    </label>

                    <select
                        className="filter-select"
                        value={status}
                        onChange={handleStatusChange}
                        aria-label="Lọc trạng thái booking"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="cancel_requested">Yêu cầu hủy</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>
            </div>

            <div className="table-card">
                {/* Bảng */}
                <div className="table-wrap">
                    <table className="bookings-table">
                        <thead>
                            <tr>
                                {columns.map((column) => (
                                    <th key={column}>
                                        <span className="th-inner">
                                            {column} <ArrowUpDown size={11} color="#9aa5b1" />
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length} className="table-state">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="table-state">
                                        Không tìm thấy booking nào.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="row-clickable"
                                        onClick={() => navigate(`/admin/bookings/${row.id}`)}
                                    >
                                        <td>
                                            <Link
                                                to={`/admin/bookings/${row.id}`}
                                                className="booking-code-link"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {row.code}
                                            </Link>
                                        </td>
                                        <td className="cell-strong">{row.name}</td>
                                        <td>{row.package}</td>
                                        <td>{row.duration}</td>
                                        <td>{row.date}</td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground">
                                                    {priceFormatter.format(row.price)} đ
                                                </span>
                                                {row.payment_status === "deposit_paid" && (
                                                    <span className="text-[11px] text-sky-700 font-medium">
                                                        Đã cọc: {priceFormatter.format(row.paid_amount || row.deposit_amount)} đ
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`status-badge status-${String(row.status).toLowerCase()}`}>
                                                    {row.status_label || row.status}
                                                </span>
                                                {row.payment_status === "deposit_paid" && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                                                        Đã cọc (30%)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Chân bảng: hiển thị + phân trang */}
                <div className="bookings-footer">
                    <div className="showing">
                        <span>Hiển thị</span>
                        <button type="button" className="btn-outline btn-small">
                            {pagination.limit} <ChevronDown size={12} />
                        </button>
                        <span>
                            trong tổng {pagination.total} ({from}-{to})
                        </span>
                    </div>

                    <div className="pagination">
                        <button
                            type="button"
                            className="page-btn"
                            disabled={pagination.currentPage === 1 || loading}
                            onClick={() => goToPage(pagination.currentPage - 1)}
                        >
                            <ChevronLeft size={12} /> Trước
                        </button>

                        {pageNumbers.map((pageNumber, index) =>
                            pageNumber === "dots" ? (
                                <span key={`dots-${index}`} className="page-dots">
                                    ...
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    key={pageNumber}
                                    className={`page-btn ${pageNumber === pagination.currentPage ? "active" : ""}`}
                                    disabled={loading}
                                    onClick={() => goToPage(pageNumber)}
                                >
                                    {pageNumber}
                                </button>
                            ),
                        )}

                        <button
                            type="button"
                            className="page-btn"
                            disabled={
                                loading ||
                                pagination.totalPages === 0 ||
                                pagination.currentPage === pagination.totalPages
                            }
                            onClick={() => goToPage(pagination.currentPage + 1)}
                        >
                            Sau <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
