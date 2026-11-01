import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { getToken } from "../features/auth/auth.api";
import MyRequests from "../features/tour-requests/MyRequests";
import ProposalDraftCard from "../features/tour-requests/ProposalDraftCard";
import ProposalForm from "../features/tour-requests/ProposalForm";
import ProposalRefine from "../features/tour-requests/ProposalRefine";
import {
    createTourRequest,
    generateProposal,
} from "../features/tour-requests/tourRequest.api";
import {
    buildRequestData,
    clearStoredProposalDraft,
    EMPTY_REQUEST_FORM,
    readStoredProposalDraft,
    storeProposalDraft,
} from "../features/tour-requests/tourRequestUtils";

const todayStart = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const validateForm = (form) => {
    const errors = {};
    const destination = form.destination.trim();

    if (!destination) {
        errors.destination = "Vui lòng nhập điểm đến.";
    } else if (destination.length > 100) {
        errors.destination = "Điểm đến không được vượt quá 100 ký tự.";
    }

    const duration = Number(form.duration_days);
    if (!Number.isInteger(duration) || duration < 1 || duration > 30) {
        errors.duration_days = "Số ngày phải là số nguyên từ 1 đến 30.";
    }

    if (form.departure_location.trim().length > 100) {
        errors.departure_location = "Điểm khởi hành không được vượt quá 100 ký tự.";
    }

    if (form.expected_start_date) {
        const selected = new Date(`${form.expected_start_date}T00:00:00`);
        if (Number.isNaN(selected.getTime())) {
            errors.expected_start_date = "Ngày dự kiến không hợp lệ.";
        } else if (selected < todayStart()) {
            errors.expected_start_date = "Ngày dự kiến không được ở quá khứ.";
        }
    }

    const adults = Number(form.adults);
    if (!Number.isInteger(adults) || adults < 1 || adults > 20) {
        errors.adults = "Người lớn phải là số nguyên từ 1 đến 20.";
    }

    const children = Number(form.children);
    if (!Number.isInteger(children) || children < 0 || children > 20) {
        errors.children = "Trẻ em phải là số nguyên từ 0 đến 20.";
    }

    if (form.budget_per_person !== "") {
        const budget = Number(form.budget_per_person);
        if (!Number.isFinite(budget) || budget < 0) {
            errors.budget_per_person = "Ngân sách phải là số không âm.";
        }
    }

    if (form.preferences.length > 1000) {
        errors.preferences = "Sở thích/yêu cầu không được vượt quá 1000 ký tự.";
    }

    return errors;
};

function DraftSkeleton() {
    return (
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
                <span className="h-12 w-12 animate-pulse rounded-2xl bg-primary-50" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                </div>
            </div>
            <div className="mt-6 space-y-4">
                {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="flex gap-3">
                        <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted">
                <i className="fa-solid fa-wand-magic-sparkles mr-1.5 text-primary" aria-hidden="true" />
                AI đang soạn lịch trình và ước tính chi phí...
            </p>
        </div>
    );
}

export default function Contact() {
    const navigate = useNavigate();
    const toast = useToast();
    const isAuthenticated = Boolean(getToken());

    const [form, setForm] = useState({ ...EMPTY_REQUEST_FORM });
    const [errors, setErrors] = useState({});
    const [draft, setDraft] = useState(null);
    const [sources, setSources] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [feedback, setFeedback] = useState("");
    const [draftFormSnapshot, setDraftFormSnapshot] = useState("");
    const [generating, setGenerating] = useState(false);
    const [refining, setRefining] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [aiError, setAiError] = useState("");
    const [restored, setRestored] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const formSectionRef = useRef(null);
    const draftSectionRef = useRef(null);
    const myRequestsRef = useRef(null);

    useEffect(() => {
        const stored = readStoredProposalDraft();
        if (!stored) return undefined;

        const restoredForm = { ...EMPTY_REQUEST_FORM, ...(stored.form ?? {}) };
        setForm(restoredForm);
        if (stored.draft) setDraft(stored.draft);
        if (Array.isArray(stored.sources)) setSources(stored.sources);
        if (Array.isArray(stored.chatHistory)) setChatHistory(stored.chatHistory);
        setDraftFormSnapshot(
            stored.draftFormSnapshot ??
                JSON.stringify(buildRequestData(restoredForm, [])),
        );
        setRestored(true);
        clearStoredProposalDraft();

        const timer = setTimeout(() => {
            draftSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 350);

        return () => clearTimeout(timer);
    }, []);

    const currentSnapshot = JSON.stringify(buildRequestData(form, []));
    const draftStale = Boolean(
        draft && draftFormSnapshot && currentSnapshot !== draftFormSnapshot,
    );

    const scrollToForm = useCallback(() => {
        formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const saveDraftForLogin = useCallback(() => {
        if (draft) {
            storeProposalDraft({
                form,
                draft,
                sources,
                chatHistory,
                draftFormSnapshot,
            });
        }
        navigate(`/login?redirect=${encodeURIComponent("/contact")}`);
    }, [chatHistory, draft, draftFormSnapshot, form, navigate, sources]);

    const handleChange = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleGenerate = async () => {
        const validation = validateForm(form);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            scrollToForm();
            toast.warning("Vui lòng kiểm tra lại thông tin trước khi gợi ý.");
            return;
        }

        setGenerating(true);
        setAiError("");
        setErrors({});
        setDraft(null);
        setSources([]);
        setChatHistory([]);
        setFeedback("");
        setRestored(false);

        try {
            const res = await generateProposal(buildRequestData(form, []));

            if (!res?.success || !res?.data?.draft) {
                const message = res?.message || "AI chưa tạo được đề xuất. Vui lòng thử lại.";
                setAiError(message);
                toast.error(message);
                return;
            }

            const nextDraft = res.data.draft;
            setDraft(nextDraft);
            setSources(Array.isArray(res.data.sources) ? res.data.sources : []);
            setChatHistory([
                {
                    role: "assistant",
                    content:
                        nextDraft.summary ||
                        `Đã tạo bản nháp cho ${nextDraft.destination || form.destination}. Bạn có thể yêu cầu chỉnh sửa bên dưới.`,
                },
            ]);
            setDraftFormSnapshot(JSON.stringify(buildRequestData(form, [])));
            toast.success("AI đã tạo bản nháp đề xuất.");

            setTimeout(() => {
                draftSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
        } catch {
            const message = "Không thể kết nối đến trợ lý AI. Vui lòng thử lại sau.";
            setAiError(message);
            toast.error(message);
        } finally {
            setGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!draft || !feedback.trim() || refining || submitting) return;

        const validation = validateForm(form);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            scrollToForm();
            toast.warning("Vui lòng kiểm tra lại thông tin trước khi chỉnh sửa.");
            return;
        }

        const text = feedback.trim();
        const historyBefore = chatHistory;
        const historyAfter = [...chatHistory, { role: "user", content: text }];

        setChatHistory(historyAfter);
        setFeedback("");
        setRefining(true);
        setAiError("");

        try {
            const res = await generateProposal({
                ...buildRequestData(form, historyBefore),
                feedback: text,
                previousDraft: draft,
                chat_history: historyBefore,
            });

            if (!res?.success || !res?.data?.draft) {
                const message = res?.message || "AI chưa chỉnh sửa được bản nháp. Vui lòng thử lại.";
                setAiError(message);
                toast.error(message);
                return;
            }

            const nextDraft = res.data.draft;
            setDraft(nextDraft);
            setSources(Array.isArray(res.data.sources) ? res.data.sources : []);
            setChatHistory([
                ...historyAfter,
                {
                    role: "assistant",
                    content: nextDraft.summary || "Đã cập nhật bản nháp theo yêu cầu của bạn.",
                },
            ]);
            setDraftFormSnapshot(JSON.stringify(buildRequestData(form, [])));
            toast.success("AI đã cập nhật bản nháp.");

            setTimeout(() => {
                draftSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
        } catch {
            const message = "Không thể kết nối đến trợ lý AI. Vui lòng thử lại sau.";
            setAiError(message);
            toast.error(message);
        } finally {
            setRefining(false);
        }
    };

    const handleSubmit = async () => {
        if (!draft) {
            toast.warning("Vui lòng tạo bản nháp AI trước khi gửi đề xuất.");
            return;
        }

        const validation = validateForm(form);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            scrollToForm();
            toast.warning("Vui lòng kiểm tra lại thông tin trước khi gửi.");
            return;
        }

        if (draftStale) {
            toast.warning(
                "Thông tin nhu cầu đã thay đổi so với bản nháp. Vui lòng yêu cầu AI chỉnh sửa hoặc tạo lại bản nháp.",
            );
            return;
        }

        if (!isAuthenticated) {
            storeProposalDraft({
                form,
                draft,
                sources,
                chatHistory,
                draftFormSnapshot,
            });
            toast.info("Vui lòng đăng nhập để gửi đề xuất. Bản nháp của bạn đã được lưu.");
            navigate(`/login?redirect=${encodeURIComponent("/contact")}`);
            return;
        }

        setSubmitting(true);
        try {
            const res = await createTourRequest({
                request_data: buildRequestData(form, chatHistory),
                ai_draft: draft,
            });

            if (res?.httpStatus === 401) {
                storeProposalDraft({
                    form,
                    draft,
                    sources,
                    chatHistory,
                    draftFormSnapshot,
                });
                toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                navigate(`/login?redirect=${encodeURIComponent("/contact")}`);
                return;
            }

            if (!res?.success) {
                const message =
                    Array.isArray(res?.errors) && res.errors.length
                        ? res.errors.join(", ")
                        : res?.message || "Không thể gửi đề xuất.";
                toast.error(message);
                return;
            }

            clearStoredProposalDraft();
            setForm({ ...EMPTY_REQUEST_FORM });
            setErrors({});
            setDraft(null);
            setSources([]);
            setChatHistory([]);
            setFeedback("");
            setDraftFormSnapshot("");
            setAiError("");
            setRestored(false);
            setRefreshKey((key) => key + 1);
            toast.success(res.message || "Đã gửi đề xuất tới admin.");

            setTimeout(() => {
                myRequestsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 200);
        } catch {
            toast.error("Không thể kết nối đến máy chủ.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        clearStoredProposalDraft();
        setForm({ ...EMPTY_REQUEST_FORM });
        setErrors({});
        setDraft(null);
        setSources([]);
        setChatHistory([]);
        setFeedback("");
        setDraftFormSnapshot("");
        setAiError("");
        setRestored(false);
        scrollToForm();
    };

    const handleDismissRestored = () => {
        clearStoredProposalDraft();
        setRestored(false);
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-slate-900 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-white/5" />
                <i
                    className="fa-solid fa-plane-departure pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 text-white/10 lg:block"
                    style={{ fontSize: 150 }}
                    aria-hidden="true"
                />

                <div className="relative max-w-3xl">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide">
                        <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                        Trợ lý AI Vietravel
                    </span>
                    <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
                        Tour chưa có? Để AI thiết kế riêng cho bạn
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                        Mô tả điểm đến, số ngày và ngân sách. AI sẽ gợi ý lịch trình, chi phí di chuyển và dịch vụ;
                        admin sẽ duyệt và liên hệ tư vấn trước khi tổ chức.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                        {[
                            "Lịch trình từng ngày",
                            "Ước tính chi phí",
                            "Chat chỉnh sửa với AI",
                            "Admin duyệt đề xuất",
                        ].map((item) => (
                            <span
                                key={item}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"
                            >
                                <i className="fa-solid fa-check text-[10px]" aria-hidden="true" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {restored && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-info/30 bg-info/5 px-4 py-3 text-sm text-info">
                    <span>
                        <i className="fa-solid fa-clock-rotate-left mr-1.5" aria-hidden="true" />
                        Đã khôi phục bản nháp bạn tạo trước khi đăng nhập.
                    </span>
                    <button
                        type="button"
                        onClick={handleDismissRestored}
                        className="font-semibold underline underline-offset-2 hover:text-primary-dark"
                    >
                        Bỏ thông báo
                    </button>
                </div>
            )}

            <div
                id="de-xuat-tour"
                className="mt-6 grid scroll-mt-24 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start"
            >
                <div ref={formSectionRef} className="scroll-mt-24">
                    <ProposalForm
                        form={form}
                        errors={errors}
                        onChange={handleChange}
                        onSubmit={handleGenerate}
                        loading={generating}
                    />
                </div>

                <div ref={draftSectionRef} className="scroll-mt-24">
                    {aiError && (
                        <div className="mb-4 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                            <p className="font-bold">
                                <i className="fa-solid fa-circle-exclamation mr-1.5" aria-hidden="true" />
                                Chưa thể tạo đề xuất
                            </p>
                            <p className="mt-1 leading-relaxed">{aiError}</p>
                            <p className="mt-1 text-xs text-muted">
                                Nếu bạn đang chạy local, hãy chắc chắn Ollama đã được bật.
                            </p>
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={generating}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white transition-colors duration-150 hover:bg-danger/90 disabled:opacity-50"
                            >
                                <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                                Thử lại
                            </button>
                        </div>
                    )}

                    {generating ? (
                        <DraftSkeleton />
                    ) : draft ? (
                        <div>
                            {draftStale && (
                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                                    <span className="flex items-start gap-2">
                                        <i className="fa-solid fa-triangle-exclamation mt-0.5" aria-hidden="true" />
                                        Thông tin nhu cầu đã thay đổi so với bản nháp. Hãy yêu cầu AI chỉnh sửa
                                        hoặc tạo lại bản nháp trước khi gửi.
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="font-semibold underline underline-offset-2 hover:text-warning/80 disabled:opacity-50"
                                    >
                                        Tạo lại bản nháp
                                    </button>
                                </div>
                            )}

                            <ProposalDraftCard draft={draft} />

                            {sources.length > 0 && (
                                <p className="mt-3 text-xs leading-relaxed text-muted">
                                    <i className="fa-solid fa-book-open mr-1 text-primary" aria-hidden="true" />
                                    Tham khảo từ tour:{" "}
                                    {sources
                                        .map((source) => source.tourName)
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            )}

                            <ProposalRefine
                                chatHistory={chatHistory}
                                feedback={feedback}
                                onFeedbackChange={setFeedback}
                                onRefine={handleRefine}
                                onSubmit={handleSubmit}
                                refining={refining}
                                submitting={submitting}
                                canSubmit={Boolean(draft) && !draftStale}
                                isAuthenticated={isAuthenticated}
                                onReset={handleReset}
                            />
                        </div>
                    ) : (
                        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface p-8 text-center">
                            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-2xl text-primary">
                                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                            </span>
                            <h3 className="mt-4 text-base font-bold text-foreground">
                                Bản nháp AI sẽ xuất hiện ở đây
                            </h3>
                            <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
                                Điền thông tin bên trái và bấm &quot;Gợi ý lịch trình bằng AI&quot;. Bạn có thể xem
                                lịch trình, chi phí và yêu cầu chỉnh sửa trước khi gửi admin.
                            </p>
                            <ul className="mt-5 grid gap-2 text-left text-sm text-muted">
                                {[
                                    "Lịch trình chi tiết từng ngày",
                                    "Chi phí di chuyển, lưu trú, ăn uống",
                                    "Gợi ý dịch vụ và điểm nổi bật",
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <i className="fa-solid fa-circle-check text-success" aria-hidden="true" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div ref={myRequestsRef} className="mt-10 scroll-mt-24">
                <MyRequests
                    isAuthenticated={isAuthenticated}
                    refreshKey={refreshKey}
                    onLogin={saveDraftForLogin}
                    onCreate={scrollToForm}
                />
            </div>

            <section className="mt-10 grid gap-4 sm:grid-cols-3">
                <a
                    href="tel:1900xxxx"
                    className="rounded-2xl border border-border bg-surface p-5 no-underline transition-colors duration-150 hover:border-primary/40"
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                        <i className="fa-solid fa-phone" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-foreground">Hotline</p>
                    <p className="mt-0.5 text-sm text-muted">1900 xxxx</p>
                </a>
                <a
                    href="mailto:info@vietravel.vn"
                    className="rounded-2xl border border-border bg-surface p-5 no-underline transition-colors duration-150 hover:border-primary/40"
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                        <i className="fa-solid fa-envelope" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-foreground">Email</p>
                    <p className="mt-0.5 text-sm text-muted">info@vietravel.vn</p>
                </a>
                <div className="rounded-2xl border border-border bg-surface p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                        <i className="fa-solid fa-location-dot" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-foreground">Văn phòng</p>
                    <p className="mt-0.5 text-sm text-muted">TP. Hồ Chí Minh</p>
                </div>
            </section>
        </div>
    );
}
