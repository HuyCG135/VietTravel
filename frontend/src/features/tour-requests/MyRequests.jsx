import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "../../components/Modal";
import Loading from "../../components/Loading";
import { useToast } from "../../context/ToastContext";
import Pagination from "../tours/Pagination";
import RequestDetailContent from "./RequestDetailContent";
import StatusBadge from "./StatusBadge";
import { getMyTourRequest, getMyTourRequests } from "./tourRequest.api";
import { formatDateTime, formatMoneyOrDash } from "./tourRequestUtils";

const PAGE_LIMIT = 5;

const EMPTY_PAGINATION = {
    currentPage: 1,
    totalPages: 0,
    total: 0,
    limit: PAGE_LIMIT,
};

export default function MyRequests({ isAuthenticated, refreshKey, onLogin, onCreate }) {
    const toast = useToast();
    const onLoginRef = useRef(onLogin);
    const detailSeq = useRef(0);

    const [requests, setRequests] = useState([]);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        onLoginRef.current = onLogin;
    }, [onLogin]);

    const load = useCallback(
        async (targetPage = 1) => {
            if (!isAuthenticated) {
                setRequests([]);
                setPagination(EMPTY_PAGINATION);
                return;
            }

            setLoading(true);
            setError("");
            try {
                const res = await getMyTourRequests({
                    page: targetPage,
                    limit: PAGE_LIMIT,
                });

                if (res?.httpStatus === 401) {
                    onLoginRef.current?.();
                    return;
                }

                if (!res?.success) {
                    setError(res?.message || "Không thể tải danh sách đề xuất.");
                    setRequests([]);
                    return;
                }

                setRequests(res.data ?? []);
                setPagination(res.pagination ?? EMPTY_PAGINATION);
            } catch {
                setError("Không thể kết nối đến máy chủ.");
                setRequests([]);
            } finally {
                setLoading(false);
            }
        },
        [isAuthenticated],
    );

    useEffect(() => {
        load(1);
    }, [load, refreshKey]);

    const openDetail = async (id) => {
        const seq = ++detailSeq.current;
        setDetailOpen(true);
        setDetailLoading(true);
        setSelected(null);

        try {
            const res = await getMyTourRequest(id);
            if (seq !== detailSeq.current) return;

            if (res?.httpStatus === 401) {
                setDetailOpen(false);
                onLoginRef.current?.();
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
        setSelected(null);
        setDetailLoading(false);
    };

    return (
        <section id="de-xuat-cua-toi" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Theo dõi</p>
                    <h2 className="mt-1 text-2xl font-extrabold text-foreground">Đề xuất của tôi</h2>
                    <p className="mt-1 text-sm text-muted">
                        Xem trạng thái và phản hồi từ admin cho các đề xuất bạn đã gửi.
                    </p>
                </div>

                {isAuthenticated && (
                    <button
                        type="button"
                        onClick={() => load(pagination.currentPage || 1)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <i
                            className={`fa-solid fa-rotate-right ${loading ? "fa-spin" : ""}`}
                            aria-hidden="true"
                        />
                        Làm mới
                    </button>
                )}
            </div>

            {!isAuthenticated ? (
                <div className="mt-5 rounded-3xl border border-dashed border-primary/30 bg-primary-50/60 p-6 text-center sm:p-8">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
                        <i className="fa-solid fa-lock" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-base font-bold text-foreground">
                        Đăng nhập để gửi và theo dõi đề xuất
                    </h3>
                    <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
                        Bạn vẫn có thể tạo bản nháp bằng AI mà không cần đăng nhập. Khi gửi cho admin, hệ thống sẽ
                        lưu bản nháp và yêu cầu đăng nhập.
                    </p>
                    <button
                        type="button"
                        onClick={onLogin}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-primary-dark"
                    >
                        <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
                        Đăng nhập ngay
                    </button>
                </div>
            ) : loading && requests.length === 0 ? (
                <div className="mt-5 space-y-3">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="h-28 animate-pulse rounded-3xl border border-border bg-surface"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="mt-5 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">
                    <i className="fa-solid fa-circle-exclamation mr-1.5" aria-hidden="true" />
                    {error}
                    <button
                        type="button"
                        onClick={() => load(1)}
                        className="ml-2 font-semibold underline underline-offset-2"
                    >
                        Thử lại
                    </button>
                </div>
            ) : requests.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center">
                    <i
                        className="fa-solid fa-inbox text-primary"
                        style={{ fontSize: 38 }}
                        aria-hidden="true"
                    />
                    <p className="mt-3 font-semibold text-foreground">Bạn chưa gửi đề xuất nào.</p>
                    <p className="mt-1 text-sm text-muted">
                        Hãy tạo một đề xuất tour riêng để admin tư vấn cho bạn.
                    </p>
                    <button
                        type="button"
                        onClick={onCreate}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-primary-dark"
                    >
                        <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                        Tạo đề xuất đầu tiên
                    </button>
                </div>
            ) : (
                <>
                    <div className="mt-5 space-y-3">
                        {requests.map((request) => (
                            <button
                                key={request.id}
                                type="button"
                                onClick={() => openDetail(request.id)}
                                className="w-full rounded-3xl border border-border bg-surface p-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-wide text-muted">
                                                #{request.id}
                                            </span>
                                            <StatusBadge status={request.status} />
                                        </div>
                                        <p className="mt-2 line-clamp-1 text-base font-bold text-foreground">
                                            {request.title}
                                        </p>
                                        <p className="mt-1 text-sm text-muted">
                                            <i className="fa-solid fa-location-dot mr-1 text-primary/70" aria-hidden="true" />
                                            {request.destination}
                                            <span className="mx-1.5">·</span>
                                            {request.duration || "—"}
                                            <span className="mx-1.5">·</span>
                                            {request.adults ?? 0} NL, {request.children ?? 0} TE
                                        </p>
                                        <p className="mt-1 text-xs text-muted">
                                            Gửi lúc {formatDateTime(request.created_at)}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                                            Dự kiến
                                        </p>
                                        <p className="mt-1 text-lg font-extrabold tabular-nums text-primary">
                                            {formatMoneyOrDash(request.total_estimate)}
                                        </p>
                                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                            Xem chi tiết
                                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                        </span>
                                    </div>
                                </div>

                                {request.admin_note && (
                                    <p className="mt-3 line-clamp-2 rounded-xl bg-info/5 px-3 py-2 text-xs leading-relaxed text-info">
                                        <span className="font-semibold">Admin:</span> {request.admin_note}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>

                    <Pagination
                        page={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onChange={(targetPage) => load(targetPage)}
                    />
                </>
            )}

            <Modal open={detailOpen} onClose={closeDetail} size="xl" ariaLabel="Chi tiết đề xuất">
                <div className="p-5 sm:p-7">
                    {detailLoading ? (
                        <Loading />
                    ) : selected ? (
                        <>
                            <RequestDetailContent request={selected} />
                            <div className="mt-5 flex justify-end border-t border-border pt-4">
                                <button
                                    type="button"
                                    onClick={closeDetail}
                                    className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-slate-50 hover:text-foreground"
                                >
                                    Đóng
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="py-8 text-center text-sm text-muted">
                            Không thể tải chi tiết đề xuất.
                        </p>
                    )}
                </div>
            </Modal>
        </section>
    );
}
