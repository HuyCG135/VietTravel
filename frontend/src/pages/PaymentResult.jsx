import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

export default function PaymentResult() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const status = params.get("status");
    const message = params.get("message");
    const bookingId = params.get("bookingId");
    const isSuccess = status === "success";

    const [countdown, setCountdown] = useState(3);

    // Tự động đếm ngược và chuyển hướng về chi tiết booking
    useEffect(() => {
        if (!isSuccess || !bookingId) return;

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    navigate(`/user/bookings/${bookingId}`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isSuccess, bookingId, navigate]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-xl mx-auto rounded-3xl border border-slate-200 bg-surface p-8 sm:p-10 shadow-[0_4px_20px_rgba(30,41,59,0.08)] text-center animate-fade-in">
                {isSuccess ? (
                    <>
                        <span className="mx-auto flex w-20 h-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-3xl">
                            <i className="fa-solid fa-circle-check" />
                        </span>
                        <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-foreground">
                            Giao dịch thành công!
                        </h1>
                        <p className="mt-2.5 text-slate-600">
                            Đơn hàng {bookingId && <strong className="text-primary font-bold">#MB{bookingId}</strong>} đã được ghi nhận thanh toán và giữ chỗ thành công.
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Hệ thống sẽ tự động chuyển về trang chi tiết đơn hàng trong <b className="text-primary">{countdown}s</b>...
                        </p>
                    </>
                ) : (
                    <>
                        <span className="mx-auto flex w-20 h-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 text-3xl">
                            <i className="fa-solid fa-triangle-exclamation" />
                        </span>
                        <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-foreground">
                            Thanh toán chưa hoàn tất
                        </h1>
                        <p className="mt-2.5 text-slate-600">
                            {message || "Giao dịch đã bị hủy hoặc không thành công."}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Đơn chưa được thanh toán. Bạn có thể thử thanh toán lại trong lịch sử đặt tour.
                        </p>
                    </>
                )}

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                    {bookingId ? (
                        <Link
                            to={`/user/bookings/${bookingId}`}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                        >
                            <i className="fa-solid fa-receipt text-sm" />
                            {isSuccess ? "Xem chi tiết đơn ngay" : "Xem chi tiết đơn"}
                        </Link>
                    ) : (
                        <Link
                            to="/user/bookings"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                        >
                            <i className="fa-solid fa-clock-rotate-left text-sm" />
                            Lịch sử đặt tour
                        </Link>
                    )}
                    <Link
                        to="/tours"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-bold text-foreground transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                    >
                        Xem các tour khác
                    </Link>
                </div>
            </div>
        </div>
    );
}