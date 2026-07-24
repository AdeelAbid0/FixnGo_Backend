import { Router } from "express";
import {
  getAllPartners,
  updatePartnerStatus,
  getActivePartners,
  addPartner,
  removePartner,
  getRemovedPartners,
  addPartnerService,
  updatePartnerService,
  getPartnerServices,
  getAllPartnerServices,
  getPartnersByService,
  getServicesByFilter,
  getPartnersByFilter,
  getPartnerProfile,
  updatePartnerProfile,
  getPartnerNotificationSettings,
  updatePartnerNotificationSettings,
  getBusinessHours,
  updateBusinessHours,
  getBusinessInfo,
  updateBusinessInfo,
  getBusinessImages,
  updateBusinessImages,
  getAvailabilityStatus,
  updateAvailabilityStatus,
} from "../controllers/partner.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/getAllPartners", getAllPartners);
router.get("/getActivePartners", getActivePartners);
router.patch("/updateStatus", verifyToken, updatePartnerStatus);
router.post(
  "/addPartner",
  verifyToken,
  requireRole("superadmin"),
  upload.array("serviceImages"),
  addPartner
);
router.delete(
  "/removePartner",
  verifyToken,
  requireRole("superadmin"),
  removePartner
);
router.get("/getRemovedPartners", verifyToken, getRemovedPartners);

router.post("/addPartnerService", verifyToken, addPartnerService);
router.patch("/updatePartnerService", verifyToken, updatePartnerService);
router.get("/getPartnerServices", getPartnerServices);
router.get("/getAllPartnerServices", getAllPartnerServices);
router.get("/getPartnersByService", getPartnersByService);
router.get("/getServicesByFilter", getServicesByFilter);
router.get("/getPartnersByFilter", getPartnersByFilter);

router.get("/profile", verifyToken, requireRole("partner"), getPartnerProfile);
router.patch(
  "/profile",
  verifyToken,
  requireRole("partner"),
  upload.single("profileImage"),
  updatePartnerProfile
);

router.get(
  "/getNotificationSettings",
  verifyToken,
  requireRole("partner"),
  getPartnerNotificationSettings
);
router.patch(
  "/updateNotificationSettings",
  verifyToken,
  requireRole("partner"),
  updatePartnerNotificationSettings
);

router.get(
  "/getBusinessHours",
  verifyToken,
  requireRole("partner"),
  getBusinessHours
);
router.patch(
  "/updateBusinessHours",
  verifyToken,
  requireRole("partner"),
  updateBusinessHours
);

router.get(
  "/getBusinessInfo",
  verifyToken,
  requireRole("partner"),
  getBusinessInfo
);
router.patch(
  "/updateBusinessInfo",
  verifyToken,
  requireRole("partner"),
  updateBusinessInfo
);

router.get(
  "/getBusinessImages",
  verifyToken,
  requireRole("partner"),
  getBusinessImages
);
router.patch(
  "/updateBusinessImages",
  verifyToken,
  requireRole("partner"),
  upload.array("serviceImages"),
  updateBusinessImages
);

router.get(
  "/getAvailabilityStatus",
  verifyToken,
  requireRole("partner"),
  getAvailabilityStatus
);
router.patch(
  "/updateAvailabilityStatus",
  verifyToken,
  requireRole("partner"),
  updateAvailabilityStatus
);

export default router;
