import { User } from "../models/user.model.js";
import { Partner } from "../models/partner.model.js";
import { PartnerService } from "../models/partnerService.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const buildDateFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return { range: null, filter: {} };

  const filter = {};

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    if (isNaN(start.getTime())) {
      throw new ApiError(400, "startDate is not a valid date");
    }
    filter.$gte = start;
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999Z`);
    if (isNaN(end.getTime())) {
      throw new ApiError(400, "endDate is not a valid date");
    }
    filter.$lte = end;
  }

  if (filter.$gte && filter.$lte && filter.$gte > filter.$lte) {
    throw new ApiError(400, "startDate cannot be after endDate");
  }

  return {
    range: { startDate: startDate || null, endDate: endDate || null },
    filter: { createdAt: filter },
  };
};

const getStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const { range, filter } = buildDateFilter(startDate, endDate);

  const totalCustomers = await User.countDocuments({
    role: "customer",
    ...filter,
  });

  const partners = await Partner.find({
    status: { $ne: "rejected" },
    ...filter,
  })
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

  const partnersResult = partners.map((p) => ({
    ...p.toObject(),
    services: serviceMap[p._id.toString()] || [],
  }));

  const totalPartners = partnersResult.length;

  return res.status(200).json(
    new ApiResponse(200, "Dashboard stats fetched successfully", {
      range,
      totalUsers: totalCustomers + totalPartners,
      totalCustomers,
      totalPartners,
      partners: partnersResult,
    })
  );
});

export { getStats };
