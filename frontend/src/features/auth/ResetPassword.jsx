import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "./auth.api";
import bgLogin from "../../assets/images/bgForgotPassword.jpeg";
import logoIcon from "../../assets/images/icon.svg";

const inputClass = (hasError = false) =>
    [
        "w-full rounded-xl border bg-slate-50 py-3 pl-11 pr-11 text-foreground placeholder:text-slate-400",
        "transition-colors duration-150 focus:bg-white focus:outline-none focus:ring-2",
        hasError
            ? "border-danger/60 focus:border-danger focus:ring-danger/20"
            : "border-slate-300 focus:border-primary focus:ring-primary/20",
    ].join(" ");

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ text: "", type: "" });
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const validateField = (name, value) => {
        switch (name) {
            case "newPassword":
                if (!value || value.trim().length === 0) {
                    return "Vui lòng nhập mật khẩu mới.";
                }
                if (value.length < 6) {
                    return "Mật khẩu phải có ít nhất 6 ký tự.";
                }
                if (value.length > 20) {
                    return "Mật khẩu không được vượt quá 20 ký tự.";
                }
                return "";
            case "confirmPassword":
                if (!value || value.trim().length === 0) {
                    return "Vui lòng xác nhận mật khẩu mới.";
                }
                if (value !== form.newPassword) {
                    return "Mật khẩu xác nhận không khớp.";
                }
                return "";
            default:
                return "";
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: "", type: "" });

        if (!token) {
            setMessage({
                text: "Liên kết không hợp lệ hoặc thiếu mã xác thực. Vui lòng yêu cầu lại link mới.",
                type: "danger",
            });
            return;
        }

        const newPwdErr = validateField("newPassword", form.newPassword);
        const confirmPwdErr = validateField("confirmPassword", form.confirmPassword);

        if (newPwdErr || confirmPwdErr) {
            setErrors({
                newPassword: newPwdErr,
                confirmPassword: confirmPwdErr,
            });
            return;
        }

        setLoading(true);
        try {
            const data = await resetPassword(token, form.newPassword, form.confirmPassword);
            if (data.success) {
                setIsSuccess(true);
                setMessage({
                    text: data.message || "Đặt lại mật khẩu thành công!",
                    type: "success",
                });
            } else {
                setMessage({
                    text: data.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.",
                    type: "danger",
                });
            }
        } catch (error) {
            console.error("Reset password error:", error);
            setMessage({
                text: "Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại sau.",
                type: "danger",
            });
        } finally {
            setLoading(false);
        }
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
                        <Link to="/" className="flex items-center gap-2.5 text-white no-underline">
                            <img src={logoIcon} alt="Vietravel" width="32" height="32" />
                            <span className="text-lg font-bold">Vietravel</span>
                        </Link>

                        <div className="mt-auto">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                Đặt lại mật khẩu
                            </span>
                            <h1 className="mt-2 text-3xl font-extrabold leading-tight">
                                Bảo mật tài khoản của bạn
                            </h1>
                            <p className="mt-3 text-sm leading-relaxed text-white/80">
                                Hãy tạo mật khẩu mới an toàn gồm chữ cái và số để bảo vệ tài khoản tốt nhất.
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

                    {!token ? (
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-4">
                                <i className="fa-solid fa-triangle-exclamation text-2xl" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-foreground">
                                Liên kết không hợp lệ
                            </h2>
                            <p className="mt-2 text-sm text-muted">
                                Đường dẫn đặt lại mật khẩu thiếu mã xác thực hoặc không còn hợp lệ.
                            </p>
                            <Link
                                to="/forgot-password"
                                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark"
                            >
                                Yêu cầu liên kết mới
                            </Link>
                        </div>
                    ) : isSuccess ? (
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success mb-4">
                                <i className="fa-solid fa-circle-check text-3xl" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                                Thành công!
                            </h2>
                            <p className="mt-2 text-sm text-muted leading-relaxed">
                                Mật khẩu của bạn đã được cập nhật thành công. Bạn có thể sử dụng mật khẩu mới này để đăng nhập.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark"
                            >
                                Đăng nhập ngay
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                                    Mật khẩu mới
                                </h2>
                                <p className="mt-2 text-sm text-muted">
                                    Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
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

                            <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="newPassword" className="text-sm font-medium text-muted">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <i className="fa-solid fa-lock absolute left-4 top-1/2 z-10 -translate-y-1/2 text-base text-slate-400" />
                                        <input
                                            id="newPassword"
                                            name="newPassword"
                                            type={showNewPwd ? "text" : "password"}
                                            placeholder="Tối thiểu 6 ký tự"
                                            value={form.newPassword}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            aria-invalid={!!errors.newPassword}
                                            className={inputClass(!!errors.newPassword)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPwd(!showNewPwd)}
                                            aria-label={showNewPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition-colors hover:text-primary"
                                        >
                                            <i className={`fa-solid ${showNewPwd ? "fa-eye-slash" : "fa-eye"} text-base`} />
                                        </button>
                                    </div>
                                    <p className="min-h-4 text-xs font-medium text-danger">
                                        {errors.newPassword ?? ""}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="confirmPassword" className="text-sm font-medium text-muted">
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 z-10 -translate-y-1/2 text-base text-slate-400" />
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPwd ? "text" : "password"}
                                            placeholder="Nhập lại mật khẩu mới"
                                            value={form.confirmPassword}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            aria-invalid={!!errors.confirmPassword}
                                            className={inputClass(!!errors.confirmPassword)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                                            aria-label={showConfirmPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition-colors hover:text-primary"
                                        >
                                            <i className={`fa-solid ${showConfirmPwd ? "fa-eye-slash" : "fa-eye"} text-base`} />
                                        </button>
                                    </div>
                                    <p className="min-h-4 text-xs font-medium text-danger">
                                        {errors.confirmPassword ?? ""}
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
                                    Cập nhật mật khẩu
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
