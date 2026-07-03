import mongoose from "mongoose";
import { Booking } from "../models/booking.model.js";
import { Partner } from "../models/partner.model.js";
import { PartnerService } from "../models/partnerService.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createBooking = asyncHandler(async (req, res) => {
  const { serviceIds, partnerId, bookingDate, bookingTime } = req.body;

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new ApiError(400, "serviceIds must be a non-empty array");
  }
  if (!partnerId) throw new ApiError(400, "partnerId is required");
  if (!bookingDate) throw new ApiError(400, "bookingDate is required");
  if (!bookingTime?.trim()) throw new ApiError(400, "bookingTime is required");

  const invalidIds = serviceIds.filter(
    (id) => !mongoose.Types.ObjectId.isValid(id)
  );
  if (invalidIds.length > 0) {
    throw new ApiError(400, `Invalid service ids: ${invalidIds.join(", ")}`);
  }

  const parsedDate = new Date(bookingDate);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "bookingDate is not a valid date");
  }

  const partner = await Partner.findById(partnerId);
  if (!partner) throw new ApiError(404, "Partner not found");
  if (partner.status !== "active") {
    throw new ApiError(400, "Partner is not active");
  }

  const partnerServices = await PartnerService.find({
    partner: partnerId,
    service: { $in: serviceIds },
    status: "active",
  });

  const offeredServiceIds = partnerServices.map((ps) => ps.service.toString());
  const missingServices = serviceIds.filter(
    (id) => !offeredServiceIds.includes(id.toString())
  );
  if (missingServices.length > 0) {
    throw new ApiError(
      400,
      `Partner does not offer these services: ${missingServices.join(", ")}`
    );
  }

  const totalPrice = partnerServices.reduce((sum, ps) => sum + ps.price, 0);

  const booking = await Booking.create({
    user: req.user._id,
    partner: partnerId,
    services: serviceIds,
    bookingDate: parsedDate,
    bookingTime: bookingTime.trim(),
    totalPrice,
  });

  await booking.populate([
    { path: "user", select: "_id name email" },
    { path: "partner", select: "_id businessName" },
    { path: "services", select: "_id name" },
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, "Booking created successfully", booking));
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("user", "_id name email")
    .populate("partner", "_id businessName location")
    .populate("services", "_id name")
    .sort({ createdAt: -1 });

  const partnerIds = bookings.map((b) => b.partner?._id).filter(Boolean);
  const partnerServices = await PartnerService.find({
    partner: { $in: partnerIds },
  });

  const psMap = {};
  partnerServices.forEach((ps) => {
    psMap[`${ps.partner}_${ps.service}`] = ps;
  });

  const result = bookings.map((b) => {
    const booking = b.toObject();
    booking.services = booking.services.map((s) => {
      const ps = psMap[`${booking.partner?._id}_${s._id}`];
      return {
        ...s,
        carType: ps?.carType || null,
        fuelType: ps?.fuelType || null,
        duration: ps?.duration || null,
        description: ps?.description || "",
      };
    });
    return booking;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "All bookings fetched successfully", result));
});

const cancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) throw new ApiError(400, "bookingId is required");
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, "Invalid bookingId");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  const isOwner = booking.user.toString() === req.user._id.toString();

  let isBookingPartner = false;
  if (req.user.role === "partner") {
    const partner = await Partner.findOne({ user: req.user._id });
    isBookingPartner =
      partner != null && booking.partner.toString() === partner._id.toString();
  }

  if (!isOwner && !isBookingPartner && req.user.role !== "superadmin") {
    throw new ApiError(403, "You are not allowed to cancel this booking");
  }

  if (booking.status === "cancelled") {
    throw new ApiError(400, "Booking is already cancelled");
  }
  if (booking.status === "completed") {
    throw new ApiError(400, "Completed booking cannot be cancelled");
  }

  booking.status = "cancelled";
  await booking.save();

  await booking.populate([
    { path: "user", select: "_id name email" },
    { path: "partner", select: "_id businessName" },
    { path: "services", select: "_id name" },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, "Booking cancelled successfully", booking));
});

const acceptBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) throw new ApiError(400, "bookingId is required");
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, "Invalid bookingId");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  let isBookingPartner = false;
  if (req.user.role === "partner") {
    const partner = await Partner.findOne({ user: req.user._id });
    isBookingPartner =
      partner != null && booking.partner.toString() === partner._id.toString();
  }

  if (!isBookingPartner && req.user.role !== "superadmin") {
    throw new ApiError(403, "You are not allowed to accept this booking");
  }

  if (booking.status !== "pending") {
    throw new ApiError(400, `Only pending bookings can be accepted`);
  }

  booking.status = "scheduled";
  await booking.save();

  await booking.populate([
    { path: "user", select: "_id name email" },
    { path: "partner", select: "_id businessName" },
    { path: "services", select: "_id name" },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, "Booking accepted successfully", booking));
});

export { createBooking, getAllBookings, cancelBooking, acceptBooking };
