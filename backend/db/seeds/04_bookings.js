// Seed booking thực tế (~50 đơn):
// - total_price tính đúng = adults*(price_default + price_moving) + children*(price_child + price_moving_child)
// - created_at trải đều theo tháng và LUÔN trước ngày khởi hành (đặt tour trước khi đi)
// - updated_at = thời điểm xác nhận / thanh toán / hủy (luôn sau created_at)
// - passengers khớp đúng adults + children, đầy đủ tên/giới tính/ngày sinh
// - contact_* lấy từ tài khoản khách hàng thật (một số đơn là khách vãng lai)

const TOTAL_BOOKINGS = 50;
const SEED = 20261020;

// PRNG có seed để chạy lại cho kết quả ổn định.
const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const rng = mulberry32(SEED);
const rand = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const weighted = (pairs) => {
    const total = pairs.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = rng() * total;
    for (const [value, weight] of pairs) {
        if (roll < weight) return value;
        roll -= weight;
    }
    return pairs[pairs.length - 1][0];
};

const now = new Date();
const pad2 = (n) => String(n).padStart(2, "0");

const toDateOnly = (value) => {
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

// ===== Tên người Việt để sinh hành khách =====
const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Trịnh", "Lý", "Đinh", "Tạ", "Cao"];
const MIDDLE_NAMES = ["Văn", "Thị", "Hữu", "Công", "Minh", "Quốc", "Gia", "Hải", "Đức", "Thu", "Ngọc", "Thanh", "Xuân", "Đình"];
const MALE_NAMES = ["An", "Bảo", "Cường", "Dũng", "Đạt", "Hải", "Hùng", "Khánh", "Kiên", "Long", "Minh", "Nam", "Phúc", "Quân", "Sơn", "Thành", "Tuấn", "Trường"];
const FEMALE_NAMES = ["Anh", "Chi", "Hà", "Hương", "Lan", "Linh", "Mai", "Ngọc", "Nhung", "Nhi", "Oanh", "Quỳnh", "Thảo", "Trang", "Trân", "Tuyết", "Vân", "Yến"];

const makeName = (gender) => `${pick(LAST_NAMES)} ${pick(MIDDLE_NAMES)} ${gender === "Nữ" ? pick(FEMALE_NAMES) : pick(MALE_NAMES)}`;

const adultDob = () => {
    const year = now.getFullYear() - rand(20, 62);
    return `${year}-${pad2(rand(1, 12))}-${pad2(rand(1, 28))}`;
};
const childDob = () => {
    const year = now.getFullYear() - rand(3, 14);
    return `${year}-${pad2(rand(1, 12))}-${pad2(rand(1, 28))}`;
};

// Đoán giới tính từ tên (dùng cho người liên hệ lấy từ bảng users, vốn không lưu gender).
const FEMALE_HINTS = ["Thị", "Ngọc", "Linh", "Mai", "Lan", "Trang", "Thảo", "Anh", "Thư", "Hà", "Hương", "Nhung", "Oanh", "Quỳnh", "Trân", "Nhi", "Tuyết", "Vân", "Yến", "Chi"];
const guessGender = (fullname = "") => {
    const parts = fullname.split(" ");
    const last = parts[parts.length - 1];
    if (fullname.includes("Thị") || FEMALE_HINTS.some((hint) => last === hint)) return "Nữ";
    return "Nam";
};

// Khách vãng lai (không gắn tài khoản) nhưng vẫn đủ thông tin liên hệ thật.
const GUESTS = [
    { fullname: "Nguyễn Hữu Thịnh", gender: "Nam", phone: "0938111222", email: "nguyenhuuthinh@gmail.com" },
    { fullname: "Trần Bảo Châu", gender: "Nữ", phone: "0908222333", email: "tranbaochau@gmail.com" },
    { fullname: "Lê Gia Hân", gender: "Nữ", phone: "0977333444", email: "legiahan@gmail.com" },
    { fullname: "Phạm Anh Khoa", gender: "Nam", phone: "0912444555", email: "phamanhkhoa@gmail.com" },
    { fullname: "Hoàng Mỹ Duyên", gender: "Nữ", phone: "0967555666", email: "hoangmyduyen@gmail.com" },
    { fullname: "Vũ Trọng Nghĩa", gender: "Nam", phone: "0903666777", email: "vutrongnghia@gmail.com" },
    { fullname: "Đặng Khánh Ly", gender: "Nữ", phone: "0931777888", email: "dangkhanhly@gmail.com" },
    { fullname: "Bùi Tuấn Anh", gender: "Nam", phone: "0988888999", email: "buituananh@gmail.com" },
];

const NOTES = [
    "Cần phòng gia đình, 2 giường đôi.",
    "Ưu tiên chỗ ngồi gần cửa sổ.",
    "Ăn chay, không dùng hải sản.",
    "Có trẻ nhỏ, cần ghế ngồi an toàn.",
    "Đón tại sân bay lúc 8h sáng.",
    "Yêu cầu xuất hoá đơn công ty.",
    "Người lớn tuổi, đi lại chậm, cần hỗ trợ.",
    "Muốn ở phòng tầng cao, view biển.",
];

export async function seed(knex) {
    const customers = await knex("users")
        .where("role", "customer")
        .select("id", "fullname", "phone", "email");
    if (customers.length === 0) return;

    const departures = (
        await knex("tour_departures as d")
            .join("tours as t", "d.tour_id", "t.id")
            .select(
                "d.id",
                "d.tour_id",
                "d.departure_date",
                "d.price_moving",
                "d.price_moving_child",
                "d.seats_total",
                "d.seats_available",
                "d.status",
                "t.price_default",
                "t.price_child",
            )
            .orderBy("d.departure_date", "asc")
    ).map((d) => ({ ...d, _date: toDateOnly(d.departure_date) }));

    // ===== Sinh mốc created_at trải theo 13 tháng gần nhất (tháng gần đây nhiều đơn hơn) =====
    const createdTargets = [];
    for (let m = 13; m >= 0; m -= 1) {
        const count = m <= 2 ? 6 : m <= 5 ? 4 : m <= 9 ? 3 : 2;
        for (let i = 0; i < count; i += 1) {
            const day = rand(1, 28);
            let created = new Date(now.getFullYear(), now.getMonth() - m, day, rand(8, 21), rand(0, 59), 0);
            if (created > now) created = addDays(now, -rand(1, 10));
            createdTargets.push(created);
        }
    }
    createdTargets.sort((a, b) => a - b);

    const soldByDeparture = new Map();
    const saved = [];

    const remainingOf = (departure) =>
        Math.max(0, Number(departure.seats_available) - (soldByDeparture.get(departure.id) || 0));

    const buildBooking = (created) => {
        const minDeparture = addDays(toDateOnly(created), 5);

        // Chỉ chọn lịch khởi hành còn chỗ và diễn ra sau khi đặt ít nhất 5 ngày.
        const candidates = departures
            .filter((d) => d._date >= minDeparture && remainingOf(d) >= 1)
            .sort((a, b) => a._date - b._date);
        if (candidates.length === 0) return null;

        // Ưu tiên các lịch khởi hành gần nhất để thời gian đặt trước hợp lý.
        const pool = candidates.slice(0, 20);
        for (let i = pool.length - 1; i > 0; i -= 1) {
            const j = rand(0, i);
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        let adults = weighted([[1, 18], [2, 34], [3, 20], [4, 16], [5, 8], [6, 4]]);
        let children = weighted([[0, 55], [1, 24], [2, 15], [3, 6]]);

        let chosen = pool.find((d) => remainingOf(d) >= adults + children);
        if (!chosen) {
            chosen = pool[0];
            const cap = Math.max(1, remainingOf(chosen));
            while (adults + children > cap && (children > 0 || adults > 1)) {
                if (children > 0) children -= 1;
                else adults -= 1;
            }
        }
        if (!chosen || adults < 1 || remainingOf(chosen) < adults + children) return null;

        const status = weighted([
            ["confirmed", 55],
            ["pending", 25],
            ["cancelled", 20],
        ]);
        let paymentStatus;
        if (status === "cancelled") {
            paymentStatus = weighted([["refunded", 55], ["unpaid", 45]]);
        } else if (status === "confirmed") {
            // Đã xác nhận = đã cọc hoặc đã trả đủ (không còn "confirmed + unpaid")
            paymentStatus = weighted([["paid", 80], ["deposit_paid", 20]]);
        } else {
            paymentStatus = "unpaid";
        }

        const fromMember = rng() < 0.85;
        let userId = null;
        let contact;
        if (fromMember) {
            const customer = pick(customers);
            userId = customer.id;
            contact = {
                fullname: customer.fullname,
                gender: guessGender(customer.fullname),
                phone: customer.phone,
                email: customer.email,
            };
        } else {
            const guest = pick(GUESTS);
            contact = { ...guest };
        }

        const totalPrice =
            adults * (Number(chosen.price_default) + Number(chosen.price_moving)) +
            children * (Number(chosen.price_child) + Number(chosen.price_moving_child));

        // Snapshot cọc 30% giống nghiệp vụ thật (hằng số sẽ gom về booking.constants.js sau).
        const depositPercent = 30;
        const depositAmount = Math.round((totalPrice * depositPercent) / 100);
        let paidAmount = 0;
        if (paymentStatus === "paid") paidAmount = totalPrice;
        else if (paymentStatus === "deposit_paid") paidAmount = depositAmount;

        // Đơn đã cọc: để hạn trả nốt ở tương lai, tránh bị sweep hủy ngay khi demo.
        const balanceDueAt = paymentStatus === "deposit_paid" ? addDays(now, rand(2, 6)) : null;

        let updated = new Date(created);
        if (status === "confirmed") updated = addDays(created, rand(1, 4));
        else if (status === "cancelled") updated = addDays(created, rand(3, 25));
        if (updated > now) updated = new Date(now);

        const contactDob = adultDob();

        // Đơn hủy: ghi lý do + thời điểm để UI/admin phân biệt (không dùng payment_status='cancelled').
        const cancelledAt = status === "cancelled" ? updated : null;
        const cancelReason = status === "cancelled" ? pick(["user", "admin"]) : null;

        soldByDeparture.set(
            chosen.id,
            (soldByDeparture.get(chosen.id) || 0) + (status === "cancelled" ? 0 : adults + children),
        );

        return {
            user_id: userId,
            departure_id: chosen.id,
            adults,
            children,
            total_price: totalPrice,
            deposit_percent: depositPercent,
            deposit_amount: depositAmount,
            paid_amount: paidAmount,
            balance_due_at: balanceDueAt,
            seats_held: status !== "cancelled" && (paymentStatus === "deposit_paid" || paymentStatus === "paid"),
            payment_status: paymentStatus,
            status,
            cancel_reason: cancelReason,
            cancelled_at: cancelledAt,
            contact_name: contact.fullname,
            contact_phone: contact.phone,
            contact_email: contact.email,
            contact_dob: contactDob,
            contact_gender: contact.gender,
            note: rng() < 0.3 ? pick(NOTES) : null,
            created_at: created,
            updated_at: updated,
        };
    };

    for (const created of createdTargets) {
        if (saved.length >= TOTAL_BOOKINGS) break;
        const booking = buildBooking(created);
        if (booking) saved.push(booking);
    }

    // Bù thêm nếu thiếu đơn do ràng buộc chỗ ngồi.
    let guard = 0;
    while (saved.length < TOTAL_BOOKINGS && guard < 200) {
        guard += 1;
        const created = addDays(now, -rand(2, 60));
        const booking = buildBooking(created);
        if (booking) saved.push(booking);
    }

    const passengerRows = [];
    const paymentRows = [];
    for (const booking of saved) {
        const [id] = await knex("bookings").insert({
            user_id: booking.user_id,
            departure_id: booking.departure_id,
            adults: booking.adults,
            children: booking.children,
            total_price: booking.total_price,
            deposit_percent: booking.deposit_percent,
            deposit_amount: booking.deposit_amount,
            paid_amount: booking.paid_amount,
            balance_due_at: booking.balance_due_at,
            seats_held: booking.seats_held,
            payment_status: booking.payment_status,
            status: booking.status,
            cancel_reason: booking.cancel_reason,
            cancelled_at: booking.cancelled_at,
            contact_name: booking.contact_name,
            contact_phone: booking.contact_phone,
            contact_email: booking.contact_email,
            contact_dob: booking.contact_dob,
            contact_gender: booking.contact_gender,
            note: booking.note,
            created_at: booking.created_at,
            updated_at: booking.updated_at,
        });

        // Seed giao dịch mẫu vào booking_payments cho các đơn đã cọc hoặc đã trả đủ
        if (booking.payment_status === "deposit_paid") {
            paymentRows.push({
                booking_id: id,
                type: "deposit",
                amount: booking.deposit_amount,
                status: "paid",
                txn_ref: `BOK${id}_DEP_SEED_${Math.floor(booking.created_at.getTime() / 1000)}`,
                provider_txn_no: `VNP${rand(10000000, 99999999)}`,
                provider_response: JSON.stringify({ vnp_ResponseCode: "00", vnp_BankCode: "NCB" }),
                requested_at: booking.created_at,
                paid_at: booking.updated_at,
                created_at: booking.created_at,
                updated_at: booking.updated_at,
            });
        } else if (booking.payment_status === "paid") {
            paymentRows.push({
                booking_id: id,
                type: "full",
                amount: booking.paid_amount,
                status: "paid",
                txn_ref: `BOK${id}_FULL_SEED_${Math.floor(booking.created_at.getTime() / 1000)}`,
                provider_txn_no: `VNP${rand(10000000, 99999999)}`,
                provider_response: JSON.stringify({ vnp_ResponseCode: "00", vnp_BankCode: "NCB" }),
                requested_at: booking.created_at,
                paid_at: booking.updated_at,
                created_at: booking.created_at,
                updated_at: booking.updated_at,
            });
        }

        const totalPax = booking.adults + booking.children;
        for (let p = 0; p < totalPax; p += 1) {
            const isAdult = p < booking.adults;
            let fullname;
            let gender;
            let dob;
            if (p === 0) {
                fullname = booking.contact_name;
                gender = booking.contact_gender;
                dob = booking.contact_dob;
            } else {
                gender = rng() < 0.5 ? "Nam" : "Nữ";
                fullname = makeName(gender);
                dob = isAdult ? adultDob() : childDob();
            }
            passengerRows.push({
                booking_id: id,
                fullname,
                gender,
                dob,
                passenger_type: isAdult ? "adult" : "child",
                created_at: booking.created_at,
                updated_at: booking.updated_at,
            });
        }
    }

    if (passengerRows.length > 0) {
        await knex("passengers").insert(passengerRows);
    }

    if (paymentRows.length > 0) {
        await knex("booking_payments").insert(paymentRows);
    }

    // ===== Cập nhật chỗ trống của lịch khởi hành =====
    // Chỉ đơn thực sự giữ ghế (đã cọc / đã trả đủ, chưa hủy) mới chiếm chỗ.
    // Đơn pending + unpaid KHÔNG trừ ghế (khách chưa bắt đầu thanh toán).
    const soldFinal = new Map();
    for (const booking of saved) {
        if (!booking.seats_held) continue;
        soldFinal.set(
            booking.departure_id,
            (soldFinal.get(booking.departure_id) || 0) + booking.adults + booking.children,
        );
    }

    for (const departure of departures) {
        const used = soldFinal.get(departure.id) || 0;
        if (!used) continue;
        const available = Math.max(0, Number(departure.seats_available) - used);
        const patch = { seats_available: available };
        if (available === 0 && departure.status === "open") patch.status = "full";
        await knex("tour_departures").where("id", departure.id).update(patch);
    }
}
