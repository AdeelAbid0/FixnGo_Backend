import { Service } from "../models/service.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addServices = asyncHandler(async (req, res) => {
  const { name, category, duration, price } = req.body ?? {};

  if (
    !name?.trim() ||
    !category?.trim() ||
    !duration?.trim() ||
    price === undefined ||
    price === null
  ) {
    throw new ApiError(400, "name, category, duration, and price are required");
  }

  if (typeof price !== "number" || price < 0) {
    throw new ApiError(400, "price must be a non-negative number");
  }

  const service = await Service.create({
    name: name.trim(),
    category: category.trim(),
    duration: duration.trim(),
    price,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Service added successfully", service));
});

const getServices = asyncHandler(async (req, res) => {
  const services = await Service.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$category",
        subServices: {
          $push: {
            _id: "$_id",
            name: "$name",
            duration: "$duration",
            price: "$price",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        subServices: 1,
      },
    },
    { $sort: { category: 1 } },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, "Services fetched successfully", services));
});

export { addServices, getServices };
