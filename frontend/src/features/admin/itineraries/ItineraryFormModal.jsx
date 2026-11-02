import { useEffect, useRef, useState } from "react";
import Modal from "../../../components/Modal";
import { getItineraryDetail } from "./itineraries.api";

const inputClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

export default function ItineraryFormModal({ tour, saving, onClose, onSubmit }) {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [rows, setRows] = useState([]);
    const [error, setError] = useState("");
    const nextKey = useRef(1);

    useEffect(() => {
        if (!tour) return;
        let cancelled = false;

        getItineraryDetail(tour.id)
            .then((data) => {
                if (cancelled) return;
                if (!data.success) {
                    setLoadError(data.message || "Không thể tải lịch trình của tour này.");
                    return;
                }
                setRows(
                    (data.data?.itineraries || []).map((item) => ({
                        key: `day-${nextKey.current++}`,
                        day_number: item.day_number,
                        description: item.description || "",
                    })),
                );
            })
            .catch(() => {
                if (!cancelled) setLoadError("Không thể kết nối đến máy chủ.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [tour]);

    const addRow = () => {
        const maxDay = rows.reduce((max, row) => Math.max(max, Number(row.day_number) || 0), 0);
        setRows((prev) => [
            ...prev,
            { key: `day-${nextKey.current++}`, day_number: maxDay + 1, description: "" },
        ]);
    };

    const updateRow = (key, field, value) => {
        setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
    };

    const removeRow = (key) => {
        setRows((prev) => prev.filter((row) => row.key !== key));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (saving || loading) return;

        const seenDays = new Set();
        let firstError = "";

        if (rows.length === 0) {
            firstError = "Thêm ít nhất một ngày cho lịch trình.";
        }

        if (!firstError) {
            for (let index = 0; index < rows.length; index += 1) {
                const row = rows[index];
                const day = Number(row.day_number);
                if (!day || !Number.isInteger(day) || day <= 0) {
                    firstError = `Ngày ở dòng ${index + 1} phải là số nguyên dương.`;
                    break;
                }
                if (seenDays.has(day)) {
                    firstError = `Ngày ${day} bị trùng trong lịch trình.`;
                    break;
                }
                seenDays.add(day);
                if (!row.description.trim()) {
                    firstError = `Nội dung chi tiết ở dòng ${index + 1} đang trống.`;
                    break;
                }
            }
        }

        if (firstError) {
            setError(firstError);
            return;
        }

        onSubmit(
            rows.map((row) => ({
                day_number: Number(row.day_number),
                description: row.description.trim(),
            })),
        );
    };

    return (
        <Modal
            open
            onClose={saving ? undefined : onClose}
            closeOnBackdrop={!saving}
            size="2xl"
            showClose={false}
            ariaLabel="Chỉnh sửa lịch trình"
        >
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h3 id="itinerary-form-title" className="text-lg font-bold text-foreground">
                            Chỉnh sửa lịch trình
                        </h3>
                        <p className="mt-0.5 text-sm text-muted">{tour?.name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Đóng"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-primary-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-xl border border-border bg-primary-50/60 px-4 py-2.5 text-sm">
                    <span className="text-muted">
                        Mã tour: <b className="text-foreground">#{tour?.id}</b>
                    </span>
                    <span className="text-muted">
                        Miền: <b className="text-foreground">{tour?.region || "—"}</b>
                    </span>
                    <span className="text-muted">
                        Thời gian: <b className="text-foreground">{tour?.duration || "—"}</b>
                    </span>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                        <i className="fa-solid fa-circle-exclamation mr-1.5" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status" />
                    </div>
                ) : loadError ? (
                    <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                        <i className="fa-solid fa-circle-exclamation mr-1.5" />
                        {loadError}
                    </div>
                ) : (
                    <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-foreground">
                                <i className="fa-solid fa-route mr-2 text-primary" />
                                Chi tiết từng ngày
                            </h4>
                            <button
                                type="button"
                                onClick={addRow}
                                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-primary/40 px-3 py-1.5 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <i className="fa-solid fa-plus" />
                                Thêm ngày
                            </button>
                        </div>

                        {rows.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border py-10 text-center text-muted">
                                <i className="fa-regular fa-calendar-days mb-2" style={{ fontSize: 28 }} />
                                <p className="text-sm">Chưa có ngày nào — bấm &quot;Thêm ngày&quot; để bắt đầu.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rows.map((row, index) => (
                                    <div key={row.key} className="rounded-xl border border-border bg-surface p-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-24 shrink-0">
                                                <label className={labelClass}>Ngày</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={row.day_number}
                                                    onChange={(e) => updateRow(row.key, "day_number", e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <label className={labelClass}>Nội dung chi tiết</label>
                                                <textarea
                                                    rows={4}
                                                    value={row.description}
                                                    onChange={(e) => updateRow(row.key, "description", e.target.value)}
                                                    placeholder={`Nội dung lịch trình ngày ${row.day_number || index + 1}...`}
                                                    className={`${inputClass} min-h-[90px] resize-y`}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.key)}
                                                title="Xóa ngày này"
                                                aria-label="Xóa ngày này"
                                                className="mt-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors duration-150 hover:border-danger/30 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                                            >
                                                <i className="fa-solid fa-trash" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-sm text-muted">
                        Tổng cộng <b className="text-foreground">{rows.length}</b> ngày
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-slate-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                        >
                            {saving && <i className="fa-solid fa-spinner fa-spin mr-2" />}
                            Lưu lịch trình
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
