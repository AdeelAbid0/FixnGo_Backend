import { User } from "../models/user.model.js";
import { Partner } from "../models/partner.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if ([name, email, password].some((field) => !field || !field.trim())) {
    throw new ApiError(400, "name, email and password are required");
  }
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await User.create({ name, email, password, role: "customer" });

  const createdUser = await User.findById(user._id).select("-password");

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Customer registered successfully", createdUser)
    );
});

const registerPartner = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    businessName,
    longitude,
    latitude,
    services,
  } = req.body;

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

  if (!Array.isArray(services) || services.length === 0) {
    throw new ApiError(400, "services must be a non-empty array");
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

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await User.create({
    name: fullName,
    email,
    phone,
    role: "partner",
  });

  const partner = await Partner.create({
    user: user._id,
    businessName,
    location: {
      type: "Point",
      coordinates: [parsedLng, parsedLat],
    },
    services,
  });

  const partnerData = await Partner.findById(partner._id).populate(
    "user",
    "-password"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Partner registered successfully", partnerData));
});

export { registerCustomer, registerPartner };
