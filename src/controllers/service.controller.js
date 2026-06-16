import { Service } from "../models/service.model.js";
import { Category } from "../models/category.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addServices = asyncHandler(async (req, res) => {
  const { name, categoryId, duration, price } = req.body ?? {};

  if (!name?.trim() || !categoryId || !duration?.trim() || price === undefined || price === null) {
    throw new ApiError(400, "name, categoryId, duration, and price are required");
  }

  if (typeof price !== "number" || price < 0) {
    throw new ApiError(400, "price must be a non-negative number");
  }

  const category = await Category.findById(categoryId);
  if (!category) throw new ApiError(404, "Category not found");

  const service = await Service.create({
    name: name.trim(),
    category: categoryId,
    duration: duration.trim(),
    price,
  });

  await service.populate("category", "name");

  return res
    .status(201)
    .json(new ApiResponse(201, "Service added successfully", service));
});

const getServicesByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) throw new ApiError(404, "Category not found");

  const services = await Service.find({ category: categoryId, isActive: true })
    .select("_id name duration price")
    .sort({ name: 1 });

  return res.status(200).json(
    new ApiResponse(200, "Services fetched successfully", {
      category: { _id: category._id, name: category.name },
      services,
    })
  );
});

const getServices = asyncHandler(async (req, res) => {
  const services = await Service.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryInfo",
      },
    },
    { $unwind: "$categoryInfo" },
    {
      $group: {
        _id: "$categoryInfo._id",
        category: { $first: "$categoryInfo.name" },
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
        categoryId: "$_id",
        category: 1,
        subServices: 1,
      },
    },
    { $sort: { category: 1 } },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, "Services fetched successfully", services));
});

export { addServices, getServicesByCategory, getServices };
