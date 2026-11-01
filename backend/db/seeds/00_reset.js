export async function seed(knex) {
    // Order matters for FK
    const tables = [
        "tour_requests",
        "wishlist",
        "reviews",
        "booking_payments",
        "passengers",
        "bookings",
        "tour_services",
        "services",
        "tour_departures",
        "tour_itineraries",
        "tour_images",
        "tours",
        "users",
    ];

    for (const table of tables) {
        await knex(table).del();
    }

    // Reset AUTO_INCREMENT để id bắt đầu lại từ 1 => DB "sạch" đúng nghĩa.
    for (const table of tables) {
        await knex.raw(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
    }
}
