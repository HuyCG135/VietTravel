import TourRequest from "./tourRequest.repository.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const REQUEST_TIMEOUT_MS = Number(process.env.TOUR_PROPOSAL_TIMEOUT_MS || 90_000);

const createHttpError = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

const isPlainObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const toVND = (value) =>
    `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;

const toLocalDate = (value) => {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const dd = String(value.getDate()).padStart(2, "0");
        const mm = String(value.getMonth() + 1).padStart(2, "0");
        return `${dd}/${mm}/${value.getFullYear()}`;
    }
    const text = String(value).slice(0, 10);
    const [year, month, day] = text.split("-");
    if (year && month && day && year.length === 4) return `${day}/${month}/${year}`;
    return text;
};

const truncate = (value, maxLength) => {
    const text = String(value ?? "").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const toNonNegativeNumber = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.round(number);
};

const toStringOrEmpty = (value) =>
    typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

const toStringArray = (value, maxItems = 10) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => toStringOrEmpty(item))
        .filter(Boolean)
        .slice(0, maxItems);
};

const formatToursContext = (tours) => {
    if (!tours.length) {
        return "Không có tour tương tự trong hệ thống. Hãy dùng kiến thức thị trường du lịch Việt Nam để ước tính hợp lý.";
    }

    return tours
        .map((tour) => {
            const lines = [
                `- Tour "${tour.name}" | ${tour.location} | ${tour.region} | ${tour.duration} | giá người lớn ${toVND(tour.price_default)}, trẻ em ${toVND(tour.price_child)}`,
            ];

            const itineraryText = (tour.itineraries || [])
                .map(
                    (day) =>
                        `Ngày ${day.day_number}: ${truncate(day.description, 240)}`,
                )
                .join("; ");
            if (itineraryText) lines.push(`  Lịch trình: ${itineraryText}`);

            const serviceText = (tour.services || [])
                .map((service) => service.name)
                .filter(Boolean)
                .join(", ");
            if (serviceText) lines.push(`  Dịch vụ: ${serviceText}`);

            const departureText = (tour.departures || [])
                .slice(0, 2)
                .map(
                    (departure) =>
                        `${toLocalDate(departure.departure_date)} từ ${departure.departure_location} (phụ thu di chuyển ${toVND(departure.price_moving)})`,
                )
                .join("; ");
            if (departureText) lines.push(`  Chuyến tham khảo: ${departureText}`);

            return lines.join("\n");
        })
        .join("\n");
};

const SYSTEM_PROMPT = `Bạn là chuyên viên thiết kế tour của Vietravel. Nhiệm vụ của bạn là tạo một bản đề xuất tour mới bằng tiếng Việt cho khách hàng.

CHỈ trả về MỘT object JSON hợp lệ. Không dùng markdown, không thêm chữ giải thích bên ngoài JSON.

QUY TẮC BẮT BUỘC:
1. Tất cả giá là VND, số nguyên, không âm. Không dùng dấu chấm/phẩy trong số.
2. Lịch trình phải thực tế, rõ ràng theo từng ngày; không bịa địa điểm không tồn tại.
3. Dùng giá của các tour tham khảo để neo giá. Nếu không có tour tương tự, ước tính theo giá thị trường du lịch Việt Nam.
4. price_breakdown là TỔNG chi phí cho cả đoàn (không phải mỗi người), gồm đúng các khóa: transport, accommodation, meals, tickets, guide, other.
5. price_per_adult và price_per_child là giá mỗi người.
6. total_estimate = price_per_adult * số người lớn + price_per_child * số trẻ em.
7. Tổng các mục trong price_breakdown phải xấp xỉ total_estimate.
8. transport.estimated_cost phải bằng price_breakdown.transport.
9. region chỉ chọn một trong: "Miền Bắc", "Miền Trung", "Miền Nam".
10. notes phải ghi rõ giá là ước tính tham khảo, cần admin xác nhận.
11. Không thêm field ngoài schema.

SCHEMA JSON:
{
  "title": "tên tour đề xuất",
  "destination": "điểm đến",
  "region": "Miền Bắc | Miền Trung | Miền Nam",
  "duration": "VD: 4 ngày 3 đêm",
  "summary": "mô tả ngắn 2-3 câu",
  "highlights": ["điểm nổi bật 1", "điểm nổi bật 2"],
  "itinerary": [
    {
      "day": 1,
      "title": "tiêu đề ngày",
      "activities": ["hoạt động 1", "hoạt động 2"],
      "meals": "VD: Ăn sáng, trưa, tối",
      "accommodation": "VD: Khách sạn 3 sao tại trung tâm"
    }
  ],
  "transport": {
    "method": "VD: Xe khách / Máy bay / Tàu",
    "description": "mô tả di chuyển khứ hồi",
    "estimated_cost": 0
  },
  "price_breakdown": {
    "transport": 0,
    "accommodation": 0,
    "meals": 0,
    "tickets": 0,
    "guide": 0,
    "other": 0
  },
  "price_per_adult": 0,
  "price_per_child": 0,
  "total_estimate": 0,
  "included_services": ["dịch vụ 1", "dịch vụ 2"],
  "notes": "Giá là ước tính tham khảo..."
}`;

const buildUserPrompt = ({ input, feedback, previousDraft, context }) => {
    const lines = [
        "### Nhu cầu khách hàng",
        `- Điểm đến: ${input.destination}`,
        `- Số ngày: ${input.duration_days}`,
        `- Khởi hành từ: ${input.departure_location || "Chưa xác định"}`,
        `- Ngày dự kiến: ${toLocalDate(input.expected_start_date) || "Linh hoạt"}`,
        `- Người lớn: ${input.adults}`,
        `- Trẻ em: ${input.children}`,
        `- Ngân sách dự kiến/người: ${input.budget_per_person ? toVND(input.budget_per_person) : "Không giới hạn"}`,
        `- Sở thích/yêu cầu: ${input.preferences || "Không có"}`,
        "",
        "### Tour tham khảo trong hệ thống",
        context,
    ];

    if (previousDraft) {
        lines.push("", "### Bản nháp trước", JSON.stringify(previousDraft));
    }

    if (feedback) {
        lines.push(
            "",
            "### Yêu cầu chỉnh sửa",
            feedback,
            "",
            "Hãy cập nhật bản nháp theo yêu cầu chỉnh sửa. Giữ nguyên các phần không bị ảnh hưởng và trả lại đầy đủ JSON theo schema.",
        );
    } else {
        lines.push("", "Hãy tạo bản đề xuất tour hoàn chỉnh theo đúng schema JSON ở trên.");
    }

    return lines.join("\n");
};

const parseJsonObject = (raw) => {
    const text = String(raw || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const candidates = [text];
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
        candidates.push(text.slice(start, end + 1));
    }

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (isPlainObject(parsed)) return parsed;
        } catch {
            // thử ứng viên tiếp theo
        }
    }

    return null;
};

const callOllama = async (messages) => {
    let response;
    try {
        response = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages,
                stream: false,
                format: "json",
                options: {
                    temperature: 0.4,
                    num_ctx: 8192,
                    num_predict: 3000,
                },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
            throw createHttpError(
                504,
                "Trợ lý AI phản hồi quá lâu. Vui lòng thử lại sau.",
            );
        }
        throw createHttpError(
            502,
            "Không kết nối được trợ lý AI (Ollama). Vui lòng kiểm tra Docker.",
        );
    }

    if (!response.ok) {
        throw createHttpError(
            502,
            "Trợ lý AI đang bận. Vui lòng thử lại sau ít phút.",
        );
    }

    const data = await response.json();
    return data?.message?.content || "";
};

const normalizeDraft = (raw, input) => {
    const adults = Math.max(1, Number(input.adults) || 1);
    const children = Math.max(0, Number(input.children) || 0);

    const duration =
        toStringOrEmpty(raw.duration) ||
        (Number(input.duration_days) > 1
            ? `${input.duration_days} ngày ${Number(input.duration_days) - 1} đêm`
            : `${input.duration_days || 1} ngày`);

    const rawTransport = isPlainObject(raw.transport) ? raw.transport : {};
    const rawBreakdown = isPlainObject(raw.price_breakdown)
        ? raw.price_breakdown
        : {};

    const priceBreakdown = {
        transport: toNonNegativeNumber(rawBreakdown.transport),
        accommodation: toNonNegativeNumber(rawBreakdown.accommodation),
        meals: toNonNegativeNumber(rawBreakdown.meals),
        tickets: toNonNegativeNumber(rawBreakdown.tickets),
        guide: toNonNegativeNumber(rawBreakdown.guide),
        other: toNonNegativeNumber(rawBreakdown.other),
    };

    const breakdownTotal = Object.values(priceBreakdown).reduce(
        (sum, value) => sum + value,
        0,
    );

    let pricePerAdult = toNonNegativeNumber(raw.price_per_adult);
    let pricePerChild = toNonNegativeNumber(raw.price_per_child);

    if (pricePerAdult <= 0 && Number(input.budget_per_person) > 0) {
        pricePerAdult = toNonNegativeNumber(input.budget_per_person);
    }

    if (pricePerAdult <= 0 && breakdownTotal > 0) {
        pricePerAdult = Math.round(
            breakdownTotal / Math.max(1, adults + children * 0.7),
        );
    }

    if (pricePerChild <= 0 && pricePerAdult > 0) {
        pricePerChild = Math.round(pricePerAdult * 0.7);
    }

    let totalEstimate =
        pricePerAdult * adults + pricePerChild * children;

    if (totalEstimate <= 0 && breakdownTotal > 0) {
        totalEstimate = breakdownTotal;
    }

    // Nếu AI quên breakdown nhưng vẫn có tổng, đưa toàn bộ vào "other"
    // để bảng chi phí không bị trống.
    if (breakdownTotal <= 0 && totalEstimate > 0) {
        priceBreakdown.other = totalEstimate;
    }

    const itinerary = Array.isArray(raw.itinerary)
        ? raw.itinerary
              .slice(0, 30)
              .map((item, index) => {
                  if (typeof item === "string") {
                      return {
                          day: index + 1,
                          title: item.trim(),
                          activities: [],
                          meals: "",
                          accommodation: "",
                      };
                  }

                  if (!isPlainObject(item)) return null;

                  return {
                      day: Number(item.day) || index + 1,
                      title: toStringOrEmpty(item.title),
                      activities: toStringArray(item.activities, 12),
                      meals: toStringOrEmpty(item.meals),
                      accommodation: toStringOrEmpty(item.accommodation),
                  };
              })
              .filter(Boolean)
        : [];

    const notes = toStringOrEmpty(raw.notes);
    const disclaimer =
        "Giá trên là ước tính tham khảo do AI tạo; admin sẽ xác nhận giá và lịch trình chính thức.";

    return {
        title:
            toStringOrEmpty(raw.title) ||
            `${input.destination} ${duration}`.trim(),
        destination: toStringOrEmpty(raw.destination) || input.destination,
        region: toStringOrEmpty(raw.region) || "Miền Nam",
        duration,
        summary: toStringOrEmpty(raw.summary),
        highlights: toStringArray(raw.highlights, 8),
        itinerary,
        transport: {
            method: toStringOrEmpty(rawTransport.method),
            description: toStringOrEmpty(rawTransport.description),
            estimated_cost:
                toNonNegativeNumber(rawTransport.estimated_cost) ||
                priceBreakdown.transport,
        },
        price_breakdown: priceBreakdown,
        price_per_adult: pricePerAdult,
        price_per_child: pricePerChild,
        total_estimate: totalEstimate,
        included_services: toStringArray(raw.included_services, 12),
        notes: notes.includes("tham khảo")
            ? notes
            : `${notes ? `${notes} ` : ""}${disclaimer}`.trim(),
    };
};

export const generateTourProposal = async (input) => {
    const tours = await TourRequest.findSimilarTours({
        destination: input.destination,
        region: input.region,
        limit: 5,
    });

    const context = formatToursContext(tours);
    const baseMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
            role: "user",
            content: buildUserPrompt({
                input,
                feedback: input.feedback,
                previousDraft: input.previousDraft,
                context,
            }),
        },
    ];

    let raw = await callOllama(baseMessages);
    let parsed = parseJsonObject(raw);

    if (!parsed) {
        // Thử một lần nữa: yêu cầu model sửa lại JSON hỏng.
        raw = await callOllama([
            ...baseMessages,
            { role: "assistant", content: raw },
            {
                role: "user",
                content:
                    "JSON trên không hợp lệ. Hãy trả lại đúng một object JSON hợp lệ theo schema, không thêm chữ nào khác.",
            },
        ]);
        parsed = parseJsonObject(raw);
    }

    if (!parsed) {
        throw createHttpError(
            502,
            "AI chưa tạo được đề xuất hợp lệ. Vui lòng thử lại.",
        );
    }

    return {
        draft: normalizeDraft(parsed, input),
        sources: tours.map((tour) => ({
            tourId: tour.id,
            tourName: tour.name,
        })),
        model: OLLAMA_MODEL,
    };
};
