import { Service } from "../models/service.model.js";
import { Category } from "../models/category.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addService = asyncHandler(async (req, res) => {
  const { service, categoryId } = req.body ?? {};

  if (!service?.trim() || !categoryId) {
    throw new ApiError(400, "service and categoryId are required");
  }

  const category = await Category.findById(categoryId);
  if (!category) throw new ApiError(404, "Category not found");

  const existing = await Service.findOne({ name: service.trim() });
  if (existing)
    throw new ApiError(409, "Service with this name already exists");

  const newService = await Service.create({
    name: service.trim(),
    category: categoryId,
    addedBy: req.user._id,
  });

  await newService.populate([
    { path: "category", select: "_id name" },
    { path: "addedBy", select: "_id name email role" },
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, "Service added successfully", newService));
});

const getServices = asyncHandler(async (req, res) => {
  const { categoryId } = req.query;

  const filter = { isActive: true };
  if (categoryId) filter.category = categoryId;

  const services = await Service.find(filter)
    .select("_id name category addedBy")
    .populate("category", "_id name")
    .populate("addedBy", "_id name role")
    .sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, "Services fetched successfully", services));
});

const updateService = asyncHandler(async (req, res) => {
  const { serviceId, service, categoryId } = req.body ?? {};

  if (!serviceId) {
    throw new ApiError(400, "serviceId is required");
  }

  if (!service?.trim() && !categoryId) {
    throw new ApiError(
      400,
      "At least service or categoryId is required to update"
    );
  }

  const existing = await Service.findById(serviceId);
  if (!existing) throw new ApiError(404, "Service not found");

  if (service?.trim()) {
    const duplicate = await Service.findOne({
      name: service.trim(),
      _id: { $ne: serviceId },
    });
    if (duplicate)
      throw new ApiError(409, "Service with this name already exists");
    existing.name = service.trim();
  }

  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, "Category not found");
    existing.category = categoryId;
  }

  await existing.save();

  await existing.populate([
    { path: "category", select: "_id name" },
    { path: "addedBy", select: "_id name email role" },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, "Service updated successfully", existing));
});

const deleteService = asyncHandler(async (req, res) => {
  const { serviceId } = req.body ?? {};

  if (!serviceId) throw new ApiError(400, "serviceId is required");

  const service = await Service.findById(serviceId);
  if (!service) throw new ApiError(404, "Service not found");

  await Service.findByIdAndDelete(serviceId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Service deleted successfully", null));
});

export { addService, updateService, deleteService, getServices };
