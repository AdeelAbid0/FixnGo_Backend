import { RejectionReason } from "../models/rejectionReason.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addRejectionReason = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "title and description are required");
  }

  const exists = await RejectionReason.findOne({ title: title.trim() });
  if (exists) {
    throw new ApiError(409, "Rejection reason with this title already exists");
  }

  const reason = await RejectionReason.create({
    title: title.trim(),
    description: description.trim(),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Rejection reason added successfully", reason));
});

const getRejectionReasons = asyncHandler(async (req, res) => {
  const reasons = await RejectionReason.find().sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Rejection reasons fetched successfully", reasons)
    );
});

export { addRejectionReason, getRejectionReasons };
