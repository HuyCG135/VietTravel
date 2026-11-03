import { useRef, useState } from "react";
import Modal from "../../../components/Modal";
import { uploadCoverImage } from "./tours.api";

const REGIONS = ["Miền Bắc", "Miền Trung", "Miền Nam"];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_COVER_SIZE = 5 * 1024 * 1024;

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

const formatMoney = (value) => `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)}đ`;

const buildInitialForm = (mode, tour) => {
    if (mode === "edit" && tour) {
        return {
            name: tour.name || "",
            slug: tour.slug || "",
            location: tour.location || "",
            region: tour.region || "",
            duration: tour.duration || "",
            price_default: String(tour.price_default ?? ""),
            price_child: String(tour.price_child ?? ""),
            cover_image: tour.cover_image || "",
            description: tour.description || "",
        };
    }
    return {
        name: "",
        slug: "",
        location: "",
        region: "",
        duration: "",
        price_default: "",
        price_child: "",
        cover_image: "",
        description: "",
    };
};

const inputClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";
const errorClass = "mt-1 text-xs font-medium text-danger";

export default function TourFormModal({ mode, tour, saving, onClose, onSubmit }) {
    const [form, setForm] = useState(() => buildInitialForm(mode, tour));
    const [errors, setErrors] = useState({});
    const [notice, setNotice] = useState("");
    const [uploadingCover, setUploadingCover] = useState(false);
    const coverInputRef = useRef(null);

    const isEdit = mode === "edit";

    const setField = (field) => (event) =>
        setForm((prev) => ({ ...prev, [field]: event.target.value }));

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = "Nhập tên tour.";
        if (!form.location.trim()) next.location = "Nhập địa điểm.";
        if (!form.region) next.region = "Chọn vùng miền.";
        if (!form.duration.trim()) next.duration = "Nhập thời gian tour.";
        if (form.price_default === "" || !Number.isFinite(Number(form.price_default)) || Number(form.price_default) < 0) {
            next.price_default = "Giá người lớn phải là số không âm.";
        }
        if (form.price_child === "" || !Number.isFinite(Number(form.price_child)) || Number(form.price_child) < 0) {
            next.price_child = "Giá trẻ em phải là số không âm.";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleAutoSlug = () => {
        setForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
    };

    const handleUploadCover = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setErrors((prev) => ({ ...prev, cover_image: "Ảnh bìa phải là file JPG, PNG, WEBP, GIF hoặc AVIF." }));
            return;
        }
        if (file.size > MAX_COVER_SIZE) {
            setErrors((prev) => ({ ...prev, cover_image: `Ảnh bìa vượt quá ${MAX_COVER_SIZE / 1024 / 1024} MB.` }));
            return;
        }

        setErrors((prev) => ({ ...prev, cover_image: "" }));
        setNotice("");
        setUploadingCover(true);

        uploadCoverImage(file)
            .then((data) => {
                if (!data.success) {
                    setErrors((prev) => ({ ...prev, cover_image: data.message || "Không thể tải ảnh bìa lên." }));
                    return;
                }
                setForm((prev) => ({ ...prev, cover_image: data.data.cover_image }));
                setNotice("Đã tải ảnh bìa lên — bấm Lưu để áp dụng cho tour.");
            })
            .catch(() => setErrors((prev) => ({ ...prev, cover_image: "Không thể kết nối đến máy chủ." })))
            .finally(() => setUploadingCover(false));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (saving) return;
        if (!validate()) return;

        onSubmit({
            name: form.name.trim(),
            slug: form.slug.trim() ? slugify(form.slug) : slugify(form.name),
            location: form.location.trim(),
            region: form.region,
            duration: form.duration.trim(),
            price_default: Number(form.price_default),
            price_child: Number(form.price_child),
            cover_image: form.cover_image.trim(),
            description: form.description.trim(),
        });
    };

    return (
        <Modal
            open
            onClose={saving ? undefined : onClose}
            closeOnBackdrop={!saving}
            size="lg"
            showClose={false}
            ariaLabel={isEdit ? "Chỉnh sửa Tour" : "Thêm Tour"}
        >
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h3 id="tour-form-title" className="text-lg font-bold text-foreground">
                            {isEdit ? "Chỉnh sửa Tour" : "Thêm Tour"}
                        </h3>
                        <p className="mt-0.5 text-sm text-muted">
                            {isEdit ? tour?.name : "Điền thông tin tour mới — các trường có * là bắt buộc."}
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
                        <label className={labelClass} htmlFor="tour-name">
                            Tên tour *
                        </label>
                        <input
                            id="tour-name"
                            type="text"
                            value={form.name}
                            onChange={setField("name")}
                            placeholder="Ví dụ: Tour Đà Lạt 3N2Đ"
                            className={inputClass}
                        />
                        {errors.name && <p className={errorClass}>{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="tour-slug">
                                Slug
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="tour-slug"
                                    type="text"
                                    value={form.slug}
                                    onChange={setField("slug")}
                                    placeholder="tour-da-lat"
                                    className={inputClass}
                                />
                                <button
                                    type="button"
                                    onClick={handleAutoSlug}
                                    aria-label="Tạo slug tự động từ tên tour"
                                    title="Tạo slug tự động từ tên tour"
                                    className="flex shrink-0 items-center justify-center rounded-xl border border-border px-3 text-sm text-muted transition-colors duration-150 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="tour-location">
                                Địa điểm *
                            </label>
                            <input
                                id="tour-location"
                                type="text"
                                value={form.location}
                                onChange={setField("location")}
                                placeholder="Ví dụ: Đà Lạt"
                                className={inputClass}
                            />
                            {errors.location && <p className={errorClass}>{errors.location}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="tour-region">
                                Vùng miền *
                            </label>
                            <select
                                id="tour-region"
                                value={form.region}
                                onChange={setField("region")}
                                className={`${inputClass} cursor-pointer`}
                            >
                                <option value="">Chọn vùng miền</option>
                                {REGIONS.map((region) => (
                                    <option key={region} value={region}>
                                        {region}
                                    </option>
                                ))}
                            </select>
                            {errors.region && <p className={errorClass}>{errors.region}</p>}
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="tour-duration">
                                Thời gian *
                            </label>
                            <input
                                id="tour-duration"
                                type="text"
                                value={form.duration}
                                onChange={setField("duration")}
                                placeholder="Ví dụ: 3 ngày 2 đêm"
                                className={inputClass}
                            />
                            {errors.duration && <p className={errorClass}>{errors.duration}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="tour-price-adult">
                                Giá người lớn (VNĐ) *
                            </label>
                            <input
                                id="tour-price-adult"
                                type="number"
                                min="0"
                                step="any"
                                value={form.price_default}
                                onChange={setField("price_default")}
                                placeholder="3200000"
                                className={inputClass}
                            />
                            {errors.price_default && <p className={errorClass}>{errors.price_default}</p>}
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="tour-price-child">
                                Giá trẻ em (VNĐ) *
                            </label>
                            <input
                                id="tour-price-child"
                                type="number"
                                min="0"
                                step="any"
                                value={form.price_child}
                                onChange={setField("price_child")}
                                placeholder="2200000"
                                className={inputClass}
                            />
                            {errors.price_child && <p className={errorClass}>{errors.price_child}</p>}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="tour-cover">
                            Ảnh bìa
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="tour-cover"
                                type="text"
                                value={form.cover_image}
                                onChange={setField("cover_image")}
                                placeholder="https://.../cover.jpg"
                                className={inputClass}
                            />
                            <button
                                type="button"
                                onClick={() => coverInputRef.current?.click()}
                                disabled={uploadingCover}
                                className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                                title="Tải ảnh từ thiết bị lên Cloudinary"
                            >
                                {uploadingCover ? (
                                    <i className="fa-solid fa-spinner fa-spin" />
                                ) : (
                                    <i className="fa-solid fa-cloud-arrow-up" />
                                )}
                                {uploadingCover ? "Đang tải..." : "Tải ảnh"}
                            </button>
                        </div>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
                        {form.cover_image && (
                            <img
                                src={form.cover_image}
                                alt="Ảnh bìa tour"
                                className="mt-2 h-32 rounded-xl border border-border object-cover"
                            />
                        )}
                        {notice && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-success">
                                <i className="fa-solid fa-circle-check" />
                                {notice}
                            </p>
                        )}
                        {errors.cover_image && <p className={errorClass}>{errors.cover_image}</p>}
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="tour-description">
                            Mô tả
                        </label>
                        <textarea
                            id="tour-description"
                            value={form.description}
                            onChange={setField("description")}
                            placeholder="Giới thiệu về tour..."
                            className={`${inputClass} min-h-[140px] resize-y`}
                        />
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-sm text-muted">
                        Giá NL: <b className="text-foreground">{formatMoney(form.price_default)}</b>
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
                            {isEdit ? "Lưu thay đổi" : "Tạo tour"}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
