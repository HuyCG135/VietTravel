// Giữ ghế theo phiên thanh toán (quyết định 2026-11-02):
// - Trước đây ghế bị trừ NGAY lúc tạo đơn → đơn chưa cọc giữ ghế vô thời hạn.
// - Từ nay ghế chỉ bị trừ khi khách BẮT ĐẦU thanh toán (holdSeats) và được nhả khi
//   phiên thanh toán hết hạn / hủy đơn.
// - Cột seats_held cho biết đơn có đang thực sự giữ ghế hay không, để việc nhả ghế
//   là idempotent (gọi nhiều lần không cộng ghế 2 lần).
export async function up(knex) {
    await knex.schema.alterTable("bookings", (t) => {
        t.boolean("seats_held").notNullable().defaultTo(false).after("balance_due_at");
    });

    // Đơn đã cọc / đã trả đủ (còn hiệu lực) chắc chắn đang giữ ghế.
    await knex("bookings")
        .whereNot("status", "cancelled")
        .whereIn("payment_status", ["deposit_paid", "paid"])
        .update({ seats_held: true });

    // Đơn pending + unpaid do code CŨ tạo đã bị trừ ghế lúc đặt.
    // Theo quy tắc mới chúng không được giữ ghế → cộng trả lại theo từng chuyến.
    const stale = await knex("bookings")
        .select("departure_id", knex.raw("SUM(adults + children) AS pax"))
        .where("status", "pending")
        .where("payment_status", "unpaid")
        .where("seats_held", false)
        .groupBy("departure_id");

    for (const row of stale) {
        const pax = Number(row.pax) || 0;
        if (!pax) continue;

        // LEAST(...) để không vượt seats_total nếu dữ liệu cũ đã lệch.
        await knex.raw(
            "UPDATE tour_departures SET seats_available = LEAST(seats_total, seats_available + ?) WHERE id = ?",
            [pax, row.departure_id],
        );
        await knex("tour_departures")
            .where("id", row.departure_id)
            .where("status", "full")
            .where("seats_available", ">", 0)
            .update({ status: "open" });
    }
}

export async function down(knex) {
    // Không thể hoàn tác chính xác số ghế đã nhả ở up() → chỉ bỏ cột.
    await knex.schema.alterTable("bookings", (t) => {
        t.dropColumn("seats_held");
    });
}
