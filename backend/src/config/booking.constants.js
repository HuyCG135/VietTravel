import "dotenv/config";

// ============ Hằng số nghiệp vụ đặt cọc / thanh toán ============
// Một nguồn duy nhất cho service + job (tránh khai trùng rồi lệch nhau).
// Quy ước thời gian: tính mốc bằng JS rồi truyền Date xuống DB (không dùng NOW() + INTERVAL).
//
// LƯU Ý: KHÔNG còn hạn "24h chưa cọc thì tự hủy". Đơn chưa cọc (pending + unpaid)
// được giữ chỗ cho tới khi user thanh toán hoặc tự hủy / admin hủy.
// Chỉ đơn ĐÃ CỌC mới có hạn trả nốt (balance_due_at) và bị tự hủy khi quá hạn.

// Tỷ lệ cọc mặc định (%)
export const DEPOSIT_PERCENT = 30;

// Hạn trả nốt tối đa sau khi cọc (ngày)
export const BALANCE_DUE_DAYS = 7;

// Hạn trả nốt không được sát ngày khởi hành hơn mức này (ngày)
export const BALANCE_DUE_MARGIN_DAYS = 3;

// Chỉ cho đặt cọc khi còn ít nhất bao nhiêu ngày trước ngày khởi hành
export const MIN_DAYS_FOR_DEPOSIT = 10;

// Thời gian sống của một phiên thanh toán VNPay (phút)
export const PAYMENT_URL_TTL_MINUTES = 30;

// Nhắc trả nốt trước hạn bao nhiêu giờ (job nhắc ở Bước 6)
export const BALANCE_REMINDER_HOURS = 48;

// Số đơn pending + unpaid tối đa mỗi user được giữ cùng lúc
export const MAX_UNPAID_BOOKINGS = 3;
