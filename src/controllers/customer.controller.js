import { User } from "../models/user.model.js";
import { Partner } from "../models/partner.model.js";
import { Bookmark } from "../models/bookmark.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getCustomerProfile = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.user._id).select(
    "name email phone profileImage"
  );

  if (!customer) throw new ApiError(404, "Customer not found");

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer profile fetched successfully", customer));
});

const updateCustomerProfile = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;

  const customer = await User.findById(req.user._id);
  if (!customer) throw new ApiError(404, "Customer not found");

  if (email && email.trim()) {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== customer.email) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) throw new ApiError(409, "Email is already registered");
      customer.email = normalizedEmail;
    }
  }

  if (name && name.trim()) customer.name = name.trim();
  if (phone && phone.trim()) customer.phone = phone.trim();

  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded) customer.profileImage = uploaded.secure_url;
  }

  await customer.save({ validateBeforeSave: false });

  const updatedCustomer = await User.findById(customer._id).select(
    "name email phone profileImage"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Customer profile updated successfully", updatedCustomer)
    );
});

const NOTIFICATION_KEYS = [
  "partnerMessages",
  "paymentInvoiceAlerts",
  "bookingReminders",
  "promotionsOffers",
];

const getNotificationSettings = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.user._id).select(
    "notificationSettings"
  );

  if (!customer) throw new ApiError(404, "Customer not found");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Notification settings fetched successfully",
        customer.notificationSettings
      )
    );
});

const updateNotificationSettings = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.user._id);
  if (!customer) throw new ApiError(404, "Customer not found");

  NOTIFICATION_KEYS.forEach((key) => {
    if (typeof req.body[key] === "boolean") {
      customer.notificationSettings[key] = req.body[key];
    }
  });

  await customer.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Notification settings updated successfully",
        customer.notificationSettings
      )
    );
});

const toggleBookmarkPartner = asyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  const partner = await Partner.findById(partnerId);
  if (!partner) throw new ApiError(404, "Partner not found");

  const existing = await Bookmark.findOne({
    customer: req.user._id,
    partner: partnerId,
  });

  if (existing) {
    await existing.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, "Partner removed from bookmarks", { bookmarked: false }));
  }

  await Bookmark.create({ customer: req.user._id, partner: partnerId });

  return res
    .status(201)
    .json(new ApiResponse(201, "Partner added to bookmarks", { bookmarked: true }));
});

const getBookmarkedPartners = asyncHandler(async (req, res) => {
  const bookmarks = await Bookmark.find({ customer: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "partner",
      populate: [
        { path: "user", select: "-password -refreshToken" },
        { path: "addedBy", select: "_id name role" },
      ],
    });

  const partners = bookmarks
    .filter((b) => b.partner)
    .map((b) => ({ ...b.partner.toObject(), bookmarkedAt: b.createdAt }));

  return res
    .status(200)
    .json(new ApiResponse(200, "Bookmarked partners fetched successfully", partners));
});

export {
  getCustomerProfile,
  updateCustomerProfile,
  getNotificationSettings,
  updateNotificationSettings,
  toggleBookmarkPartner,
  getBookmarkedPartners,
};
