import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../../../../components/Loading";
import { useToast } from "../../../../context/ToastContext";
import { getBookingDetail, cancelBooking, createPaymentUrl } from "../booking.api";
import { getMyReviews, createReview } from "../../reviews/review.api";
import BookingHeader from "./BookingHeader";
import TourInfoSection from "./TourInfoSection";
import ContactSection from "./ContactSection";
import PassengersTable from "./PassengersTable";
import PaymentSummary from "./PaymentSummary";
import CancelModal from "./CancelModal";
import InvoiceModal from "./InvoiceModal";
import ReviewModal from "./ReviewModal";

const toNum = (v) => Number(v) || 0;

export default function BookingDetail() {
    const toast = useToast();
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await getBookingDetail(id);
                if (res?.success) {
                    setBooking(res.data);
                    // Kiểm tra xem user đã từng đánh giá tour này chưa
                    try {
                        const reviewsRes = await getMyReviews();
                        if (reviewsRes?.success && Array.isArray(reviewsRes.data)) {
                            const found = reviewsRes.data.some(
                                (r) => String(r.tour_id) === String(res.data.tour_id)
                            );
                            setHasReviewed(found);
                        }
                    } catch {
                        // ignore error checking reviews
                    }
                } else {
                    setError(res?.message || "Không thể tải thông tin đặt chỗ");
                }
            } catch (err) {
                setError(err?.message || "Lỗi kết nối đến server");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    useEffect(() => {
        if (!invoiceOpen && !cancelOpen && !reviewOpen) return;
        const onKey = (e) => {
            if (e.key === "Escape") {
                setInvoiceOpen(false);
                setCancelOpen(false);
                setReviewOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [invoiceOpen, cancelOpen, reviewOpen]);

    const handlePay = async () => {
        setPaying(true);
        try {
            const res = await createPaymentUrl(id);
            if (res.success && res.vnpayUrl) {
                window.location.href = res.vnpayUrl;
                return;
            }
            toast.danger(res?.message || "Không tạo được liên kết thanh toán");
        } catch {
            toast.danger("Lỗi kết nối đến server");
        }
        setPaying(false);
    };

    const confirmCancel = async () => {
        setCancelling(true);
        try {
            const res = await cancelBooking(id);
            if (res?.success) {
                toast.success(res.message || "Đã gửi yêu cầu hủy booking");
                setBooking((b) => (b ? { ...b, status: "cancelled" } : b));
                setCancelOpen(false);
            } else {
                toast.danger(res?.message || "Không thể hủy booking");
            }
        } catch (err) {
            toast.danger(err?.message || "Lỗi kết nối đến server");
        } finally {
            setCancelling(false);
        }
    };

    const handleCreateReview = async (rating, comment) => {
        if (!booking?.tour_id) {
            toast.danger("Không tìm thấy thông tin tour để đánh giá");
            return;
        }
        setSubmittingReview(true);
        try {
            const res = await createReview({
                tour_id: Number(booking.tour_id),
                rating,
                comment,
            });
            if (res?.success) {
                toast.success(res.message || "Đánh giá tour thành công!");
                setHasReviewed(true);
                setReviewOpen(false);
            } else {
                toast.danger(res?.message || "Không thể gửi đánh giá");
            }
        } catch (err) {
            toast.danger(err?.message || "Lỗi kết nối đến server");
        } finally {
            setSubmittingReview(false);
        }
    };

    const b = booking;

    const adults = toNum(b?.adults);
    const children = toNum(b?.children);
    const unitAdult = toNum(b?.price_default) + toNum(b?.price_moving);
    const unitChild = toNum(b?.price_child) + toNum(b?.price_moving_child);

    let priceRows = [];
    if (adults > 0) {
        priceRows.push({ label: `Người lớn × ${adults}`, qty: adults, unit: unitAdult, amount: unitAdult * adults });
    }
    if (children > 0) {
        priceRows.push({ label: `Trẻ em × ${children}`, qty: children, unit: unitChild, amount: unitChild * children });
    }
    if (priceRows.length === 0) {
        priceRows = [{ label: "Giá tour", qty: 1, unit: toNum(b?.total_price), amount: toNum(b?.total_price) }];
    }

    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const isCompleted =
        b?.status === "confirmed" && b?.payment_status === "paid" && String(b?.departure_date).slice(0, 10) < todayStr;

    const passengers = b?.passengers || [];

    return (
        <div className="space-y-6">
            <Link
                to="/user/bookings"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            >
                <i className="fa-solid fa-chevron-left" />
                Trở về lịch sử đặt tour
            </Link>

            {loading && <Loading />}

            {!loading && error && (
                <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 text-danger px-4 py-3 text-sm"
                >
                    <i className="fa-solid fa-circle-exclamation" />
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && b && (
                <>
                    <BookingHeader
                        booking={b}
                        isCompleted={isCompleted}
                        hasReviewed={hasReviewed}
                        onOpenReview={() => setReviewOpen(true)}
                        onOpenInvoice={() => setInvoiceOpen(true)}
                        onOpenCancel={() => setCancelOpen(true)}
                        onOpenPay={handlePay}
                        paying={paying}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 space-y-5">
                            <TourInfoSection booking={b} adults={adults} children={children} />
                            <ContactSection booking={b} />
                            <PassengersTable passengers={passengers} />
                        </div>

                        <div className="space-y-5">
                            <PaymentSummary booking={b} priceRows={priceRows} />
                        </div>
                    </div>

                    <CancelModal
                        booking={b}
                        open={cancelOpen}
                        cancelling={cancelling}
                        onClose={() => setCancelOpen(false)}
                        onConfirm={confirmCancel}
                    />

                    <InvoiceModal
                        booking={b}
                        open={invoiceOpen}
                        priceRows={priceRows}
                        adults={adults}
                        children={children}
                        onClose={() => setInvoiceOpen(false)}
                    />

                    {reviewOpen && (
                        <ReviewModal
                            tourName={b?.tour_name}
                            saving={submittingReview}
                            onClose={() => setReviewOpen(false)}
                            onSubmit={handleCreateReview}
                        />
                    )}
                </>
            )}
        </div>
    );
}
