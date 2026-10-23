// Nghiệp vụ đặt cọc:
// - bookings: thêm snapshot tiền cọc + trạng thái thanh toán mới "deposit_paid".
// - booking_payments: lịch sử từng lần thanh toán (cọc / phần còn lại / toàn bộ).
export async function up(knex) {
    // 1) Mở rộng trạng thái thanh toán của booking (giữ nguyên các giá trị cũ).
    await knex.raw(
        "ALTER TABLE bookings MODIFY COLUMN payment_status " +
            "ENUM('unpaid','deposit_paid','paid','refunded') NOT NULL DEFAULT 'unpaid'",
    );

    // 2) Snapshot tiền cọc + thông tin hủy (tính tại thời điểm đặt, không tính lại sau này).
    await knex.schema.alterTable("bookings", (t) => {
        t.decimal("deposit_percent", 5, 2).notNullable().defaultTo(0).after("total_price");
        t.decimal("deposit_amount", 12, 2).notNullable().defaultTo(0).after("deposit_percent");
        t.decimal("paid_amount", 12, 2).notNullable().defaultTo(0).after("deposit_amount");
        t.datetime("balance_due_at").nullable().after("paid_amount");

        t.enu("cancel_reason", ["deposit_expired", "balance_expired", "user", "admin"])
            .nullable()
            .after("status");
        t.datetime("cancelled_at").nullable().after("cancel_reason");
    });

    // 3) Lịch sử giao dịch thanh toán.
    //    status: pending -> paid/failed/expired/cancelled.
    //    Không có "refunded": hoàn tiền theo dõi ở cấp booking (bookings.payment_status)
    //    hoặc dùng refunded_at để đánh dấu khoản đã hoàn thủ công.
    await knex.schema.createTable("booking_payments", (t) => {
        t.increments("id");
        t.integer("booking_id").unsigned().notNullable();

        t.enu("type", ["deposit", "balance", "full"]).notNullable();
        t.decimal("amount", 12, 2).notNullable();

        t.enu("status", ["pending", "paid", "failed", "expired", "cancelled"])
            .notNullable()
            .defaultTo("pending");

        // vnp_TxnRef: duy nhất trên mỗi lần tạo URL -> callback trùng tự nhiên idempotent.
        t.string("txn_ref", 80).notNullable().unique();
        t.string("provider_txn_no", 80).nullable();
        t.text("provider_response").nullable();

        t.datetime("requested_at").defaultTo(knex.fn.now());
        t.datetime("expires_at").nullable();
        t.datetime("paid_at").nullable();
        t.datetime("refunded_at").nullable();

        t.datetime("created_at").defaultTo(knex.fn.now());
        t.datetime("updated_at").defaultTo(knex.fn.now());

        // Dữ liệu tiền: không xóa lịch sử giao dịch khi xóa booking.
        t.foreign("booking_id").references("bookings.id").onDelete("RESTRICT");

        t.index(["booking_id", "type", "status"], "idx_booking_payments_booking");
        t.index(["expires_at"], "idx_booking_payments_expires");
    });

    // 4) Backfill đơn cũ: mặc định cọc 30% để UI/admin không hiển thị "còn lại = toàn bộ".
    //    Đơn đã paid: đã thu đủ -> paid_amount = total_price.
    await knex("bookings").update({
        deposit_percent: 30,
        deposit_amount: knex.raw("ROUND(total_price * 30 / 100, 0)"),
    });
    await knex("bookings")
        .where("payment_status", "paid")
        .update({ paid_amount: knex.raw("total_price") });
}

export async function down(knex) {
    // Không thể thu hẹp ENUM khi còn giá trị deposit_paid -> đưa về unpaid trước.
    await knex("bookings").where("payment_status", "deposit_paid").update({ payment_status: "unpaid" });

    await knex.schema.dropTableIfExists("booking_payments");

    await knex.schema.alterTable("bookings", (t) => {
        t.dropColumn("cancelled_at");
        t.dropColumn("cancel_reason");
        t.dropColumn("balance_due_at");
        t.dropColumn("paid_amount");
        t.dropColumn("deposit_amount");
        t.dropColumn("deposit_percent");
    });

    await knex.raw(
        "ALTER TABLE bookings MODIFY COLUMN payment_status " +
            "ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid'",
    );
}
