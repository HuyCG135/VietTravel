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

export { sendVerificationEmail, sendResetPasswordEmail, isMailConfigured };
