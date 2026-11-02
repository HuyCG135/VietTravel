import { useEffect, useRef, useState } from "react";
import { useToast } from "../../../context/ToastContext";
import Modal from "../../../components/Modal";
import ImageLightbox from "../../../components/ImageLightbox";
import { getTourImageDetail, uploadTourImages, deleteTourImage } from "./tour-images.api";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;

const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function TourImageFormModal({ tour, onClose, onSaved }) {
    const toast = useToast();
    const fileInputRef = useRef(null);
    const previewsRef = useRef([]);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [images, setImages] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmingId, setConfirmingId] = useState(null);
    const [preview, setPreview] = useState(null);

    previewsRef.current = previews;
    const busy = uploading || deletingId !== null;

    useEffect(() => {
        if (!tour) return;
        let cancelled = false;

        getTourImageDetail(tour.id)
            .then((data) => {
                if (cancelled) return;
                if (!data.success) {
                    setLoadError(data.message || "Không thể tải hình ảnh của tour này.");
                    return;
                }
                setImages(data.data?.images || []);
            })
            .catch(() => {
                if (!cancelled) setLoadError("Không thể kết nối đến máy chủ.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [tour]);

    useEffect(() => {
        return () => {
            previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, []);

    const resetSelection = () => {
        previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
        setSelectedFiles([]);
        setPreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removePreview = (index) => {
        const target = previewsRef.current[index];
        if (target) URL.revokeObjectURL(target.url);
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const addFiles = (fileList) => {
        const incoming = Array.from(fileList || []);
        if (incoming.length === 0) return;

        const invalidFormat = [];
        const tooLarge = [];
        const valid = [];

        for (const file of incoming) {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                invalidFormat.push(file.name);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                tooLarge.push(file.name);
                continue;
            }
            valid.push(file);
        }

        if (invalidFormat.length > 0) {
            toast.error(`Không hỗ trợ định dạng: ${invalidFormat.join(", ")} (chỉ JPG, PNG, WEBP, GIF, AVIF)`);
        }
        if (tooLarge.length > 0) {
            toast.error(`Vượt quá ${formatSize(MAX_FILE_SIZE)}: ${tooLarge.join(", ")}`);
        }
        if (valid.length === 0) return;

        const room = MAX_FILES - selectedFiles.length;
        if (room <= 0) {
            toast.error(`Chỉ được chọn tối đa ${MAX_FILES} ảnh mỗi lần.`);
            return;
        }

        const accepted = valid.slice(0, room);
        if (valid.length > room) {
            toast.error(`Chỉ nhận ${room}/${valid.length} ảnh — tối đa ${MAX_FILES} ảnh mỗi lần.`);
        }

        setSelectedFiles((prev) => [...prev, ...accepted]);
        setPreviews((prev) => [
            ...prev,
            ...accepted.map((file) => ({ url: URL.createObjectURL(file), name: file.name })),
        ]);
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            toast.error("Vui lòng chọn ít nhất một ảnh để tải lên.");
            return;
        }

        setUploading(true);
        try {
            const data = await uploadTourImages(tour.id, selectedFiles);
            if (!data.success) {
                const detail = Array.isArray(data.errors) ? data.errors.join(", ") : "";
                toast.error(detail || data.message || "Không thể tải ảnh lên.");
                return;
            }

            setImages((prev) => [...prev, ...(data.data || [])]);
            resetSelection();
            toast.success(data.message || "Tải ảnh lên thành công.");
            if (Array.isArray(data.errors) && data.errors.length > 0) {
                toast.error(data.errors.join(", "));
            }
            onSaved?.();
        } catch {
            toast.error("Không thể kết nối đến máy chủ.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (imageId) => {
        setDeletingId(imageId);
        try {
            const data = await deleteTourImage(tour.id, imageId);
            if (!data.success) {
                toast.error(data.message || "Không thể xóa ảnh.");
                return;
            }
            setImages((prev) => prev.filter((item) => item.id !== imageId));
            setConfirmingId(null);
            toast.success(data.message || "Xóa ảnh thành công.");
            onSaved?.();
        } catch {
            toast.error("Không thể kết nối đến máy chủ.");
        } finally {
            setDeletingId(null);
        }
    };

    const closeModal = () => {
        if (busy) return;
        onClose();
    };

    return (
        <>
            <Modal
                open
                onClose={busy ? undefined : closeModal}
                closeOnBackdrop={!busy}
                size="2xl"
                showClose={false}
                ariaLabel="Quản lý hình ảnh tour"
            >
                <div className="p-5 sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 id="tour-image-form-title" className="text-lg font-bold text-foreground">
                                Quản lý hình ảnh tour
                            </h3>
                            <p className="mt-0.5 truncate text-sm text-muted">{tour?.name}</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={busy}
                            aria-label="Đóng"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-primary-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-xl border border-border bg-primary-50/60 px-4 py-2.5 text-sm">
                        <span className="text-muted">
                            Mã tour: <b className="text-foreground">#{tour?.id}</b>
                        </span>
                        <span className="text-muted">
                            Miền: <b className="text-foreground">{tour?.region || "—"}</b>
                        </span>
                        <span className="text-muted">
                            Thời gian: <b className="text-foreground">{tour?.duration || "—"}</b>
                        </span>
                        <span className="text-muted">
                            Số ảnh: <b className="text-primary">{images.length}</b>
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status" />
                        </div>
                    ) : loadError ? (
                        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                            <i className="fa-solid fa-circle-exclamation mr-1.5" />
                            {loadError}
                        </div>
                    ) : (
                        <>
                            <section className="rounded-2xl border border-border bg-surface p-4">
                                <h4 className="mb-3 text-sm font-bold text-foreground">
                                    <i className="fa-solid fa-cloud-arrow-up mr-2 text-primary" />
                                    Tải ảnh từ thiết bị
                                </h4>

                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragging(false);
                                        if (!busy) addFiles(e.dataTransfer.files);
                                    }}
                                    onClick={() => !busy && fileInputRef.current?.click()}
                                    className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 ${
                                        dragging
                                            ? "border-primary bg-primary-50"
                                            : "border-border bg-primary-50/40 hover:border-primary/60"
                                    }`}
                                >
                                    <i className="fa-solid fa-cloud-arrow-up mb-2 text-primary" style={{ fontSize: 28 }} />
                                    <p className="text-sm font-medium text-foreground">
                                        Kéo thả ảnh vào đây hoặc bấm để chọn từ thiết bị
                                    </p>
                                    <p className="mt-1 text-xs text-muted">
                                        JPG, PNG, WEBP, GIF, AVIF — tối đa {formatSize(MAX_FILE_SIZE)} mỗi ảnh, {MAX_FILES} ảnh mỗi lần
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => addFiles(e.target.files)}
                                    />
                                </div>

                                {previews.length > 0 && (
                                    <div className="mt-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-sm font-semibold text-foreground">
                                                Đã chọn {selectedFiles.length}/{MAX_FILES} ảnh
                                            </p>
                                            <button
                                                type="button"
                                                onClick={resetSelection}
                                                disabled={busy}
                                                className="cursor-pointer text-sm font-semibold text-muted transition-colors duration-150 hover:text-danger disabled:opacity-50"
                                            >
                                                <i className="fa-solid fa-xmark mr-1" />
                                                Xóa lựa chọn
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                                            {previews.map((preview, index) => (
                                                <div key={`${preview.name}-${index}`} className="group relative overflow-hidden rounded-xl border border-border">
                                                    <img src={preview.url} alt={preview.name} className="h-24 w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePreview(index)}
                                                        disabled={busy}
                                                        aria-label={`Bỏ ảnh ${preview.name}`}
                                                        className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-slate-950/70 text-white transition-colors duration-150 hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
                                                    >
                                                        <i className="fa-solid fa-xmark text-xs" />
                                                    </button>
                                                    <p className="truncate px-2 py-1 text-[11px] text-muted" title={preview.name}>
                                                        {preview.name}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={resetSelection}
                                        disabled={busy || selectedFiles.length === 0}
                                        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-slate-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleUpload}
                                        disabled={busy || selectedFiles.length === 0}
                                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                                    >
                                        {uploading ? (
                                            <>
                                                <i className="fa-solid fa-spinner fa-spin mr-2" />
                                                Đang tải lên...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-upload mr-2" />
                                                Tải lên Cloudinary
                                            </>
                                        )}
                                    </button>
                                </div>
                            </section>

                            <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
                                <h4 className="mb-1 text-sm font-bold text-foreground">
                                    <i className="fa-solid fa-images mr-2 text-primary" />
                                    Ảnh của tour
                                </h4>
                                <p className="mb-3 text-xs text-muted">Ảnh đầu tiên sẽ hiển thị trong thư viện tour.</p>

                                {images.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border py-10 text-center text-muted">
                                        <i className="fa-regular fa-image mb-2" style={{ fontSize: 28 }} />
                                        <p className="text-sm">Tour này chưa có ảnh nào.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                        {images.map((image, index) => (
                                            <div key={image.id} className="relative overflow-hidden rounded-xl border border-border">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreview({
                                                            src: image.image,
                                                            alt: `Ảnh ${index + 1} của ${tour?.name ?? "tour"}`,
                                                            caption: tour?.name,
                                                        })
                                                    }
                                                    title="Bấm để xem ảnh"
                                                    className="group relative block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                >
                                                    <img
                                                        src={image.image}
                                                        alt={`Ảnh ${index + 1} của ${tour?.name ?? "tour"}`}
                                                        className="h-36 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                        loading="lazy"
                                                    />
                                                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition-opacity duration-200 group-hover:bg-slate-950/35 group-hover:opacity-100">
                                                        <i className="fa-solid fa-magnifying-glass-plus" style={{ fontSize: 20 }} />
                                                    </span>
                                                </button>
                                                {index === 0 && (
                                                    <span className="absolute left-2 top-2 rounded-lg bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white">
                                                        Ảnh đầu
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingId(image.id)}
                                                    disabled={busy}
                                                    title="Xóa ảnh"
                                                    aria-label={`Xóa ảnh ${image.id}`}
                                                    className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface/95 text-muted transition-colors duration-150 hover:border-danger/30 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 disabled:opacity-40"
                                                >
                                                    {deletingId === image.id ? (
                                                        <i className="fa-solid fa-spinner fa-spin" />
                                                    ) : (
                                                        <i className="fa-solid fa-trash" />
                                                    )}
                                                </button>

                                                <p className="truncate px-2 py-1.5 text-[11px] text-muted" title={image.image}>
                                                    #{image.id}
                                                </p>

                                                {confirmingId === image.id && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 p-2 text-center">
                                                        <p className="text-xs font-semibold text-white">Xóa ảnh này?</p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(image.id)}
                                                                disabled={busy}
                                                                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
                                                            >
                                                                {deletingId === image.id ? (
                                                                    <i className="fa-solid fa-spinner fa-spin" />
                                                                ) : (
                                                                    "Xóa"
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmingId(null)}
                                                                disabled={busy}
                                                                className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
                                                            >
                                                                Hủy
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                        <span className="text-sm text-muted">
                            Tổng cộng <b className="text-foreground">{images.length}</b> ảnh
                        </span>
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={busy}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </Modal>

            {preview && (
                <ImageLightbox
                    src={preview.src}
                    alt={preview.alt}
                    caption={preview.caption}
                    onClose={() => setPreview(null)}
                />
            )}
        </>
    );
}
