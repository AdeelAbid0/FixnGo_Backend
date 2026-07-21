import { Router } from "express";
import {
  getSuperadminProfile,
  updateSuperadminProfile,
  getSuperadminNotificationSettings,
  updateSuperadminNotificationSettings,
} from "../controllers/superadmin.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/profile", verifyToken, requireRole("superadmin"), getSuperadminProfile);
router.patch(
  "/profile",
  verifyToken,
  requireRole("superadmin"),
  upload.single("profileImage"),
  updateSuperadminProfile
);

router.get(
  "/getNotificationSettings",
  verifyToken,
  requireRole("superadmin"),
  getSuperadminNotificationSettings
);
router.patch(
  "/updateNotificationSettings",
  verifyToken,
  requireRole("superadmin"),
  updateSuperadminNotificationSettings
);

export default router;
