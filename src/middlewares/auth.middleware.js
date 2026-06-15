import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Unauthorized: Invalid or expired token");
  }

  const user = await User.findById(decoded._id).select(
    "-password -refreshToken"
  );
  if (!user) throw new ApiError(401, "Unauthorized: User not found");

  if (!user.isActive) throw new ApiError(403, "Account is deactivated");

  req.user = user;
  next();
});
