import { Partner } from "../models/partner.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getAllPartners = asyncHandler(async (req, res) => {
  const partners = await Partner.find()
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

  const allowedStatuses = ["pending", "active", "rejected", "inactive"];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
    );
  }

  const partner = await Partner.findByIdAndUpdate(id, { status }, { new: true })
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

export { getAllPartners, updatePartnerStatus };
