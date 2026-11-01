import { useEffect } from "react";

const SIZE_CLASSES = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
};

// Modal shell dùng chung cho toàn app:
// - Đóng bằng phím Escape hoặc click ra ngoài (có thể tắt qua closeOnBackdrop).
// - Khóa scroll của body khi mở.
// - Children do từng modal tự dựng (header/nội dung/footer) cho linh hoạt.
export default function Modal({
    open,
    onClose,
    children,
    size = "md",
    showClose = true,
    closeOnBackdrop = true,
    ariaLabel = "Hộp thoại",
}) {
    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="presentation">
            {/* Backdrop — click để đóng */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in"
                onClick={closeOnBackdrop ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Container */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                className={`relative w-full ${
                    SIZE_CLASSES[size] ?? SIZE_CLASSES.md
                } max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-surface shadow-2xl ring-1 ring-slate-900/10 animate-modal-in`}
            >
                {showClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-slate-100 hover:text-foreground"
                    >
                        <i className="fa-solid fa-xmark text-lg" />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
}