import nodemailer from "nodemailer";

const isMailConfigured = () => {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
};

const getTransporter = () => {
    const secure = String(process.env.SMTP_SECURE || "false") === "true";

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const sendVerificationEmail = async ({ email, verifyUrl }) => {
    if (!isMailConfigured()) {
        console.warn(`[MAIL] Chưa cấu hình SMTP. Link xác thực cho ${email}: ${verifyUrl}`);
        return { sent: false };
    }

    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from,
        to: email,
        subject: "Xác thực tài khoản Vietravel",
        html: `
               <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
                    <h2 style="margin-bottom: 8px;">Xác thực tài khoản Vietravel</h2>
                    <p>Cảm ơn bạn đã đăng ký tài khoản Vietravel!</p>
                    <p>Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
                    <a href="${verifyUrl}"
                       style="display: inline-block; padding: 14px 28px; margin: 16px 0;
                              background-color: #2563eb; color: #fff; text-decoration: none;
                              border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Xác thực tài khoản
                    </a>
                    <p style="color: #666; font-size: 14px;">Hoặc copy link sau vào trình duyệt:</p>
                    <p style="font-size: 13px; color: #888; word-break: break-all;">${verifyUrl}</p>
                    <p style="margin-top: 16px; font-size: 13px; color: #999;">
                        Link có hiệu lực trong 2 giờ. Nếu bạn không yêu cầu tạo tài khoản, hãy bỏ qua email này.
                    </p>
               </div>
          `,
    });

    return { sent: true };
};

const sendResetPasswordEmail = async ({ email, resetUrl }) => {
    if (!isMailConfigured()) {
        console.warn(`[MAIL] Chưa cấu hình SMTP. Link reset mật khẩu cho ${email}: ${resetUrl}`);
        return { sent: false };
    }

    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from,
        to: email,
        subject: "Đặt lại mật khẩu Vietravel",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
                <h2 style="margin-bottom: 8px;">Đặt lại mật khẩu Vietravel</h2>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <p>Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
                <a href="${resetUrl}"
                    style="display: inline-block; padding: 14px 28px; margin: 16px 0;
                            background-color: #2563eb; color: #fff; text-decoration: none;
                            border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Đặt lại mật khẩu
                </a>
                <p style="color: #666; font-size: 14px;">Hoặc copy link sau vào trình duyệt:</p>
                <p style="font-size: 13px; color: #888; word-break: break-all;">${resetUrl}</p>
                <p style="margin-top: 16px; font-size: 13px; color: #999;">
                    Link có hiệu lực trong 15 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                </p>
            </div>
        `,
    });

    return { sent: true };
};

const formatVnd = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// ============ Email xác nhận thanh toán ============
// CHỈ gọi sau khi VNPay xác nhận đã thu tiền (cọc / trả đủ / trả nốt).
// Fail-soft: không ném lỗi ra ngoài để không làm hỏng giao dịch đã thu tiền.
const sendBookingConfirmedEmail = async ({
    email,
    contactName,
    bookingId,
    tourName,
    departureDate,
    type,
    amount,
    totalPrice,
    paidAmount,
    remainingAmount,
    balanceDueAt,
    payUrl = null,
}) => {
    const isDeposit = type === "deposit";
    const subject = isDeposit
        ? `Đã nhận tiền cọc đơn #${bookingId} — Vietravel`
        : `Xác nhận thanh toán đơn #${bookingId} — Vietravel`;

    try {
        if (!isMailConfigured()) {
            console.warn(
                `[MAIL] Chưa cấu hình SMTP. Email xác nhận đơn #${bookingId} (${type}) cho ${email}` +
                    (payUrl ? ` — link trả nốt: ${payUrl}` : ""),
            );
            return { sent: false };
        }

        const transporter = getTransporter();
        const from = process.env.SMTP_FROM || process.env.SMTP_USER;

        const headline = isDeposit
            ? `Đã nhận tiền cọc đơn #${bookingId}`
            : `Đã nhận thanh toán đơn #${bookingId}`;

        const summaryLine = isDeposit
            ? `Chúng tôi đã nhận <strong>${formatVnd(amount)}</strong> tiền cọc cho tour <strong>${escapeHtml(
                  tourName,
              )}</strong>.`
            : `Chúng tôi đã nhận <strong>${formatVnd(amount)}</strong> cho tour <strong>${escapeHtml(
                  tourName,
              )}</strong>.`;

        const depositBlock = isDeposit
            ? `
                <tr>
                    <td style="padding: 6px 0; color: #666;">Còn lại phải thanh toán</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #b45309;">${formatVnd(
                        remainingAmount,
                    )}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #666;">Hạn thanh toán phần còn lại</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatDate(
                        balanceDueAt,
                    )}</td>
                </tr>
            `
            : `
                <tr>
                    <td style="padding: 6px 0; color: #666;">Trạng thái</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #15803d;">Đã thanh toán đủ</td>
                </tr>
            `;

        const payButton =
            isDeposit && payUrl
                ? `
                    <p style="margin-top: 20px;">Vui lòng thanh toán phần còn lại trước hạn để giữ chỗ:</p>
                    <a href="${payUrl}"
                       style="display: inline-block; padding: 14px 28px; margin: 8px 0 16px;
                              background-color: #2563eb; color: #fff; text-decoration: none;
                              border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Thanh toán phần còn lại
                    </a>
                    <p style="font-size: 13px; color: #888; word-break: break-all;">${payUrl}</p>
                `
                : "";

        await transporter.sendMail({
            from,
            to: email,
            subject,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
                    <h2 style="margin-bottom: 8px;">${headline}</h2>
                    <p>Xin chào ${escapeHtml(contactName)},</p>
                    <p>${summaryLine}</p>

                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                        <tr>
                            <td style="padding: 6px 0; color: #666;">Mã đơn</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 600;">#${bookingId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #666;">Ngày khởi hành</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatDate(
                                departureDate,
                            )}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #666;">Tổng giá trị đơn</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatVnd(
                                totalPrice,
                            )}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #666;">Đã thanh toán</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatVnd(
                                paidAmount,
                            )}</td>
                        </tr>
                        ${depositBlock}
                    </table>

                    ${payButton}

                    <p style="margin-top: 16px; font-size: 13px; color: #999;">
                        Nếu bạn cần hỗ trợ, vui lòng phản hồi email này. Cảm ơn bạn đã chọn Vietravel!
                    </p>
                </div>
            `,
        });

        return { sent: true };
    } catch (error) {
        console.warn(`[MAIL] Gửi email xác nhận đơn #${bookingId} thất bại: ${error.message}`);
        return { sent: false };
    }
};

export {
    sendVerificationEmail,
    sendResetPasswordEmail,
    sendBookingConfirmedEmail,
    isMailConfigured,
};
