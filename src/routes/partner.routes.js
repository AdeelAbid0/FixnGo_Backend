import { Router } from "express";
import {
  getAllPartners,
  updatePartnerStatus,
} from "../controllers/partner.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/getAllPartners", verifyToken, getAllPartners);
router.patch("/updateStatus", verifyToken, updatePartnerStatus);

export default router;
