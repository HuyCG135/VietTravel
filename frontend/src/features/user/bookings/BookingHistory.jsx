import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../../../components/Loading";
import UserPageHeader from "../../../components/UserPageHeader";
import Pagination from "../../tours/Pagination";
import { getMyBookings } from "./booking.api";
import BookingCard from "./BookingCard";

const PAGE_SIZE = 5;

const TABS = [
    { id: "all", label: "Tất cả" },
    { id: "confirmed", label: "Đã xác nhận" },
    { id: "cancel_requested", label: "Yêu cầu hủy" },
    { id: "cancelled", label: "Đã hủy" },
];

export default function BookingHistory() {
    const listRef = useRef(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await getMyBookings();
                if (res?.success) {
                    setBookings(res.data || []);
                } else {
                    setError(res?.message || "Không thể tải lịch sử đặt tour");
                }
            } catch (err) {
                setError(err?.message || "Lỗi kết nối đến server");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const q = search.trim().toLowerCase();
    const filtered = useMemo(() => {
        return bookings.filter((b) => {
            if (activeTab !== "all" && b.status !== activeTab) return false;
            if (!q) return true;
            const hay = `${b.tour_name || ""} mb${b.id} ${b.region || ""}`.toLowerCase();
            return hay.includes(q);
        });
    }, [bookings, activeTab, q]);

    // Đổi filter/search → về trang 1; nếu trang vượt quá tổng trang thì lùi lại
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    useEffect(() => {
        setPage(1);
    }, [activeTab, q]);
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const changePage = (next) => {
        if (next < 1 || next > totalPages) return;
        setPage(next);
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const start = (page - 1) * PAGE_SIZE;
    const visible = filtered.slice(start, start + PAGE_SIZE);

    const hasFilter = q !== "" || activeTab !== "all";
    const clearFilters = () => {
        setSearch("");
        setActiveTab("all");
    };

    return (
        <div className="space-y-6">
            <UserPageHeader
                title="Lịch sử đặt tour"
                subtitle="Xem lại các tour quý khách đã đặt và trạng thái thanh toán"
            />

            {loading && <Loading />}

            {/* Lỗi tải danh sách */}
            {!loading && error && (
                <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 text-danger px-4 py-3 text-sm"
                >
                    <i className="fa-solid fa-circle-exclamation" />
                    <span>{error}</span>
                </div>
            )}

            {/* Danh sách rỗng */}
            {!loading && !error && bookings.length === 0 && (
                <div className="text-center py-14 px-4 bg-background rounded-2xl border border-border shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center text-2xl mb-4">
                        <i className="fa-solid fa-clock-rotate-left" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg mb-1">Chưa có tour nào được đặt</h3>
                    <p className="text-muted text-sm mb-5 max-w-sm mx-auto">
                        Khi quý khách đặt một tour, lịch sử đặt và trạng thái thanh toán sẽ hiển thị tại đây.
                    </p>
                    <Link
                        to="/tours"
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-bold text-sm no-underline transition-colors shadow-md shadow-primary/25"
                    >
                        Khám phá tour ngay
                        <i className="fa-solid fa-arrow-right text-xs" />
                    </Link>
                </div>
            )}

            {/* Có booking: thanh công cụ + danh sách */}
            {!loading && !error && bookings.length > 0 && (
                <>
                    {/* Tìm kiếm + bộ lọc trạng thái */}
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm theo tên tour, mã booking hoặc khu vực"
                                aria-label="Tìm kiếm booking"
                                className="w-full pl-10 pr-10 py-2.5 text-sm text-foreground bg-surface border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-shadow placeholder:text-muted/70"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    aria-label="Xóa tìm kiếm"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-danger cursor-pointer p-1 border-0 bg-transparent"
                                >
                                    <i className="fa-solid fa-circle-xmark" />
                                </button>
                            )}
                        </div>

                        <div
                            role="tablist"
                            aria-label="Lọc theo trạng thái"
                            className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto"
                        >
                            {TABS.map((t) => {
                                const count = t.id === "all" ? bookings.length : bookings.filter((b) => b.status === t.id).length;
                                const active = activeTab === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setActiveTab(t.id)}
                                        className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                            active ? "bg-white text-primary shadow-xs" : "text-muted hover:text-foreground"
                                        }`}
                                    >
                                        {t.label}
                                        <span className={`text-[10px] font-bold tabular-nums ${active ? "text-primary" : "text-muted/60"}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Kết quả lọc */}
                    {hasFilter && (
                        <p className="text-xs text-muted -mt-2 mb-0">
                            Tìm thấy <b className="text-foreground font-bold tabular-nums">{filtered.length}</b>/
                            <b className="text-foreground font-bold tabular-nums">{bookings.length}</b> booking
                        </p>
                    )}

                    {/* Không có kết quả cho bộ lọc */}
                    {filtered.length === 0 && (
                        <div className="text-center py-10 px-4 bg-background rounded-2xl border border-border shadow-sm">
                            <div className="w-14 h-14 rounded-full bg-slate-100 text-muted mx-auto flex items-center justify-center text-xl mb-3">
                                <i className="fa-solid fa-ticket" />
                            </div>
                            <h4 className="font-bold text-foreground mb-1">Không tìm thấy booking phù hợp</h4>
                            <p className="text-muted text-sm mb-4">Thử đổi từ khóa hoặc chọn trạng thái khác.</p>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-colors shadow-md shadow-primary/25"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    )}

                    {/* Danh sách booking */}
                    {filtered.length > 0 && (
                        <>
                            <section ref={listRef} aria-label="Danh sách booking" className="flex flex-col gap-5 scroll-mt-24">
                                {visible.map((b) => (
                                    <BookingCard key={b.id} booking={b} />
                                ))}
                            </section>

                            {/* Phân trang */}
                            {totalPages > 1 && (
                                <Pagination page={page} totalPages={totalPages} onChange={changePage} />
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}