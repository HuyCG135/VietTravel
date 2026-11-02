import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createBooking, createPaymentUrl } from "../bookings/booking.api.js";
import BookingSteps from "./BookingSteps.jsx";
import ContactInfoForm from "./ContactInfoForm.jsx";
import BookingDetailsForm from "./BookingDetailsForm.jsx";
import PassengerForms from "./PassengerForms.jsx";
import BookingSummaryCard from "./BookingSummaryCard.jsx";
import useBookingForm from "./useBookingForm.js";
import { getTotalPrice, formatVnd } from "./bookingPrices.js";

const getContactPrefill = (user) => ({
    name: user?.fullname || "",
    phone: user?.phone || "",
    email: user?.email || "",
});

export default function BookingFlow({ user, tour }) {
    const departures = tour.departures || [];
    const contactPrefill = useMemo(() => getContactPrefill(user), [user]);
    const canBook = user?.role === "customer";
    const [paymentType, setPaymentType] = useState("full");
    const [success, setSuccess] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const successTitleRef = useRef(null);

    useEffect(() => {
        if (success) successTitleRef.current?.focus();
    }, [success]);

    const goPay = async (bookingId, typeToPay = paymentType) => {
        if (submitting) return;
        setSubmitting(true);
        setSubmitError("");
        try {
            const pay = await createPaymentUrl(bookingId, typeToPay);
            if (!pay?.success || !pay?.vnpayUrl) {
                throw new Error(pay?.message || "Không tạo được liên kết thanh toán");
            }
            window.location.href = pay.vnpayUrl;
            return;
        } catch (err) {
            setSubmitError(err.message || "Đã xảy ra lỗi khi tạo liên kết thanh toán");
            setSubmitting(false);
        }
    };

    const form = useBookingForm(tour, departures, contactPrefill, async (payload) => {
        setSubmitting(true);
        setSubmitError("");
        try {
            const created = await createBooking(payload);
            if (!created?.success) {
                throw new Error(created?.message || "Không tạo được đơn đặt tour. Vui lòng thử lại.");
            }
            const bookingId = created.data?.id;
            setSuccess({
                code: `#MB${bookingId}`,
                pax: payload.adults + payload.children,
                total: getTotalPrice(
                    tour,
                    departures.find((d) => d.id === payload.departure_id) || null,
                    payload.adults,
                    payload.children,
                ),
                deposit_amount: created.data?.deposit_amount || Math.round((total * 30) / 100),
                remaining_amount: created.data?.remaining_amount || (total - Math.round((total * 30) / 100)),
                payment_type: paymentType,
                contact_name: payload.contact_name,
                bookingId,
            });
            // KHÔNG tự chuyển sang thanh toán — hiện màn hình ghi nhận đơn, để người dùng tự chọn
            // "Thanh toán ngay" hoặc thanh toán sau.
        } catch (err) {
            setSubmitError(err.message || "Đã xảy ra lỗi khi đặt tour. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    });

    const {
        state,
        departure,
        unitPrices,
        total,
        paxCount,
        maxAdults,
        maxChildren,
        setContact,
        setDeparture,
        setAdults,
        setChildren,
        setPassenger,
        markTouched,
        handleSubmit,
        fieldError,
    } = form;

    const depositAllowed = useMemo(() => {
        if (!departure?.departure_date) return false;
        const depTime = new Date(departure.departure_date + "T00:00:00").getTime();
        const nowTime = new Date().setHours(0, 0, 0, 0);
        const days = Math.round((depTime - nowTime) / (24 * 60 * 60 * 1000));
        return days >= 10;
    }, [departure]);

    const depositAmount = useMemo(() => Math.round((total * 30) / 100), [total]);
    const remainingAmount = useMemo(() => total - depositAmount, [total, depositAmount]);

    // Nếu không cho phép cọc (sát ngày), tự reset về thanh toán full
    useEffect(() => {
        if (!depositAllowed && paymentType === "deposit") {
            setPaymentType("full");
        }
    }, [depositAllowed, paymentType]);

    const { contact, departureId, adults, children, passengers } = state;
    const showForm = !canBook || (canBook && !success && departures.length > 0);

    return (
        <div className="pb-32 lg:pb-16">
            <BookingSteps tourName={tour.name} currentStep={success ? 2 : 1} />
            <main className="max-w-7xl mx-auto px-6">
                {canBook && success && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="max-w-2xl mx-auto mt-8 rounded-3xl border border-success/30 bg-surface p-8 sm:p-10 shadow-[0_2px_10px_rgba(30,41,59,0.05)] text-center"
                    >
                        <span className="mx-auto flex w-16 h-16 items-center justify-center rounded-full bg-success/10 text-success text-2xl">
                            <i className="fa-solid fa-circle-check" />
                        </span>
                        <h2 ref={successTitleRef} tabIndex={-1} className="mt-5 text-2xl font-extrabold text-foreground outline-none">
                            Đặt tour ghi nhận thành công
                        </h2>
                        <p className="mt-2 text-muted">
                            Đơn <strong className="text-foreground">{success.code}</strong> cho{" "}
                            <strong className="text-foreground">{success.pax} hành khách</strong> đã được ghi nhận.
                        </p>
                        <p className="mt-1 text-muted">
                            Bước tiếp theo: hoàn tất thanh toán để xác nhận chỗ của {success.contact_name}.
                        </p>
                        <div className="mt-4 p-4 rounded-2xl bg-primary/5 inline-block text-center min-w-[280px]">
                            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
                                {success.payment_type === "deposit" ? "Số tiền cọc cần thanh toán (30%)" : "Tổng tiền thanh toán (100%)"}
                            </span>
                            <p className="mt-1 text-2xl font-black text-rose-600">
                                {formatVnd(success.payment_type === "deposit" ? success.deposit_amount : success.total)}
                            </p>
                            {success.payment_type === "deposit" && (
                                <p className="text-xs text-muted mt-1">
                                    Còn lại <b>{formatVnd(success.remaining_amount)}</b> thanh toán trước khi khởi hành 3 ngày
                                </p>
                            )}
                        </div>

                        {submitError && (
                            <div
                                role="alert"
                                className="mt-5 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-left text-sm text-danger"
                            >
                                <i className="fa-regular fa-circle-exclamation mt-0.5" />
                                <span>
                                    Đơn đã ghi nhận nhưng chưa chuyển được đến cổng thanh toán: {submitError}. Bạn có thể
                                    thanh toán lại ngay bên dưới.
                                </span>
                            </div>
                        )}

                        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => goPay(success.bookingId, success.payment_type)}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting ? (
                                    <>
                                        <i className="fa-solid fa-circle-notch fa-spin" />
                                        Đang tạo liên kết thanh toán...
                                    </>
                                ) : (
                                    <>
                                        {success.payment_type === "deposit" ? "Thanh toán cọc ngay" : "Thanh toán ngay"}
                                        <i className="fa-solid fa-arrow-right text-sm" />
                                    </>
                                )}
                            </button>
                            <Link
                                to="/user/bookings"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-bold text-foreground transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                            >
                                Lịch sử đặt tour
                            </Link>
                            <Link
                                to="/tours"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-bold text-foreground transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 no-underline"
                            >
                                Xem các tour khác
                                <i className="fa-solid fa-arrow-right text-sm" />
                            </Link>
                        </div>
                    </div>
                )}

                {!canBook && (
                    <div className="mt-8 flex items-start gap-3 rounded-2xl border border-warning/40 bg-surface p-4 shadow-[0_2px_10px_rgba(30,41,59,0.05)]">
                        <i className="fa-regular fa-circle-exclamation mt-0.5 text-warning" />
                        <div>
                            <p className="font-bold text-foreground">Thông báo quyền hạn</p>
                            <p className="mt-0.5 text-sm text-muted">
                                Chỉ tài khoản khách hàng mới có thể đặt tour. Vui lòng đăng nhập bằng tài khoản khách
                                hàng.
                            </p>
                        </div>
                    </div>
                )}

                {canBook && !success && departures.length === 0 && (
                    <div className="mt-8 flex items-start gap-3 rounded-2xl border border-warning/40 bg-surface p-4 shadow-[0_2px_10px_rgba(30,41,59,0.05)]">
                        <i className="fa-regular fa-calendar-xmark mt-0.5 text-warning" />
                        <div>
                            <p className="font-bold text-foreground">Tour hiện chưa có lịch khởi hành</p>
                            <p className="mt-0.5 text-sm text-muted">
                                Vui lòng quay lại sau. Bạn có thể xem các tour khác ngay bây giờ.
                            </p>
                            <Link
                                to={`/tours/${tour.id}`}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-foreground transition-colors duration-150 hover:bg-slate-50 no-underline"
                            >
                                Về trang tour
                                <i className="fa-solid fa-arrow-right text-xs" />
                            </Link>
                        </div>
                    </div>
                )}

                {showForm && (
                    <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {submitError && (
                            <div
                                role="alert"
                                className="lg:col-span-12 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
                            >
                                <i className="fa-regular fa-circle-exclamation mt-0.5" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        <div className="lg:col-span-7 space-y-5">
                            <ContactInfoForm
                                contact={contact}
                                setContact={setContact}
                                markTouched={markTouched}
                                fieldError={fieldError}
                            />
                            <BookingDetailsForm
                                departures={departures}
                                departureId={departureId}
                                departure={departure}
                                adults={adults}
                                children={children}
                                maxAdults={maxAdults}
                                maxChildren={maxChildren}
                                setDeparture={setDeparture}
                                setAdults={setAdults}
                                setChildren={setChildren}
                                fieldError={fieldError}
                            />
                            <PassengerForms
                                paxCount={paxCount}
                                adults={adults}
                                passengers={passengers}
                                setPassenger={setPassenger}
                                fieldError={fieldError}
                            />
                        </div>

                        <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
                            <BookingSummaryCard
                                tour={tour}
                                departure={departure}
                                adults={adults}
                                children={children}
                                paxCount={paxCount}
                                total={total}
                                unitPrices={unitPrices}
                                canBook={canBook}
                                submitting={submitting}
                                paymentType={paymentType}
                                setPaymentType={setPaymentType}
                                depositAllowed={depositAllowed}
                                depositAmount={depositAmount}
                                remainingAmount={remainingAmount}
                            />
                        </div>

                        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface/95 px-4 py-3 shadow-[0_-2px_10px_rgba(30,41,59,0.08)]">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs text-muted truncate">
                                        {paymentType === "deposit" ? "Tiền cọc (30%)" : "Tổng tiền"}
                                        {departure &&
                                            ` · Khởi hành ${new Date(departure.departure_date + "T00:00:00").toLocaleDateString("vi-VN")}`}
                                    </p>
                                    <p className="text-lg font-extrabold text-primary truncate">
                                        {formatVnd(paymentType === "deposit" ? depositAmount : total)}
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!canBook || submitting}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white transition-colors duration-150 hover:bg-primary-dark cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary"
                                >
                                    {submitting ? (
                                        <>
                                            <i className="fa-solid fa-circle-notch fa-spin" />
                                            Đang đặt chỗ...
                                        </>
                                    ) : (
                                        <>
                                            Đặt chỗ ({paxCount} hành khách)
                                            <i className="fa-solid fa-circle-check text-sm" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}