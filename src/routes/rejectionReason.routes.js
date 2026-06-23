import { Router } from "express";
import {
  addRejectionReason,
  getRejectionReasons,
} from "../controllers/rejectionReason.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = Router();

router.post("/add", verifyToken, requireRole("superadmin"), addRejectionReason);
router.get("/all", verifyToken, getRejectionReasons);

export default router;
