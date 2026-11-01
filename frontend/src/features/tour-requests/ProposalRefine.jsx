import { useEffect, useRef } from "react";

export default function ProposalRefine({
    chatHistory,
    feedback,
    onFeedbackChange,
    onRefine,
    onSubmit,
    refining,
    submitting,
    canSubmit,
    isAuthenticated,
    onReset,
}) {
    const chatRef = useRef(null);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chatHistory, refining]);

    const busy = refining || submitting;

    return (
        <div className="mt-4 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                    <i className="fa-solid fa-comments" aria-hidden="true" />
                </span>
                <div>
                    <h3 className="text-base font-bold text-foreground">Chưa ưng ý? Yêu cầu AI chỉnh sửa</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                        Ví dụ: &quot;thêm một ngày nghỉ dưỡng&quot;, &quot;giảm khách sạn xuống 2 sao&quot;,
                        &quot;thêm điểm tham quan cho trẻ em&quot;...
                    </p>
                </div>
            </div>

            {chatHistory.length > 0 && (
                <div
                    ref={chatRef}
                    className="mt-4 max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-border bg-background p-3"
                >
                    {chatHistory.map((message, index) => (
                        <div
                            key={`${message.role}-${index}`}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <p
                                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                                    message.role === "user"
                                        ? "rounded-br-md bg-primary text-white"
                                        : "rounded-bl-md border border-border bg-surface text-foreground"
                                }`}
                            >
                                {message.content}
                            </p>
                        </div>
                    ))}
                    {refining && (
                        <div className="flex justify-start">
                            <span className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-surface px-3 py-2 text-sm text-muted">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                                AI đang chỉnh sửa
                            </span>
                        </div>
                    )}
                </div>
            )}

            <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    onRefine();
                }}
            >
                <input
                    type="text"
                    value={feedback}
                    onChange={(event) => onFeedbackChange(event.target.value)}
                    maxLength={500}
                    disabled={busy}
                    placeholder="Nhập yêu cầu chỉnh sửa cho AI..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-foreground transition-colors duration-150 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={!feedback.trim() || busy}
                    aria-label="Gửi yêu cầu chỉnh sửa"
                    className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {refining ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                        <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                    )}
                </button>
            </form>

            <div className="mt-5 border-t border-border pt-4">
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!canSubmit || busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {submitting ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                        <i
                            className={
                                isAuthenticated
                                    ? "fa-solid fa-paper-plane"
                                    : "fa-solid fa-right-to-bracket"
                            }
                            aria-hidden="true"
                        />
                    )}
                    {submitting
                        ? "Đang gửi đề xuất..."
                        : isAuthenticated
                          ? "Gửi đề xuất cho admin"
                          : "Đăng nhập để gửi đề xuất"}
                </button>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span className="flex items-start gap-1.5">
                        <i className="fa-solid fa-shield-halved mt-0.5 text-primary" aria-hidden="true" />
                        Đề xuất không tự tạo tour. Admin sẽ xem và liên hệ tư vấn.
                    </span>
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={busy}
                        className="font-semibold text-muted underline-offset-2 transition-colors duration-150 hover:text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Làm lại từ đầu
                    </button>
                </div>
            </div>
        </div>
    );
}
