import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPaymentSummary, payLater } from "../features/user/bookings/booking.api.js";

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";

export default function PaymentPage() {
    const { bookingId } = useParams();
    const [params] = useSearchParams();
    const token = params.get("token");

    const [data, setData] = useState(null);
    const [error, setError] = useState(null); // { message, statusCode }
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const missingToken = !token;

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        getPaymentSummary(bookingId, token)
            .then((res) => {
                if (cancelled) return;
                if (!res.success) {
                    setError({
                        message: res.message || "Không tải được thông tin đơn.",
                        statusCode: res.statusCode,
                    });
                } else {
                    setData(res.data);
                }
            })
            .catch(() => !cancelled && setError({ message: "Không kết nối được máy chủ." }))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [bookingId, token]);

    const handlePay = async () => {
        setPaying(true);
        try {
            const res = await payLater(bookingId, token);
            if (res.success && res.vnpayUrl) {
                window.location.href = res.vnpayUrl;
                return;
            }
            setError({
                message: res.message || "Không tạo được liên kết thanh toán.",
                statusCode: res.statusCode,
            });
        } catch {
            setError({ message: "Không kết nối được máy chủ." });
        }
        setPaying(false);
    };

    return (
        <div className="max-w-2xl mx-auto px-6 py-16">
            <div className="rounded-3xl border border-slate-200 bg-surface p-8 sm:p-10 shadow-[0_2px_10px_rgba(30,41,59,0.05)]">
                {/* Trạng thái loading */}
                {loading && (
                    <div className="flex flex-col items-center gap-4 py-10 text-center">
                        <span className="w-10 h-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                        <p className="text-muted">Đang tải thông tin đơn thanh toán...</p>
                    </div>
                )}

                {/* Thiếu token */}
                {missingToken && (
                    <div className="text-center">
                        <span className="mx-auto flex w-16 h-16 items-center justify-center rounded-full bg-warning/10 text-warning text-2xl">
                            <i className="fa-solid fa-triangle-exclamation" />
                        </span>
                        <h1 className="mt-5 text-2xl font-extrabold text-foreground">Không thể thanh toán</h1>
                        <p className="mt-2 text-muted">
                            Thiếu token thanh toán. Vui lòng mở lại link trong email.
                        </p>
                        <div className="mt-7">
                            <Link
                                to="/tours"
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                            >
                                Xem các tour khác
                            </Link>
                        </div>
                    </div>
                )}

                {/* Lỗi / sai token / token hết hạn (401) / đơn lỗi (400) */}
                {!loading && error && (
                    <div className="text-center">
                        <span className="mx-auto flex w-16 h-16 items-center justify-center rounded-full bg-warning/10 text-warning text-2xl">
                            <i className="fa-solid fa-triangle-exclamation" />
                        </span>
                        <h1 className="mt-5 text-2xl font-extrabold text-foreground">Không thể thanh toán</h1>
                        <p className="mt-2 text-muted">{error.message}</p>
                        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                            {(error.statusCode === 400 || error.statusCode === 401) && (
                                <Link
                                    to="/user/bookings"
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                                >
                                    <i className="fa-solid fa-clock-rotate-left text-sm" />
                                    Lịch sử đặt tour
                                </Link>
                            )}
                            <Link
                                to="/tours"
                                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline ${
                                    error.statusCode === 400 || error.statusCode === 401
                                        ? "border border-primary text-primary hover:bg-primary hover:text-white"
                                        : "bg-primary text-white hover:bg-primary-dark"
                                }`}
                            >
                                Xem các tour khác
                            </Link>
                        </div>
                    </div>
                )}

                {/* Đơn đã thanh toán */}
                {!loading && !error && data?.payment_status === "paid" && (
                    <div className="text-center">
                        <span className="mx-auto flex w-16 h-16 items-center justify-center rounded-full bg-success/10 text-success text-2xl">
                            <i className="fa-solid fa-circle-check" />
                        </span>
                        <h1 className="mt-5 text-2xl font-extrabold text-foreground">Đơn đã được thanh toán</h1>
                        <p className="mt-2 text-muted">
                            Đơn <strong className="text-foreground">#{`MB${bookingId}`}</strong> của bạn đã thanh toán và
                            xác nhận chỗ. Cảm ơn bạn đã chọn Vietravel!
                        </p>
                        <p className="mt-4 text-lg font-extrabold text-primary">{fmtVND(data.total_price)}</p>
                        <div className="mt-7">
                            <Link
                                to="/tours"
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                            >
                                Xem các tour khác
                                <i className="fa-solid fa-arrow-right text-sm" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Đơn đã bị hủy (hết hạn thanh toán hoặc tự hủy) — B2.2 */}
                {!loading && !error && data?.status === "cancelled" && (
                    <div className="text-center">
                        <span className="mx-auto flex w-16 h-16 items-center justify-center rounded-full bg-warning/10 text-warning text-2xl">
                            <i className="fa-solid fa-ban" />
                        </span>
                        <h1 className="mt-5 text-2xl font-extrabold text-foreground">Đơn đã bị hủy</h1>
                        <p className="mt-2 text-muted">
                            Đơn <strong className="text-foreground">#{`MB${bookingId}`}</strong> đã bị hủy nên không thể
                            thanh toán.
                        </p>
                        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                to={data.tour_id ? `/tours/${data.tour_id}` : "/tours"}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                            >
                                <i className="fa-solid fa-rotate-right text-sm" />
                                Đặt lại tour
                            </Link>
                            <Link
                                to="/user/bookings"
                                className="inline-flex items-center gap-2 rounded-xl border border-primary px-6 py-3 font-bold text-primary transition-colors duration-150 hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                            >
                                Lịch sử đặt tour
                            </Link>
                        </div>
                    </div>
                )}

                {/* Sẵn sàng thanh toán */}
                {!loading && !error && data && data.payment_status !== "paid" && data.status !== "cancelled" && (
                    <>
                        <span className="mx-auto flex w-16 h-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl">
                            <i className="fa-solid fa-money-bill-wave" />
                        </span>
                        <h1 className="mt-5 text-center text-2xl font-extrabold text-foreground">Hoàn tất thanh toán</h1>
                        <p className="mt-1 text-center text-muted">
                            Đơn đặt tour <strong className="text-foreground">#{`MB${bookingId}`}</strong> của{" "}
                            {data.contact_name}
                        </p>

                        <dl className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-background p-5 text-sm">
                            <div>
                                <dt className="text-muted">Tour</dt>
                                <dd className="mt-0.5 font-semibold text-foreground">{data.tour_name}</dd>
                            </div>
                            <div>
                                <dt className="text-muted">Ngày khởi hành</dt>
                                <dd className="mt-0.5 font-semibold text-foreground">
                                    {new Date(data.departure_date).toLocaleDateString("vi-VN")}
                                    {" · "}
                                    {data.departure_location}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Người lớn</dt>
                                <dd className="mt-0.5 font-semibold text-foreground">{data.adults}</dd>
                            </div>
                            <div>
                                <dt className="text-muted">Trẻ em</dt>
                                <dd className="mt-0.5 font-semibold text-foreground">{data.children}</dd>
                            </div>
                        </dl>

                        <div className="mt-6 flex items-center justify-between rounded-2xl bg-primary/5 px-5 py-4">
                            <span className="font-semibold text-foreground">
                                {data.payment_status === "deposit_paid" ? "Số tiền còn lại cần thanh toán (70%)" : "Tổng tiền thanh toán"}
                            </span>
                            <span className="text-xl font-extrabold text-primary">
                                {fmtVND(data.payment_status === "deposit_paid" ? data.remaining_amount : data.total_price)}
                            </span>
                        </div>

                        <div className="mt-6 flex flex-col items-center gap-3">
                            <button
                                type="button"
                                onClick={handlePay}
                                disabled={paying}
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-bold text-white transition-colors duration-150 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                            >
                                {paying ? (
                                    <>
                                        <span className="w-5 h-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        Đang tạo liên kết...
                                    </>
                                ) : (
                                    <>
                                        Thanh toán ngay qua VNPay
                                        <i className="fa-solid fa-arrow-right text-sm" />
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-muted">
                                Bạn sẽ được chuyển sang cổng thanh toán VNPay để hoàn tất giao dịch.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}