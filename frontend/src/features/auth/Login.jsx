import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "./auth.api";
import { homeForRole, isStaff } from "../admin/dashboard/menuConfig";
import bgLogin from "../../assets/images/bgLogin.jpg";
import logoIcon from "../../assets/images/icon.svg";

const inputClass = (hasError = false) =>
    [
        "w-full rounded-xl border bg-slate-50 py-3 text-foreground placeholder:text-slate-400",
        "transition-colors duration-150 focus:bg-white focus:outline-none focus:ring-2",
        hasError
            ? "border-danger/60 focus:border-danger focus:ring-danger/20"
            : "border-slate-300 focus:border-primary focus:ring-primary/20",
    ].join(" ");

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = searchParams.get("redirect");
    const redirectTarget = redirect && redirect.startsWith("/") ? redirect : "/";

    const verified = searchParams.get("verified");
    const verifiedMessages = {
        true: { text: "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.", type: "success" },
        already: { text: "Email của bạn đã được xác thực trước đó.", type: "success" },
        false: { text: "Xác thực email thất bại. Link không hợp lệ hoặc đã hết hạn.", type: "danger" },
        error: { text: "Có lỗi xảy ra khi xác thực email. Vui lòng thử lại.", type: "danger" },
    };
    const initialMessage = verified ? verifiedMessages[verified] : null;

    const [form, setForm] = useState({ username: "", password: "" });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState(initialMessage || { text: "", type: "" });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    const validateField = (name, value) => {
        switch (name) {
            case "username": {
                const input = value.trim();
                if (!input) return "Vui lòng nhập email hoặc số điện thoại.";
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
                const isPhone = /^0[0-9]{9}$/.test(input);
                if (!isEmail && !isPhone) return "Email hoặc số điện thoại không hợp lệ.";
                return "";
            }
            case "password":
                return value ? "" : "Vui lòng nhập mật khẩu.";
            default:
                return "";
        }
    };

    const validate = (formValue = form) => {
        const errs = {};
        Object.keys(formValue).forEach((key) => {
            const fieldError = validateField(key, formValue[key]);
            if (fieldError) errs[key] = fieldError;
        });
        return errs;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }
        setLoading(true);
        try {
            const data = await login(form.username, form.password);
            if (data.success) {
                const loggedUser = data?.data?.user;
                localStorage.setItem("token", data?.data?.token || "");
                localStorage.setItem("user", JSON.stringify(loggedUser || null));
                if (loggedUser?.is_verified === 0) {
                    navigate(`/register-success?email=${encodeURIComponent(loggedUser.email || "")}`);
                } else {
                    // Nhân viên vào thẳng khu quản trị theo role; khách về trang chủ.
                    const fallback = isStaff(loggedUser?.role) ? homeForRole(loggedUser.role) : "/";
                    navigate(redirectTarget !== "/" ? redirectTarget : fallback);
                }
            } else {
                setMessage({ text: data.message || "Đăng nhập thất bại.", type: "danger" });
            }
        } catch {
            setMessage({ text: "Có lỗi xảy ra. Vui lòng thử lại.", type: "danger" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto -mt-[70px] flex max-w-7xl justify-center px-4 py-4 sm:px-6 sm:py-16">
            <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-surface shadow-[0_20px_45px_rgba(15,40,60,0.12)] lg:h-[min(560px,calc(100dvh-140px))] lg:grid-cols-2">
                <div className="relative hidden h-full lg:block">
                    <img src={bgLogin} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/60" />
                    <div className="relative z-10 flex h-full flex-col p-10 text-white">
                        <Link to="/" className="flex items-center gap-2.5 no-underline text-white">
                            <img src={logoIcon} alt="Vietravel" width="32" height="32" />
                            <span className="text-lg font-bold">Vietravel</span>
                        </Link>

                        <div className="mt-auto">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                Chào mừng trở lại
                            </span>
                            <h1 className="mt-2 text-3xl font-extrabold leading-tight">
                                Khám phá lại những miền đất thân quen
                            </h1>
                            <p className="mt-3 text-sm leading-relaxed text-white/80">
                                Đăng nhập để đặt tour, theo dõi hành trình và nhận những ưu đãi hấp dẫn từ Vietravel.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="h-full overflow-y-auto p-6 sm:p-10 lg:p-12">
                    <div className="flex items-center gap-2.5 lg:hidden">
                        <img src={logoIcon} alt="Vietravel" width="28" height="28" />
                        <span className="text-lg font-bold text-foreground">Vietravel</span>
                    </div>

                    <div className="mt-2 lg:mt-0">
                        <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">Đăng nhập</h2>
                        <p className="mt-2 text-sm text-muted">Nhập thông tin tài khoản của bạn để tiếp tục.</p>
                    </div>

                    {message.text && (
                        <div
                            className={`mt-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                                message.type === "danger"
                                    ? "border-danger/40 bg-danger/5 text-danger"
                                    : "border-success/40 bg-success/5 text-success"
                            }`}
                        >
                            <i className={`fa-solid mt-0.5 ${message.type === "danger" ? "fa-circle-exclamation" : "fa-circle-check"}`} />
                            <span>{message.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="username" className="text-sm font-medium text-muted">
                                Email hoặc số điện thoại
                            </label>
                            <div className="relative">
                                <i className="fa-solid fa-user absolute left-4 top-1/2 z-10 -translate-y-1/2 text-base text-slate-400" />
                                <input
                                    id="username"
                                    type="text"
                                    name="username"
                                    placeholder="Nhập email hoặc số điện thoại"
                                    value={form.username}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    aria-invalid={!!errors.username}
                                    className={`${inputClass(!!errors.username)} pl-11`}
                                />
                            </div>
                            <p className="min-h-4 text-xs font-medium text-danger">{errors.username ?? ""}</p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium text-muted">
                                    Mật khẩu
                                </label>
                                <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:text-primary-dark">
                                    Quên mật khẩu?
                                </Link>
                            </div>
                            <div className="relative">
                                <i className="fa-solid fa-lock absolute left-4 top-1/2 z-10 -translate-y-1/2 text-base text-slate-400" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPwd ? "text" : "password"}
                                    placeholder="Nhập mật khẩu của bạn"
                                    value={form.password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    aria-invalid={!!errors.password}
                                    className={`${inputClass(!!errors.password)} pl-11 pr-11`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(!showPwd)}
                                    aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition-colors hover:text-primary"
                                >
                                    <i className={`fa-solid ${showPwd ? "fa-eye-slash" : "fa-eye"} text-base`} />
                                </button>
                            </div>
                            <p className="min-h-4 text-xs font-medium text-danger">{errors.password ?? ""}</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary"
                        >
                            {loading && <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            Đăng nhập
                        </button>
                    </form>

                    <p className="mt-7 text-center text-sm text-muted">
                        Chưa có tài khoản?{" "}
                        <Link to="/register" className="font-semibold text-primary hover:text-primary-dark">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}