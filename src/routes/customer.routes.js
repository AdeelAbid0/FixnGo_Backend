import { Router } from "express";
import {
  getCustomerProfile,
  updateCustomerProfile,
  getNotificationSettings,
  updateNotificationSettings,
  toggleBookmarkPartner,
  getBookmarkedPartners,
} from "../controllers/customer.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/profile", verifyToken, requireRole("customer"), getCustomerProfile);
router.patch(
  "/profile",
  verifyToken,
  requireRole("customer"),
  upload.single("profileImage"),
  updateCustomerProfile
);

router.get(
  "/getNotificationSettings",
  verifyToken,
  requireRole("customer"),
  getNotificationSettings
);
router.patch(
  "/updateNotificationSettings",
  verifyToken,
  requireRole("customer"),
  updateNotificationSettings
);

router.post(
  "/bookmarks/:partnerId",
  verifyToken,
  requireRole("customer"),
  toggleBookmarkPartner
);
router.get(
  "/bookmarks",
  verifyToken,
  requireRole("customer"),
  getBookmarkedPartners
);

export default router;
