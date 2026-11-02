import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "./auth.api";
import bgLogin from "../../assets/images/bgForgotPassword.jpeg";
import logoIcon from "../../assets/images/icon.svg";

const inputClass = (hasError = false) =>
    [
        "w-full rounded-xl border bg-slate-50 py-3 pl-11 pr-4 text-foreground placeholder:text-slate-400",
        "transition-colors duration-150 focus:bg-white focus:outline-none focus:ring-2",
        hasError
            ? "border-danger/60 focus:border-danger focus:ring-danger/20"
            : "border-slate-300 focus:border-primary focus:ring-primary/20",
    ].join(" ");

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ text: "", type: "" });
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    const validateField = (value) => {
        const trimmed = (value ?? "").trim();
        if (!trimmed) return "Vui lòng nhập email.";
        if (trimmed.length < 5) return "Email phải có ít nhất 5 ký tự.";
        if (trimmed.length > 100) return "Email không được vượt quá 100 ký tự.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            return "Email không hợp lệ.";
        }
        return "";
    };

    const handleChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (errors.email) {
            setErrors((prev) => ({ ...prev, email: validateField(value) }));
        }
    };

    const handleBlur = () => {
        setErrors((prev) => ({ ...prev, email: validateField(email) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: "", type: "" });

        const err = validateField(email);
        if (err) {
            setErrors({ email: err });
            return;
        }

        setLoading(true);
        try {
            const data = await forgotPassword(email.trim());
            if (data.success) {
                setIsSubmitted(true);
                setCountdown(60);
                setMessage({
                    text:
                        data.message ||
                        "Link đặt lại mật khẩu đã được gửi đến email của bạn!",
                    type: "success",
                });
            } else {
                setMessage({
                    text:
                        data.message ||
                        "Không tìm thấy tài khoản hoặc không thể gửi email.",
                    type: "danger",
                });
            }
        } catch (error) {
            console.error("Forgot password error:", error);
            setMessage({
                text: "Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại sau.",
                type: "danger",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0 || loading) return;
        setMessage({ text: "", type: "" });
        setLoading(true);

        try {
            const data = await forgotPassword(email.trim());
            if (data.success) {
                setCountdown(60);
                setMessage({
                    text: "Đã gửi lại link đặt lại mật khẩu thành công!",
                    type: "success",
                });
            } else {
                setMessage({
                    text: data.message || "Không thể gửi lại email. Vui lòng thử lại sau.",
                    type: "danger",
                });
            }
        } catch (error) {
            console.error("Resend forgot password error:", error);
            setMessage({
                text: "Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại sau.",
                type: "danger",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUseAnotherEmail = () => {
        setIsSubmitted(false);
        setMessage({ text: "", type: "" });
        setErrors({});
    };

    return (
        <div className="mx-auto -mt-[70px] flex max-w-7xl justify-center px-4 py-4 sm:px-6 sm:py-16">
            <div className="grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-surface shadow-[0_20px_45px_rgba(15,40,60,0.12)] lg:min-h-[480px] lg:grid-cols-2">
                {/* Banner bên trái */}
                <div className="relative hidden h-full min-h-[480px] lg:block">
                    <img
                        src={bgLogin}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/60" />
                    <div className="relative z-10 flex h-full flex-col p-10 text-white">
                        <Link
                            to="/"
                            className="flex items-center gap-2.5 text-white no-underline"
                        >
                            <img src={logoIcon} alt="Vietravel" width="32" height="32" />
                            <span className="text-lg font-bold">Vietravel</span>
                        </Link>

                        <div className="mt-auto">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                Quên mật khẩu
                            </span>
                            <h1 className="mt-2 text-3xl font-extrabold leading-tight">
                                Đừng lo, chúng tôi giúp bạn
                            </h1>
                            <p className="mt-3 text-sm leading-relaxed text-white/80">
                                Nhập email đã đăng ký để nhận link đặt lại mật khẩu an toàn và tiếp tục đồng hành cùng Vietravel.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Nội dung bên phải */}
                <div className="flex h-full flex-col justify-center overflow-y-auto p-6 sm:p-10 lg:p-10">
                    <div className="flex items-center gap-2.5 lg:hidden mb-4">
                        <img src={logoIcon} alt="Vietravel" width="28" height="28" />
                        <span className="text-lg font-bold text-foreground">Vietravel</span>
                    </div>

                    {isSubmitted ? (
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                                <i className="fa-solid fa-paper-plane text-2xl" />
                            </div>

                            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                                Kiểm tra email
                            </h2>

                            <p className="mt-3 text-sm text-muted leading-relaxed">
                                Chúng tôi đã gửi đường dẫn đặt lại mật khẩu đến:
                            </p>
                            <p className="mt-1 font-semibold text-foreground text-sm break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                                {email.trim()}
                            </p>

                            <div className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left text-xs text-muted leading-relaxed">
                                <p className="flex items-start gap-2">
                                    <i className="fa-solid fa-clock mt-0.5 text-primary" />
                                    <span>Liên kết có hiệu lực trong <strong>15 phút</strong>.</span>
                                </p>
                                <p className="mt-2 flex items-start gap-2">
                                    <i className="fa-solid fa-circle-info mt-0.5 text-slate-400" />
                                    <span>Nếu không thấy email trong Hộp thư đến, vui lòng kiểm tra thư mục <strong>Spam / Rác</strong>.</span>
                                </p>
                            </div>

                            {message.text && (
                                <div
                                    className={`mt-4 w-full flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm text-left ${
                                        message.type === "danger"
                                            ? "border-danger/40 bg-danger/5 text-danger"
                                            : "border-success/40 bg-success/5 text-success"
                                    }`}
                                >
                                    <i
                                        className={`fa-solid mt-0.5 ${
                                            message.type === "danger"
                                                ? "fa-circle-exclamation"
                                                : "fa-circle-check"
                                        }`}
                                    />
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <div className="mt-6 flex w-full flex-col gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={loading || countdown > 0}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? (
                                        <>
                                            <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Đang gửi lại...
                                        </>
                                    ) : countdown > 0 ? (
                                        <>
                                            <i className="fa-solid fa-clock-rotate-left" />
                                            Gửi lại sau ({countdown}s)
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-rotate-right" />
                                            Gửi lại email
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleUseAnotherEmail}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-foreground transition-colors hover:bg-slate-50"
                                >
                                    <i className="fa-solid fa-pen-to-square text-xs" />
                                    Nhập email khác
                                </button>
                            </div>

                            <p className="mt-6 text-center text-sm text-muted">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-dark"
                                >
                                    <i className="fa-solid fa-arrow-left text-xs" />
                                    Quay lại đăng nhập
                                </Link>
                            </p>
                        </div>
                    ) : (
                        <div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                                    Quên mật khẩu
                                </h2>
                                <p className="mt-2 text-sm text-muted">
                                    Nhập email đã đăng ký để nhận link đặt lại mật khẩu.
                                </p>
                            </div>

                            {message.text && (
                                <div
                                    className={`mt-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                                        message.type === "danger"
                                            ? "border-danger/40 bg-danger/5 text-danger"
                                            : "border-success/40 bg-success/5 text-success"
                                    }`}
                                >
                                    <i
                                        className={`fa-solid mt-0.5 ${
                                            message.type === "danger"
                                                ? "fa-circle-exclamation"
                                                : "fa-circle-check"
                                        }`}
                                    />
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <form
                                onSubmit={handleSubmit}
                                noValidate
                                className="mt-5 flex flex-col gap-4"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="email"
                                        className="text-sm font-medium text-muted"
                                    >
                                        Email
                                    </label>
                                    <div className="relative">
                                        <i className="fa-solid fa-envelope absolute left-4 top-1/2 z-10 -translate-y-1/2 text-base text-slate-400" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="Nhập email đã đăng ký"
                                            value={email}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            aria-invalid={!!errors.email}
                                            className={inputClass(!!errors.email)}
                                        />
                                    </div>
                                    <p className="min-h-4 text-xs font-medium text-danger">
                                        {errors.email ?? ""}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary"
                                >
                                    {loading && (
                                        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    Gửi yêu cầu
                                </button>
                            </form>

                            <p className="mt-6 text-center text-sm text-muted">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-dark"
                                >
                                    <i className="fa-solid fa-arrow-left text-xs" />
                                    Quay lại đăng nhập
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
