import sgMail from "@sendgrid/mail";

// Railway (and many PaaS providers) block/throttle outbound SMTP ports
// (25/465/587), which made Gmail SMTP time out in production even though
// it worked locally. SendGrid sends over HTTPS, which isn't subject to
// that egress restriction. MAIL_FROM must be an address verified under
// SendGrid's Single Sender Verification (or a verified domain).
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM = `"FixNGo" <${process.env.MAIL_FROM}>`;

const send = async ({ to, subject, html }) => {
  await sgMail.send({ from: FROM, to, subject, html });
};

export const sendOtpEmail = async ({ name, email, otp }) => {
  await send({
    to: email,
    subject: "FixNGo – Verify Your Email",
    html: `
      <h2>Welcome to FixNGo, ${name}!</h2>
      <p>Please verify your email address using the OTP below:</p>
      <h3 style="letter-spacing:4px">${otp}</h3>
      <p>This OTP expires in <strong>10 minutes</strong>.</p>
      <br/>
      <p>– The FixNGo Team</p>
    `,
  });
};

export const sendPasswordResetOtpEmail = async ({ name, email, otp }) => {
  await send({
    to: email,
    subject: "FixNGo – Password Reset OTP",
    html: `
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your FixNGo password. Use the OTP below:</p>
      <h3 style="letter-spacing:4px">${otp}</h3>
      <p>This OTP expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
      <br/>
      <p>– The FixNGo Team</p>
    `,
  });
};

export const sendPartnerCredentials = async ({ name, email, password, otp }) => {
  await send({
    to: email,
    subject: "Welcome to FixNGo – Your Partner Account Credentials",
    html: `
      <h2>Welcome to FixNGo, ${name}!</h2>
      <p>Your partner account has been created. Use the credentials below to log in:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
      <hr/>
      <p>Before logging in, please verify your email using the OTP below:</p>
      <h3 style="letter-spacing:4px">${otp}</h3>
      <p>This OTP expires in <strong>10 minutes</strong>.</p>
      <p>Please change your password after your first login.</p>
      <br/>
      <p>– The FixNGo Team</p>
    `,
  });
};
