import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendChat } from "./chat.api";

const WELCOME = {
    role: "assistant",
    content: "Xin chào! Tôi là trợ lý du lịch Vietravel. Bạn cần tìm hiểu thông tin về tour nào?",
};

export default function ChatWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([WELCOME]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { role: "user", content: text };
        const history = [...messages, userMsg];
        setMessages(history);
        setInput("");
        setLoading(true);

        try {
            const res = await sendChat(history.map(({ role, content }) => ({ role, content })));

            if (res?.success && res.data) {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: res.data.message, sources: res.data.sources || [] },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: res?.message || "Xin lỗi, tôi chưa trả lời được. Vui lòng thử lại sau." },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Lỗi kết nối. Vui lòng thử lại." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* --- Panel hội thoại --- */}
            {open && (
                <div className="fixed bottom-24 right-5 z-50 w-[380px] max-h-[500px] bg-surface border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shrink-0">
                        <div>
                            <p className="font-semibold text-sm">Trợ lý du lịch</p>
                            <p className="text-xs opacity-80">Vietravel</p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="border-b border-border bg-surface px-4 py-2.5">
                        <Link
                            to="/contact#de-xuat-tour"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2 text-xs font-semibold text-primary no-underline transition-colors duration-150 hover:bg-primary-100"
                        >
                            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                            Muốn một tour riêng? Tạo đề xuất với AI
                        </Link>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background min-h-[200px] max-h-[350px]">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                        msg.role === "user"
                                            ? "bg-primary text-white rounded-br-md"
                                            : "bg-surface border border-border text-foreground rounded-bl-md"
                                    }`}
                                >
                                    {msg.content}
                                    {msg.sources?.length > 0 && (
                                        <div className="mt-1.5 pt-1.5 border-t border-border/50 text-[11px] text-muted">
                                            📌 {msg.sources.map((s) => s.tourName).join(" · ")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-surface border border-border px-4 py-2.5 rounded-2xl rounded-bl-md">
                                    <span className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" />
                                    </span>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-border p-3 flex gap-2 shrink-0 bg-surface">
                        <input
                            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="Hỏi về tour du lịch..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            disabled={loading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="bg-primary hover:bg-primary-dark text-white px-3.5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                            Gửi
                        </button>
                    </div>
                </div>
            )}

            {/* --- Nút bấm --- */}
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="fixed bottom-5 right-5 z-50 bg-primary hover:bg-primary-dark text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer"
                title="Chat với trợ lý du lịch"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>
        </>
    );
}