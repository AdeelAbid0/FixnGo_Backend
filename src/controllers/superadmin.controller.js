import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getSuperadminProfile = asyncHandler(async (req, res) => {
  const superadmin = await User.findById(req.user._id).select(
    "name email phone country profileImage"
  );

  if (!superadmin) throw new ApiError(404, "Superadmin not found");

  return res
    .status(200)
    .json(new ApiResponse(200, "Superadmin profile fetched successfully", superadmin));
});

const updateSuperadminProfile = asyncHandler(async (req, res) => {
  const { phone, email, country } = req.body;

  const superadmin = await User.findById(req.user._id);
  if (!superadmin) throw new ApiError(404, "Superadmin not found");

  if (email && email.trim()) {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== superadmin.email) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) throw new ApiError(409, "Email is already registered");
      superadmin.email = normalizedEmail;
    }
  }

  if (phone && phone.trim()) superadmin.phone = phone.trim();
  if (country && country.trim()) superadmin.country = country.trim();

  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded) superadmin.profileImage = uploaded.secure_url;
  }

  await superadmin.save({ validateBeforeSave: false });

  const updatedSuperadmin = await User.findById(superadmin._id).select(
    "name email phone country profileImage"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Superadmin profile updated successfully", updatedSuperadmin)
    );
});

const NOTIFICATION_KEYS = [
  "newPartnerRequest",
  "partnerApprovalRejection",
  "paymentAlerts",
  "systemAlerts",
];

const pickNotificationKeys = (notificationSettings) => {
  const picked = {};
  NOTIFICATION_KEYS.forEach((key) => {
    picked[key] = notificationSettings[key];
  });
  return picked;
};

const getSuperadminNotificationSettings = asyncHandler(async (req, res) => {
  const superadmin = await User.findById(req.user._id).select(
    "notificationSettings"
  );

  if (!superadmin) throw new ApiError(404, "Superadmin not found");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Notification settings fetched successfully",
        pickNotificationKeys(superadmin.notificationSettings)
      )
    );
});

const updateSuperadminNotificationSettings = asyncHandler(async (req, res) => {
  const superadmin = await User.findById(req.user._id);
  if (!superadmin) throw new ApiError(404, "Superadmin not found");

  NOTIFICATION_KEYS.forEach((key) => {
    if (typeof req.body[key] === "boolean") {
      superadmin.notificationSettings[key] = req.body[key];
    }
  });

  await superadmin.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Notification settings updated successfully",
        pickNotificationKeys(superadmin.notificationSettings)
      )
    );
});

export {
  getSuperadminProfile,
  updateSuperadminProfile,
  getSuperadminNotificationSettings,
  updateSuperadminNotificationSettings,
};
