import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { getBookingDetail, approveRefund, rejectCancelRequest } from "../bookings.api";
import BookingHeader from "./BookingHeader";
import TourInfoSection from "./TourInfoSection";
import CustomerSection from "./CustomerSection";
import PassengersSection from "./PassengersSection";
import TotalPriceCard from "./TotalPriceCard";
import ActivityHistory from "./ActivityHistory";
import InvoiceModal from "./InvoiceModal";
import AdminRefundModal from "./AdminRefundModal";
import { buildPriceRows } from "./detailFormat";
import { useToast } from "../../../../context/ToastContext";

function DetailSkeleton() {
    return (
        <div className="space-y-5" aria-hidden="true">
            <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <div className="h-56 animate-pulse rounded-2xl bg-slate-200/70" />
                    <div className="h-56 animate-pulse rounded-2xl bg-slate-200/70" />
                </div>
                <div className="space-y-5">
                    <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />
                    <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />
                </div>
            </div>
        </div>
    );
}

export default function AdminBookingDetail() {
    const toast = useToast();
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [processingRefund, setProcessingRefund] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await getBookingDetail(id);
                if (!active) return;
                if (res?.success) {
                    setBooking(res.data);
                } else {
                    setError(res?.message || "Không thể tải thông tin booking.");
                }
            } catch (err) {
                if (active) setError(err?.message || "Lỗi kết nối đến server.");
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [id, reloadKey]);

    // Đóng modal hóa đơn bằng phím Escape.
    useEffect(() => {
        if (!invoiceOpen && !refundModalOpen) return undefined;
        const onKey = (event) => {
            if (event.key === "Escape") {
                setInvoiceOpen(false);
                setRefundModalOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [invoiceOpen, refundModalOpen]);

    const handleApproveRefund = async (amount) => {
        setProcessingRefund(true);
        try {
            const res = await approveRefund(id, { refundAmount: amount });
            if (res?.success) {
                toast?.success ? toast.success("Đã phê duyệt hoàn tiền và hủy đơn thành công!") : alert("Đã phê duyệt hoàn tiền!");
                setRefundModalOpen(false);
                setReloadKey((k) => k + 1);
            } else {
                toast?.danger ? toast.danger(res?.message || "Không thể duyệt hoàn tiền") : alert(res?.message || "Lỗi duyệt hoàn tiền");
            }
        } catch (err) {
            toast?.danger ? toast.danger(err?.message || "Lỗi kết nối server") : alert(err?.message || "Lỗi kết nối server");
        } finally {
            setProcessingRefund(false);
        }
    };

    const handleRejectCancel = async () => {
        setProcessingRefund(true);
        try {
            const res = await rejectCancelRequest(id);
            if (res?.success) {
                toast?.success ? toast.success("Đã từ chối yêu cầu hủy. Booking giữ nguyên trạng thái xác nhận.") : alert("Đã từ chối yêu cầu hủy");
                setRefundModalOpen(false);
                setReloadKey((k) => k + 1);
            } else {
                toast?.danger ? toast.danger(res?.message || "Không thể từ chối yêu cầu") : alert(res?.message || "Lỗi từ chối");
            }
        } catch (err) {
            toast?.danger ? toast.danger(err?.message || "Lỗi kết nối server") : alert(err?.message || "Lỗi kết nối server");
        } finally {
            setProcessingRefund(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-5">
                <DetailSkeleton />
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="space-y-4">
                <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
                >
                    <span>{error || "Không tìm thấy booking."}</span>
                    <button
                        type="button"
                        onClick={() => setReloadKey((key) => key + 1)}
                        className="cursor-pointer rounded-lg border border-danger/40 px-3 py-1 font-semibold transition-colors hover:bg-danger hover:text-white"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    const { rows, total } = buildPriceRows(booking);

    return (
        <div className="space-y-5">
            <BookingHeader booking={booking} />


            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <TourInfoSection booking={booking} />
                    <CustomerSection booking={booking} />
                    <PassengersSection passengers={booking.passengers} />
                </div>

                <div className="space-y-5">
                    <div className="flex justify-end gap-2">
                        {booking.status === "cancel_requested" && (
                            <button
                                type="button"
                                onClick={() => setRefundModalOpen(true)}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none"
                            >
                                <i className="fa-solid fa-file-invoice-dollar" />
                                Xử lý hoàn tiền
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setInvoiceOpen(true)}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <Printer className="h-4 w-4" aria-hidden="true" />
                            In hóa đơn
                        </button>
                    </div>

                    <TotalPriceCard booking={booking} rows={rows} total={total} />
                    <ActivityHistory events={booking.history} />
                </div>
            </div>

            <InvoiceModal
                booking={booking}
                open={invoiceOpen}
                rows={rows}
                total={total}
                onClose={() => setInvoiceOpen(false)}
            />

            <AdminRefundModal
                booking={booking}
                open={refundModalOpen}
                processing={processingRefund}
                onClose={() => setRefundModalOpen(false)}
                onApprove={handleApproveRefund}
                onReject={handleRejectCancel}
            />
        </div>
    );
}
