import nodemailer from "nodemailer";
import net from "node:net";

// nodemailer's built-in DNS resolution (v8.x) resolves both A and AAAA
// records and picks one at random, ignoring the `family` option. Hosts
// without outbound IPv6 (e.g. Railway) then get ENETUNREACH whenever it
// picks an IPv6 address. Connecting the socket ourselves with an explicit
// IPv4-only lookup avoids that and lets nodemailer perform the TLS upgrade
// as usual.
const connectIpv4 = (options, callback) => {
  const socket = net.connect({
    host: options.host,
    port: options.port,
    family: 4,
  });
  socket.once("connect", () => callback(null, { connection: socket }));
  socket.once("error", callback);
};

const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    getSocket: connectIpv4,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

export const sendOtpEmail = async ({ name, email, otp }) => {
  await createTransporter().sendMail({
    from: `"FixNGo" <${process.env.MAIL_USER}>`,
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
  await createTransporter().sendMail({
    from: `"FixNGo" <${process.env.MAIL_USER}>`,
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

export const sendPartnerCredentials = async ({
  name,
  email,
  password,
  otp,
}) => {
  await createTransporter().sendMail({
    from: `"FixNGo" <${process.env.MAIL_USER}>`,
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
