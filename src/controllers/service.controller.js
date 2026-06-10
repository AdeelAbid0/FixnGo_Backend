import { Service } from "../models/service.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addServices = asyncHandler(async (req, res) => {
  const { services } = req.body ?? {};

  if (!Array.isArray(services) || services.length === 0) {
    throw new ApiError(400, "services must be a non-empty array of names");
  }

  const docs = services.map((name) => {
    if (typeof name !== "string" || !name.trim()) {
      throw new ApiError(400, "Each service must be a non-empty string");
    }
    return { name: name.trim() };
  });

  // insertMany with ordered:false so one duplicate doesn't block the rest
  const result = await Service.insertMany(docs, {
    ordered: false,
    rawResult: true,
  }).catch((err) => {
    // E11000 = duplicate key — partial success is fine, re-throw anything else
    if (err.code !== 11000 && err.writeErrors?.some((e) => e.code !== 11000)) {
      throw err;
    }
    return err;
  });

  const inserted = result.insertedCount ?? result.mongoose?.insertedCount ?? 0;

  return res
    .status(201)
    .json(new ApiResponse(201, `${inserted} service(s) added successfully`));
});

const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ isActive: true })
    .select("_id name")
    .sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, "Services fetched successfully", services));
});

export { addServices, getServices };
