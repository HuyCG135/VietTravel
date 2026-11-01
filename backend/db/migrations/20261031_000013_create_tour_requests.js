export function up(knex) {
    return knex.schema.createTable("tour_requests", (t) => {
        t.increments("id");
        t.integer("user_id").unsigned().nullable();
        t.string("title", 255).notNullable();
        t.string("destination", 100).notNullable();
        t.string("region", 100).nullable();
        t.string("duration", 100).nullable();
        t.string("departure_location", 100).nullable();
        t.date("expected_start_date").nullable();
        t.integer("adults").notNullable().defaultTo(1);
        t.integer("children").notNullable().defaultTo(0);
        t.decimal("budget_per_person", 12, 2).nullable();
        t.decimal("total_estimate", 12, 2).notNullable().defaultTo(0);
        t.enu("status", ["pending", "reviewing", "approved", "rejected"])
            .notNullable()
            .defaultTo("pending");
        t.text("admin_note").nullable();
        t.integer("reviewed_by").unsigned().nullable();
        t.timestamp("reviewed_at").nullable();
        t.json("request_data").nullable();
        t.json("ai_draft").nullable();
        t.timestamp("created_at").defaultTo(knex.fn.now());
        t.timestamp("updated_at").defaultTo(knex.fn.now());
        t.foreign("user_id").references("users.id").onDelete("SET NULL");
        t.foreign("reviewed_by").references("users.id").onDelete("SET NULL");
        t.index(["status", "created_at"], "idx_tour_requests_status_created");
        t.index(["user_id", "created_at"], "idx_tour_requests_user_created");
    });
}

export function down(knex) {
    return knex.schema.dropTableIfExists("tour_requests");
}
