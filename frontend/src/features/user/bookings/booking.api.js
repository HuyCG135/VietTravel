const API_URL = import.meta.env.VITE_API_URL || '/api';
import { getToken } from '../../auth/auth.api.js';

const authHeaders = (extra = {}) => ({
    'Authorization': `Bearer ${getToken()}`,
    ...extra,
});

export async function createBooking(data) {
    const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function createPaymentUrl(bookingId, type = null) {
    const res = await fetch(`${API_URL}/bookings/create-payment-url`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ booking_id: bookingId, ...(type ? { type } : {}) }),
    });
    return res.json();
}

export async function getMyBookings() {
    const res = await fetch(`${API_URL}/bookings/my-bookings`, {
        headers: authHeaders(),
    });
    return res.json();
}

export async function getBookingDetail(id) {
    const res = await fetch(`${API_URL}/bookings/${id}`, {
        headers: authHeaders(),
    });
    return res.json();
}

export async function getBookingRefundInfo(id) {
    const res = await fetch(`${API_URL}/bookings/${id}/refund-info`, {
        headers: authHeaders(),
    });
    return res.json();
}

export async function cancelBooking(id) {
    const res = await fetch(`${API_URL}/bookings/${id}/cancel`, {
        method: "PUT",
        headers: authHeaders(),
    });
    return res.json();
}

export async function getPaymentSummary(bookingId, token) {
    const res = await fetch(`${API_URL}/bookings/payment-summary/${bookingId}?token=${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({ success: false, message: "Phản hồi không hợp lệ" }));
    return { ...data, statusCode: res.status };
}

export async function payLater(bookingId, token) {
    const res = await fetch(`${API_URL}/bookings/pay-later`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, token }),
    });
    const data = await res.json().catch(() => ({ success: false, message: "Phản hồi không hợp lệ" }));
    return { ...data, statusCode: res.status };
}
