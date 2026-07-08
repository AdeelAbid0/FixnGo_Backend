import { Partner } from "../models/partner.model.js";
import { User } from "../models/user.model.js";
import { Service } from "../models/service.model.js";
import { Category } from "../models/category.model.js";
import { PartnerService } from "../models/partnerService.model.js";
import { RemovedPartner } from "../models/removedPartner.model.js";
import { RejectionReason } from "../models/rejectionReason.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllPartners = asyncHandler(async (req, res) => {
  const partners = await Partner.find({ status: { $ne: "rejected" } })
    .populate("user", "-password -refreshToken")
    .sort({ createdAt: -1 });

  const partnerIds = partners.map((p) => p._id);
  const partnerServices = await PartnerService.find({
    partner: { $in: partnerIds },
  })
    .populate("service", "_id name")
    .populate("category", "_id name")
    .populate("addedBy", "_id name role");

  const serviceMap = {};
  partnerServices.forEach((ps) => {
    const pid = ps.partner.toString();
    if (!serviceMap[pid]) serviceMap[pid] = [];
    serviceMap[pid].push(ps);
  });

  const result = partners.map((p) => ({
    ...p.toObject(),
    services: serviceMap[p._id.toString()] || [],
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, "Partners fetched successfully", result));
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
    .sort({ createdAt: -1 });

  const partnerIds = partners.map((p) => p._id);
  const partnerServices = await PartnerService.find({
    partner: { $in: partnerIds },
  })
    .populate("service", "_id name")
    .populate("category", "_id name")
    .populate("addedBy", "_id name role");

  const serviceMap = {};
  partnerServices.forEach((ps) => {
    const pid = ps.partner.toString();
    if (!serviceMap[pid]) serviceMap[pid] = [];
    serviceMap[pid].push(ps);
  });

  const result = partners.map((p) => ({
    ...p.toObject(),
    services: serviceMap[p._id.toString()] || [],
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, "Active partners fetched successfully", result));
});

const addPartner = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    businessName,
    longitude,
    latitude,
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
    serviceImages,
    status: "active",
  });

  const responseData = await Partner.findById(partner._id).populate(
    "user",
    "-password -refreshToken"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Partner added successfully", responseData));
});

const removePartner = asyncHandler(async (req, res) => {
  const { partnerId, reasonIds, detail } = req.body;

  if (!partnerId || !Array.isArray(reasonIds) || reasonIds.length === 0) {
    throw new ApiError(400, "partnerId and reasonIds (array) are required");
  }

  const partner = await Partner.findById(partnerId);
  if (!partner) throw new ApiError(404, "Partner not found");

  if (partner.status === "rejected") {
    throw new ApiError(400, "Partner is already removed");
  }

  const reasons = await RejectionReason.find({ _id: { $in: reasonIds } });
  if (reasons.length !== reasonIds.length) {
    throw new ApiError(404, "One or more rejection reasons not found");
  }

  await Partner.findByIdAndUpdate(partnerId, { status: "rejected" });

  const removedData = { partner: partnerId, reasons: reasonIds };
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
    .populate("reasons");

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
    .populate("reasons")
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

const addPartnerService = asyncHandler(async (req, res) => {
  const {
    partnerId,
    serviceId,
    categoryId,
    price,
    duration,
    status,
    carType,
    fuelType,
    description,
  } = req.body ?? {};

  if (
    !partnerId ||
    !serviceId ||
    !categoryId ||
    price == null ||
    !duration?.trim()
  ) {
    throw new ApiError(
      400,
      "partnerId, serviceId, categoryId, price and duration are required"
    );
  }

  const partner = await Partner.findOne({ user: partnerId });
  if (!partner) throw new ApiError(404, "Partner not found");

  const [service, category] = await Promise.all([
    Service.findById(serviceId),
    Category.findById(categoryId),
  ]);
  if (!service) throw new ApiError(404, "Service not found");
  if (!category) throw new ApiError(404, "Category not found");

  const duplicate = await PartnerService.findOne({
    partner: partner._id,
    service: serviceId,
  });
  if (duplicate)
    throw new ApiError(409, "This service is already added for this partner");

  const partnerService = await PartnerService.create({
    partner: partner._id,
    service: serviceId,
    category: categoryId,
    price,
    duration: duration.trim(),
    status: status || "active",
    carType,
    fuelType,
    description: description?.trim() || "",
    addedBy: req.user._id,
  });

  await partnerService.populate([
    { path: "partner", select: "_id businessName" },
    { path: "service", select: "_id name" },
    { path: "category", select: "_id name" },
    { path: "addedBy", select: "_id name role" },
  ]);

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Partner service added successfully", partnerService)
    );
});

const updatePartnerService = asyncHandler(async (req, res) => {
  const {
    partnerServiceId,
    serviceId,
    categoryId,
    price,
    duration,
    status,
    carType,
    fuelType,
    description,
  } = req.body ?? {};

  if (!partnerServiceId)
    throw new ApiError(400, "partnerServiceId is required");

  const partnerService = await PartnerService.findById(partnerServiceId);
  if (!partnerService) throw new ApiError(404, "Partner service not found");

  if (serviceId) {
    const service = await Service.findById(serviceId);
    if (!service) throw new ApiError(404, "Service not found");
    const duplicate = await PartnerService.findOne({
      partner: partnerService.partner,
      service: serviceId,
      _id: { $ne: partnerServiceId },
    });
    if (duplicate)
      throw new ApiError(409, "This service is already added for this partner");
    partnerService.service = serviceId;
  }

  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, "Category not found");
    partnerService.category = categoryId;
  }

  if (price != null) partnerService.price = price;
  if (duration?.trim()) partnerService.duration = duration.trim();
  if (status) partnerService.status = status;
  if (carType) partnerService.carType = carType;
  if (fuelType) partnerService.fuelType = fuelType;
  if (description != null) partnerService.description = description.trim();

  await partnerService.save();

  await partnerService.populate([
    { path: "partner", select: "_id businessName" },
    { path: "service", select: "_id name" },
    { path: "category", select: "_id name" },
    { path: "addedBy", select: "_id name role" },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Partner service updated successfully",
        partnerService
      )
    );
});

const getPartnersByService = asyncHandler(async (req, res) => {
  const { serviceId } = req.query;

  if (!serviceId) throw new ApiError(400, "serviceId is required");

  const service = await Service.findById(serviceId);
  if (!service) throw new ApiError(404, "Service not found");

  const partnerServices = await PartnerService.find({
    service: serviceId,
    status: "active",
  }).populate({
    path: "partner",
    populate: { path: "user", select: "-password -refreshToken" },
  });

  const partnerIds = partnerServices.map((ps) => ps.partner._id);

  const allServices = await PartnerService.find({
    partner: { $in: partnerIds },
    status: "active",
  })
    .populate("service", "_id name")
    .populate("category", "_id name")
    .populate("addedBy", "_id name role");

  const serviceMap = {};
  allServices.forEach((ps) => {
    const pid = ps.partner.toString();
    if (!serviceMap[pid]) serviceMap[pid] = [];
    serviceMap[pid].push(ps);
  });

  const partners = partnerServices.map((ps) => ({
    ...ps.partner.toObject(),
    price: ps.price,
    duration: ps.duration,
    carType: ps.carType,
    fuelType: ps.fuelType,
    description: ps.description,
    services: serviceMap[ps.partner._id.toString()] || [],
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Partners fetched successfully for this service",
        partners
      )
    );
});

const getAllPartnerServices = asyncHandler(async (req, res) => {
  const services = await PartnerService.find({ status: "active" })
    .populate({ path: "partner", select: "_id businessName" })
    .populate("service", "_id name")
    .populate("category", "_id name")
    .populate("addedBy", "_id name role")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "All partner services fetched successfully",
        services
      )
    );
});

const getServicesByFilter = asyncHandler(async (req, res) => {
  const { categoryId, carType, fuelType } = req.query;

  const filter = { status: "active" };

  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, "Category not found");
    filter.category = categoryId;
  }

  if (carType && carType !== "all") {
    filter.carType = { $in: [carType, "all"] };
  }

  if (fuelType) {
    filter.fuelType = fuelType;
  }

  const services = await PartnerService.find(filter)
    .populate({
      path: "partner",
      populate: { path: "user", select: "-password -refreshToken" },
    })
    .populate("service", "_id name")
    .populate("category", "_id name")
    .populate("addedBy", "_id name role")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, "Services fetched successfully", services));
});

const getPartnersByFilter = asyncHandler(async (req, res) => {
  const { serviceId, carType, fuelType } = req.query;

  if (!serviceId) throw new ApiError(400, "serviceId is required");

  const service = await Service.findById(serviceId);
  if (!service) throw new ApiError(404, "Service not found");

  const typeFilter = {};
  if (carType && carType !== "all") {
    typeFilter.carType = { $in: [carType, "all"] };
  }
  if (fuelType) {
    typeFilter.fuelType = fuelType;
  }

  const partnerServices = await PartnerService.find({
    service: serviceId,
    status: "active",
    ...typeFilter,
  }).populate({
    path: "partner",
    populate: { path: "user", select: "-password -refreshToken" },
  });

  const partnerIds = partnerServices.map((ps) => ps.partner._id);

  const matchedServices = await PartnerService.find({
    partner: { $in: partnerIds },
    status: "active",
    ...typeFilter,
  })
    .populate("service", "_id name")
    .populate("category", "_id name")
    .populate("addedBy", "_id name role");

  const serviceMap = {};
  matchedServices.forEach((ps) => {
    const pid = ps.partner.toString();
    if (!serviceMap[pid]) serviceMap[pid] = [];
    serviceMap[pid].push(ps);
  });

  const partners = partnerServices.map((ps) => ({
    ...ps.partner.toObject(),
    price: ps.price,
    duration: ps.duration,
    carType: ps.carType,
    fuelType: ps.fuelType,
    description: ps.description,
    services: serviceMap[ps.partner._id.toString()] || [],
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Partners fetched successfully for this service filter",
        partners
      )
    );
});

const getPartnerServices = asyncHandler(async (req, res) => {
  const { partnerId } = req.query;

  if (!partnerId) throw new ApiError(400, "partnerId is required");

  const partner = await Partner.findOne({ user: partnerId });
  if (!partner) throw new ApiError(404, "Partner not found");

  const services = await PartnerService.find({ partner: partner._id })
    .populate("service", "_id name")
    .populate("category", "_id name")
    .populate("addedBy", "_id name role")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Partner services fetched successfully", services)
    );
});

export {
  getAllPartners,
  updatePartnerStatus,
  getActivePartners,
  addPartner,
  removePartner,
  getRemovedPartners,
  addPartnerService,
  updatePartnerService,
  getPartnerServices,
  getAllPartnerServices,
  getPartnersByService,
  getServicesByFilter,
  getPartnersByFilter,
};
