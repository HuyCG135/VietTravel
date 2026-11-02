const API_URL = import.meta.env.VITE_API_URL || '/api';
import { getToken } from '../../auth/auth.api.js';

const authHeaders = (extra = {}) => ({
    'Authorization': `Bearer ${getToken()}`,
    ...extra,
});

export async function getMyReviews() {
    const res = await fetch(`${API_URL}/reviews/my-reviews`, {
        headers: authHeaders(),
    });
    return res.json();
}

export async function createReview(data) {
    const res = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateReview(id, data) {
    const res = await fetch(`${API_URL}/reviews/${id}`, {
        method: "PUT",
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteReview(id) {
    const res = await fetch(`${API_URL}/reviews/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    return res.json();
}
