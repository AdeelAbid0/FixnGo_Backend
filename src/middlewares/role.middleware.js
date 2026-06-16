import { ApiError } from "../utils/ApiError.js";

export const requireRole = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new ApiError(403, "Forbidden: Insufficient permissions");
    }
    next();
  };
