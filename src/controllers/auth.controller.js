import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";
import { Partner } from "../models/partner.model.js";
import { PendingRegistration } from "../models/pendingRegistration.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendOtpEmail, sendPasswordResetOtpEmail } from "../utils/mailer.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateRefreshTokenAndAccessToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const generateOtp = () => ({
  otp: String(Math.floor(100000 + Math.random() * 900000)),
  otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
});

const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if ([name, email, password].some((field) => !field || !field.trim())) {
    throw new ApiError(400, "name, email and password are required");
  }

  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) throw new ApiError(409, "Email is already registered");

  const { otp, otpExpiry } = generateOtp();

  await PendingRegistration.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      role: "customer",
      otp,
      otpExpiry,
      data: { name, password },
    },
    { upsert: true, new: true }
  );

  sendOtpEmail({ name, email: normalizedEmail, otp }).catch((error) =>
    console.error("Failed to send customer OTP email:", error.message)
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "OTP sent to your email. Please verify to complete registration."
      )
    );
});

const VALID_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const parseBusinessHours = (businessHours) => {
  if (businessHours == null) return [];

  let parsed = businessHours;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new ApiError(400, "businessHours must be valid JSON");
    }
  }

  if (!Array.isArray(parsed)) {
    throw new ApiError(400, "businessHours must be an array");
  }

  return parsed.map((entry) => {
    const { day, isOpen, startTime, endTime } = entry ?? {};

    if (!VALID_DAYS.includes(day)) {
      throw new ApiError(400, `Invalid day in businessHours: ${day}`);
    }

    if (isOpen && (!startTime || !endTime)) {
      throw new ApiError(
        400,
        `startTime and endTime are required when ${day} is open`
      );
    }

    return {
      day,
      isOpen: Boolean(isOpen),
      startTime: isOpen ? startTime : null,
      endTime: isOpen ? endTime : null,
    };
  });
};

const registerPartner = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    businessName,
    longitude,
    latitude,
    description,
    businessHours,
  } = req.body ?? {};

  if (
    [fullName, email, password, phone, businessName].some(
      (field) => !field || !field.trim()
    ) ||
    [longitude, latitude].some((field) => field == null)
  ) {
    throw new ApiError(
      400,
      "fullName, email, password, phone, businessName, longitude and latitude are required"
    );
  }

  const parsedLng = parseFloat(longitude);
  const parsedLat = parseFloat(latitude);

  if (
    isNaN(parsedLng) ||
    isNaN(parsedLat) ||
    parsedLng < -180 ||
    parsedLng > 180 ||
    parsedLat < -90 ||
    parsedLat > 90
  ) {
    throw new ApiError(400, "Invalid longitude or latitude values");
  }

  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) throw new ApiError(409, "Email is already registered");

  const parsedBusinessHours = parseBusinessHours(businessHours);

  // Upload images to Cloudinary now so the URLs can be stored in pending.
  // Uploaded in small batches instead of all at once to avoid spiking
  // memory/CPU on constrained hosts when several images are sent together.
  const serviceImages = [];
  if (req.files && req.files.length > 0) {
    const BATCH_SIZE = 3;
    for (let i = 0; i < req.files.length; i += BATCH_SIZE) {
      const batch = req.files.slice(i, i + BATCH_SIZE);
      const uploaded = await Promise.all(
        batch.map((file) => uploadOnCloudinary(file.path))
      );
      serviceImages.push(
        ...uploaded.filter(Boolean).map((result) => result.secure_url)
      );
    }
  }

  const { otp, otpExpiry } = generateOtp();

  await PendingRegistration.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      role: "partner",
      otp,
      otpExpiry,
      data: {
        fullName,
        password,
        phone,
        businessName,
        longitude: parsedLng,
        latitude: parsedLat,
        description: description?.trim() || "",
        serviceImages,
        businessHours: parsedBusinessHours,
      },
    },
    { upsert: true, new: true }
  );

  sendOtpEmail({ name: fullName, email: normalizedEmail, otp }).catch((error) =>
    console.error("Failed to send partner OTP email:", error.message)
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "OTP sent to your email. Please verify to complete registration."
      )
    );
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const normalizedEmail = email.toLowerCase();
  const pending = await PendingRegistration.findOne({ email: normalizedEmail });

  if (!pending) {
    throw new ApiError(404, "No pending registration found for this email");
  }

  if (new Date() > pending.otpExpiry) {
    await PendingRegistration.deleteOne({ email: normalizedEmail });
    throw new ApiError(400, "OTP has expired. Please register again");
  }

  if (pending.otp !== String(otp)) {
    throw new ApiError(400, "Invalid OTP");
  }

  const { role, data } = pending;
  let responseData;

  if (role === "customer") {
    const user = await User.create({
      name: data.name,
      email: normalizedEmail,
      password: data.password,
      role: "customer",
    });
    responseData = await User.findById(user._id).select(
      "-password -refreshToken"
    );
  } else {
    const user = await User.create({
      name: data.fullName,
      email: normalizedEmail,
      phone: data.phone,
      password: data.password,
      role: "partner",
    });

    const partner = await Partner.create({
      user: user._id,
      addedBy: user._id,
      businessName: data.businessName,
      description: data.description,
      location: {
        type: "Point",
        coordinates: [data.longitude, data.latitude],
      },
      serviceImages: data.serviceImages,
      businessHours: data.businessHours,
    });

    responseData = await Partner.findById(partner._id)
      .populate("user", "-password -refreshToken")
      .populate("addedBy", "_id name role");
  }

  await PendingRegistration.deleteOne({ email: normalizedEmail });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        "Email verified. Registration complete. You can now log in.",
        responseData
      )
    );
});

const ROLE_NOTIFICATION_KEYS = {
  customer: [
    "partnerMessages",
    "paymentInvoiceAlerts",
    "bookingReminders",
    "promotionsOffers",
  ],
  partner: ["newBookings", "jobReminders", "paymentsPayouts", "reviewsRatings"],
  superadmin: [
    "newPartnerRequest",
    "partnerApprovalRejection",
    "paymentAlerts",
    "systemAlerts",
  ],
};

const respondWithLogin = async (res, message, userId, rememberMe) => {
  const { accessToken, refreshToken } =
    await generateRefreshTokenAndAccessToken(userId);

  const loggedInUser = await User.findById(userId).select(
    "-password -refreshToken"
  );

  const allowedKeys = ROLE_NOTIFICATION_KEYS[loggedInUser.role] || [];
  const notificationSettings = {};
  allowedKeys.forEach((key) => {
    notificationSettings[key] = loggedInUser.notificationSettings[key];
  });
  const userResponse = { ...loggedInUser.toObject(), notificationSettings };

  // rememberMe = true  → refresh token cookie persists for 30 days
  // rememberMe = false → refresh token cookie is a session cookie (cleared on browser close)
  const refreshTokenCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    ...(rememberMe && { maxAge: 30 * 24 * 60 * 60 * 1000 }),
  };

  const accessTokenCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessTokenCookieOptions)
    .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
    .json(
      new ApiResponse(200, message, {
        user: userResponse,
        accessToken,
        refreshToken,
      })
    );
};

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  return respondWithLogin(res, "Login successful", user._id, rememberMe);
});

const GOOGLE_SIGNUP_ROLES = ["customer", "partner"];

const googleLogin = asyncHandler(async (req, res) => {
  const { idToken, role, rememberMe = false } = req.body;

  if (!idToken) throw new ApiError(400, "idToken is required");

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "Invalid Google token");
  }

  if (!payload?.email || !payload.email_verified) {
    throw new ApiError(401, "Google account email is not verified");
  }

  const normalizedEmail = payload.email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    // New Google account: require the user to pick customer/partner
    // before we create anything. Frontend re-calls this same endpoint
    // with the chosen role once the user picks one.
    if (!GOOGLE_SIGNUP_ROLES.includes(role)) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, "Select an account type to continue", {
            requiresRole: true,
            email: normalizedEmail,
            name: payload.name || "",
            picture: payload.picture || "",
          })
        );
    }

    user = await User.create({
      name: payload.name || normalizedEmail,
      email: normalizedEmail,
      role,
      profileImage: payload.picture || "",
    });

    if (role === "partner") {
      await Partner.create({
        user: user._id,
        addedBy: user._id,
        status: "active",
      });
    }
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  return respondWithLogin(res, "Login successful", user._id, rememberMe);
});

const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const normalizedEmail = email.toLowerCase();

  const pending = await PendingRegistration.findOne({ email: normalizedEmail });
  if (!pending) {
    throw new ApiError(404, "No pending registration found for this email");
  }

  const { otp, otpExpiry } = generateOtp();

  pending.otp = otp;
  pending.otpExpiry = otpExpiry;
  await pending.save();

  const name =
    pending.role === "partner" ? pending.data.fullName : pending.data.name;
  sendOtpEmail({ name, email: normalizedEmail, otp }).catch((error) =>
    console.error("Failed to send OTP email:", error.message)
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "A new OTP has been sent to your email."));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) throw new ApiError(404, "No account found with this email");

  const { otp, otpExpiry } = generateOtp();

  user.resetOtp = otp;
  user.resetOtpExpiry = otpExpiry;
  user.resetOtpVerified = false;
  await user.save({ validateBeforeSave: false });

  sendPasswordResetOtpEmail({
    name: user.name,
    email: normalizedEmail,
    otp,
  }).catch((error) =>
    console.error("Failed to send password reset OTP email:", error.message)
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "OTP sent to your email. Please verify to reset your password."
      )
    );
});

const resendForgotPasswordOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) throw new ApiError(404, "No account found with this email");

  const { otp, otpExpiry } = generateOtp();

  user.resetOtp = otp;
  user.resetOtpExpiry = otpExpiry;
  user.resetOtpVerified = false;
  await user.save({ validateBeforeSave: false });

  sendPasswordResetOtpEmail({
    name: user.name,
    email: normalizedEmail,
    otp,
  }).catch((error) =>
    console.error("Failed to send password reset OTP email:", error.message)
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "A new OTP has been sent to your email."));
});

const verifyForgotPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) throw new ApiError(400, "Email and OTP are required");

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.resetOtp) {
    throw new ApiError(400, "No password reset request found for this email");
  }

  if (new Date() > user.resetOtpExpiry) {
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    user.resetOtpVerified = false;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, "OTP has expired. Please request a new one");
  }

  if (user.resetOtp !== String(otp)) {
    throw new ApiError(400, "Invalid OTP");
  }

  user.resetOtpVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "OTP verified. You can now reset your password.")
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.resetOtpVerified) {
    throw new ApiError(
      400,
      "Please verify your OTP before resetting the password"
    );
  }

  user.password = password;
  user.resetOtp = undefined;
  user.resetOtpExpiry = undefined;
  user.resetOtpVerified = false;
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Password reset successful. You can now log in.")
    );
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const isCurrentPasswordCorrect = await user.isPasswordCorrect(
    currentPassword
  );
  if (!isCurrentPasswordCorrect) {
    throw new ApiError(400, "Current password is incorrect");
  }

  if (currentPassword === newPassword) {
    throw new ApiError(
      400,
      "New password must be different from the current password"
    );
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully"));
});

export {
  registerCustomer,
  registerPartner,
  verifyOtp,
  resendOtp,
  login,
  googleLogin,
  forgotPassword,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  changePassword,
};
