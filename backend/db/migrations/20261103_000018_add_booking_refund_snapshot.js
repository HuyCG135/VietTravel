// Snapshot hoàn tiền khi khách gửi yêu cầu hủy:
// - refund_penalty_pct: % phạt đã chốt tại thời điểm bấm hủy (mốc thời gian không bị đổi
//   nếu admin duyệt chậm vài ngày).
// - refund_amount: số tiền hoàn dự kiến đã chốt.
// - refund_days_remaining: số ngày còn lại tới khởi hành lúc bấm hủy (hiển thị lại cho admin).
// - refund_method / refund_provider_ref / refund_note / refunded_at: ghi nhận hoàn tiền thủ công.
// Một số cột có thể đã tồn tại trên DB dev (thêm tay trước đó) nên dùng hasColumn để bỏ qua.
export async function up(knex) {
    const columns = [
        [
            "refund_amount",
            (t) => t.decimal("refund_amount", 12, 2).nullable().after("paid_amount"),
        ],
        [
            "refund_penalty_pct",
            (t) => t.decimal("refund_penalty_pct", 5, 2).nullable().after("refund_amount"),
        ],
        [
            "refund_days_remaining",
            (t) => t.integer("refund_days_remaining").nullable().after("refund_penalty_pct"),
        ],
        [
            "refund_method",
            (t) => t.string("refund_method", 50).nullable().after("refund_days_remaining"),
        ],
        [
            "refund_provider_ref",
            (t) => t.string("refund_provider_ref", 100).nullable().after("refund_method"),
        ],
        ["refund_note", (t) => t.text("refund_note").nullable().after("refund_provider_ref")],
        ["refunded_at", (t) => t.datetime("refunded_at").nullable().after("refund_note")],
    ];

    for (const [name, addColumn] of columns) {
        const exists = await knex.schema.hasColumn("bookings", name);
        if (!exists) {
            await knex.schema.alterTable("bookings", addColumn);
        }
    }
}

export async function down(knex) {
    const columns = [
        "refunded_at",
        "refund_note",
        "refund_provider_ref",
        "refund_method",
        "refund_days_remaining",
        "refund_penalty_pct",
        "refund_amount",
    ];

    for (const name of columns) {
        const exists = await knex.schema.hasColumn("bookings", name);
        if (exists) {
            await knex.schema.alterTable("bookings", (t) => t.dropColumn(name));
        }
    }
}
