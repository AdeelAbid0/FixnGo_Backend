import { Category } from "../models/category.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addCategory = asyncHandler(async (req, res) => {
  const { name } = req.body ?? {};

  if (!name?.trim()) throw new ApiError(400, "Category name is required");

  const existing = await Category.findOne({ name: name.trim() });
  if (existing) throw new ApiError(409, "Category already exists");

  const category = await Category.create({ name: name.trim() });

  return res
    .status(201)
    .json(new ApiResponse(201, "Category added successfully", category));
});

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .select("_id name")
    .sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, "Categories fetched successfully", categories));
});

export { addCategory, getAllCategories };
