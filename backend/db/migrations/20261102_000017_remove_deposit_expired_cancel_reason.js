// Bỏ giá trị 'deposit_expired' khỏi bookings.cancel_reason.
// Từ 2026-10-31 đã bỏ rule tự hủy đơn chưa cọc (24h) nên lý do này không thể phát sinh;
// giữ lại chỉ gây nhầm lẫn khi đọc enum.
export async function up(knex) {
    await knex.raw(
        "ALTER TABLE bookings MODIFY COLUMN cancel_reason " +
            "ENUM('balance_expired','user','admin') DEFAULT NULL",
    );
}

export async function down(knex) {
    await knex.raw(
        "ALTER TABLE bookings MODIFY COLUMN cancel_reason " +
            "ENUM('deposit_expired','balance_expired','user','admin') DEFAULT NULL",
    );
}
