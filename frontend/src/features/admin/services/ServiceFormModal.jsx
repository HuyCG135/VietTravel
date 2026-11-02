import { useState } from "react";
import Modal from "../../../components/Modal";

const ICON_OPTIONS = [
    "fa-solid fa-concierge-bell",
    "fa-solid fa-hotel",
    "fa-solid fa-plane",
    "fa-solid fa-utensils",
    "fa-solid fa-user-tie",
    "fa-solid fa-shield-halved",
    "fa-solid fa-ticket",
    "fa-solid fa-van-shuttle",
    "fa-solid fa-wifi",
    "fa-solid fa-car",
    "fa-solid fa-ship",
    "fa-solid fa-mountain-sun",
];

const STATUS_OPTIONS = [
    { value: 1, label: "Đang hoạt động", icon: "fa-solid fa-circle-check" },
    { value: 0, label: "Tạm ẩn", icon: "fa-solid fa-circle-pause" },
];

const slugify = (value) =>
    String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

const buildInitialForm = (mode, service) => {
    if (mode === "edit" && service) {
        return {
            name: service.name || "",
            slug: service.slug || "",
            description: service.description || "",
            icon: service.icon || ICON_OPTIONS[0],
            status: Number(service.status ?? 1),
        };
    }
    return {
        name: "",
        slug: "",
        description: "",
        icon: ICON_OPTIONS[0],
        status: 1,
    };
};

const inputClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";
const errorClass = "mt-1 text-xs font-medium text-danger";

export default function ServiceFormModal({ mode, service, saving, onClose, onSubmit }) {
    const [form, setForm] = useState(() => buildInitialForm(mode, service));
    const [errors, setErrors] = useState({});

    const isEdit = mode === "edit";
    const iconOptions =
        form.icon && !ICON_OPTIONS.includes(form.icon) ? [form.icon, ...ICON_OPTIONS] : ICON_OPTIONS;

    const setField = (field) => (event) =>
        setForm((prev) => ({ ...prev, [field]: event.target.value }));

    const handleAutoSlug = () => {
        setForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
    };

    const validate = () => {
        const next = {};
        const name = form.name.trim();
        if (!name) next.name = "Nhập tên dịch vụ.";
        else if (name.length > 255) next.name = "Tên dịch vụ không được vượt quá 255 ký tự.";
        if (!slugify(form.slug.trim() || name)) next.slug = "Nhập slug hoặc tên dịch vụ hợp lệ.";
        if (form.description.length > 10000) next.description = "Mô tả không được vượt quá 10.000 ký tự.";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (saving) return;
        if (!validate()) return;

        onSubmit({
            name: form.name.trim(),
            slug: slugify(form.slug.trim() || form.name),
            description: form.description.trim(),
            icon: form.icon,
            status: Number(form.status),
        });
    };

    return (
        <Modal
            open
            onClose={saving ? undefined : onClose}
            closeOnBackdrop={!saving}
            size="lg"
            showClose={false}
            ariaLabel={isEdit ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ"}
        >
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h3 id="service-form-title" className="text-lg font-bold text-foreground">
                            {isEdit ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ"}
                        </h3>
                        <p className="mt-0.5 text-sm text-muted">
                            {isEdit
                                ? service?.name
                                : "Điền thông tin dịch vụ mới — các trường có * là bắt buộc."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Đóng"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-primary-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={labelClass} htmlFor="service-name">
                            Tên dịch vụ *
                        </label>
                        <input
                            id="service-name"
                            type="text"
                            value={form.name}
                            onChange={setField("name")}
                            placeholder="Ví dụ: Khách sạn 4 sao"
                            maxLength={255}
                            className={inputClass}
                        />
                        {errors.name && <p className={errorClass}>{errors.name}</p>}
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="service-slug">
                            Slug
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="service-slug"
                                type="text"
                                value={form.slug}
                                onChange={setField("slug")}
                                placeholder="khach-san-4-sao"
                                maxLength={255}
                                className={inputClass}
                            />
                            <button
                                type="button"
                                onClick={handleAutoSlug}
                                aria-label="Tạo slug tự động từ tên dịch vụ"
                                title="Tạo slug tự động từ tên dịch vụ"
                                className="flex shrink-0 items-center justify-center rounded-xl border border-border px-3 text-sm text-muted transition-colors duration-150 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <i className="fa-solid fa-wand-magic-sparkles" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                            Bỏ trống để hệ thống tự tạo từ tên dịch vụ.
                        </p>
                        {errors.slug && <p className={errorClass}>{errors.slug}</p>}
                    </div>

                    <div>
                        <span className={labelClass}>Trạng thái</span>
                        <div className="grid grid-cols-2 gap-2">
                            {STATUS_OPTIONS.map((option) => {
                                const active = Number(form.status) === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() =>
                                            setForm((prev) => ({ ...prev, status: option.value }))
                                        }
                                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                            active
                                                ? "border-primary bg-primary-50 text-primary"
                                                : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                                        }`}
                                    >
                                        <i className={option.icon} />
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                            Dịch vụ tạm ẩn sẽ không thể gắn mới vào tour.
                        </p>
                    </div>

                    <div>
                        <span className={labelClass}>Biểu tượng</span>
                        <div className="grid grid-cols-6 gap-2">
                            {iconOptions.map((icon) => {
                                const active = form.icon === icon;
                                return (
                                    <button
                                        key={icon}
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, icon }))}
                                        aria-pressed={active}
                                        aria-label={`Chọn biểu tượng ${icon}`}
                                        title={icon}
                                        className={`flex h-10 items-center justify-center rounded-xl border text-base transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                            active
                                                ? "border-primary bg-primary-50 text-primary"
                                                : "border-border text-muted hover:border-primary/40 hover:text-primary"
                                        }`}
                                    >
                                        <i className={icon} />
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                            Đang chọn: <span className="font-medium text-foreground">{form.icon}</span>
                        </p>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="service-description">
                            Mô tả
                        </label>
                        <textarea
                            id="service-description"
                            value={form.description}
                            onChange={setField("description")}
                            placeholder="Mô tả ngắn gọn về dịch vụ..."
                            maxLength={10000}
                            className={`${inputClass} min-h-[140px] resize-y`}
                        />
                        <div className="mt-1 flex items-center justify-between gap-3">
                            {errors.description ? (
                                <p className={errorClass}>{errors.description}</p>
                            ) : (
                                <span />
                            )}
                            <span className="text-xs tabular-nums text-muted">
                                {form.description.length}/10.000
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="flex items-center gap-2 text-sm text-muted">
                        <i className={`${form.icon} text-primary`} />
                        {Number(form.status) === 1 ? "Đang hoạt động" : "Tạm ẩn"}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-slate-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                        >
                            {saving && <i className="fa-solid fa-spinner fa-spin mr-2" />}
                            {isEdit ? "Lưu thay đổi" : "Tạo dịch vụ"}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
