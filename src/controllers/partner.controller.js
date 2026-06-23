import { Partner } from "../models/partner.model.js";
import { User } from "../models/user.model.js";
import { Service } from "../models/service.model.js";
import { RemovedPartner } from "../models/removedPartner.model.js";
import { RejectionReason } from "../models/rejectionReason.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllPartners = asyncHandler(async (req, res) => {
  const partners = await Partner.find({ status: { $ne: "rejected" } })
    .populate("user", "-password -refreshToken")
    .populate("services", "name category")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, "Partners fetched successfully", partners));
});

const updatePartnerStatus = asyncHandler(async (req, res) => {
  const { id, status } = req.body;

  if (!id) throw new ApiError(400, "Partner id is required");

  const allowedStatuses = ["pending", "approve", "rejected", "inactive"];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
    );
  }

  const resolvedStatus = status === "approve" ? "active" : status;

  const partner = await Partner.findByIdAndUpdate(
    id,
    { status: resolvedStatus },
    { new: true }
  )
    .populate("user", "-password -refreshToken")
    .populate("services", "name category");

  if (!partner) {
    throw new ApiError(404, "Partner not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, `Partner status updated to '${status}'`, partner)
    );
});

const getActivePartners = asyncHandler(async (req, res) => {
  const partners = await Partner.find({ status: "active" })
    .populate("user", "-password -refreshToken")
    .populate({
      path: "services",
      select: "name category",
      populate: { path: "category", select: "name" },
    })
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Active partners fetched successfully", partners)
    );
});

const addPartner = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    businessName,
    longitude,
    latitude,
    services,
    description,
  } = req.body ?? {};

  if (
    [fullName, email, phone, businessName].some(
      (field) => !field || !field.trim()
    ) ||
    [longitude, latitude].some((field) => field == null)
  ) {
    throw new ApiError(
      400,
      "fullName, email, phone, businessName, longitude and latitude are required"
    );
  }

  let parsedServices = services;
  if (typeof services === "string") {
    try {
      parsedServices = JSON.parse(services);
    } catch {
      parsedServices = [services];
    }
  }

  if (!Array.isArray(parsedServices) || parsedServices.length === 0) {
    throw new ApiError(
      400,
      "services must be a non-empty array of service IDs"
    );
  }

  const validServices = await Service.find({
    _id: { $in: parsedServices },
  }).select("_id");
  if (validServices.length !== parsedServices.length) {
    throw new ApiError(400, "One or more service IDs are invalid");
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

  const serviceImages = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const uploaded = await uploadOnCloudinary(file.path);
      if (uploaded) serviceImages.push(uploaded.secure_url);
    }
  }

  const user = await User.create({
    name: fullName,
    email: normalizedEmail,
    phone: phone.trim(),
    role: "partner",
  });

  const partner = await Partner.create({
    user: user._id,
    businessName: businessName.trim(),
    description: description?.trim() || "",
    location: { type: "Point", coordinates: [parsedLng, parsedLat] },
    services: parsedServices,
    serviceImages,
    status: "active",
  });

  const responseData = await Partner.findById(partner._id)
    .populate("user", "-password -refreshToken")
    .populate({
      path: "services",
      select: "name category",
      populate: { path: "category", select: "name" },
    });

  return res
    .status(201)
    .json(new ApiResponse(201, "Partner added successfully", responseData));
});

const removePartner = asyncHandler(async (req, res) => {
  const { partnerId, reasonId, detail } = req.body;

  if (!partnerId || !reasonId) {
    throw new ApiError(400, "partnerId and reasonId are required");
  }

  const partner = await Partner.findById(partnerId);
  if (!partner) throw new ApiError(404, "Partner not found");

  if (partner.status === "rejected") {
    throw new ApiError(400, "Partner is already removed");
  }

  const reason = await RejectionReason.findById(reasonId);
  if (!reason) throw new ApiError(404, "Rejection reason not found");

  await Partner.findByIdAndUpdate(partnerId, { status: "rejected" });

  const removedData = { partner: partnerId, reason: reasonId };
  if (detail) removedData.detail = detail.trim();

  const removed = await RemovedPartner.create(removedData);

  const result = await RemovedPartner.findById(removed._id)
    .populate({
      path: "partner",
      populate: [
        { path: "user", select: "-password -refreshToken" },
        { path: "services", select: "name category" },
      ],
    })
    .populate("reason");

  return res
    .status(200)
    .json(new ApiResponse(200, "Partner removed successfully", result));
});

const getRemovedPartners = asyncHandler(async (req, res) => {
  const removedPartners = await RemovedPartner.find()
    .populate({
      path: "partner",
      populate: [
        { path: "user", select: "-password -refreshToken" },
        {
          path: "services",
          select: "name category",
          populate: { path: "category", select: "name" },
        },
      ],
    })
    .populate("reason")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Removed partners fetched successfully",
        removedPartners
      )
    );
});

export {
  getAllPartners,
  updatePartnerStatus,
  getActivePartners,
  addPartner,
  removePartner,
  getRemovedPartners,
};
