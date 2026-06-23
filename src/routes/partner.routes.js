import { Router } from "express";
import {
  getAllPartners,
  updatePartnerStatus,
  getActivePartners,
  addPartner,
  removePartner,
  getRemovedPartners,
} from "../controllers/partner.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/getAllPartners", getAllPartners);
router.get("/getActivePartners", verifyToken, getActivePartners);
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

export default router;
