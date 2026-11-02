import { useState } from "react";
import { RATING_LABELS } from "../../reviews/reviewLabels";

export default function ReviewModal({ tourName, saving, onClose, onSubmit }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [hover, setHover] = useState(0);

    const shown = hover || rating;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-review-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
            onClick={() => !saving && onClose()}
        >
            <div
                className="w-full max-w-lg bg-surface rounded-2xl border border-border p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 id="create-review-title" className="font-bold text-lg text-primary flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-star text-amber-500" />
                    Đánh giá tour
                </h3>
                <p className="text-sm text-muted mb-5 line-clamp-1">{tourName}</p>

                <div className="mb-5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted block mb-2">
                        Đánh giá sao của quý khách
                    </span>
                    <div className="flex items-center gap-2" role="radiogroup" aria-label="Chọn số sao">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <button
                                key={i}
                                type="button"
                                role="radio"
                                aria-checked={rating === i}
                                aria-label={`${i} sao`}
                                onClick={() => setRating(i)}
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(0)}
                                className="text-2xl leading-none transition-all duration-150 cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded"
                            >
                                <i
                                    className={`${
                                        i <= shown
                                            ? "fa-solid fa-star text-amber-400"
                                            : "fa-regular fa-star text-slate-300"
                                    }`}
                                />
                            </button>
                        ))}
                        <span className="text-sm font-semibold text-muted ml-1">
                            {shown ? RATING_LABELS[shown] : "Chọn mức độ hài lòng"}
                        </span>
                    </div>
                </div>

                <label htmlFor="booking-review-comment" className="text-[11px] font-semibold uppercase tracking-wide text-muted block mb-2">
                    Nội dung nhận xét
                </label>
                <textarea
                    id="booking-review-comment"
                    rows={4}
                    value={comment}
                    maxLength={2000}
                    disabled={saving}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm và cảm nhận của quý khách về chuyến đi..."
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/70 resize-y focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
                <p className="text-[11px] text-muted mt-1 mb-5 text-right">
                    {comment.length}/2000
                </p>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onClose}
                        className="border border-border text-foreground px-4 py-2 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        disabled={saving || rating === 0}
                        onClick={() => onSubmit(rating, comment.trim())}
                        className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:hover:bg-primary inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                    >
                        {saving && <i className="fa-solid fa-spinner fa-spin" />}
                        Gửi đánh giá
                    </button>
                </div>
            </div>
        </div>
    );
}

