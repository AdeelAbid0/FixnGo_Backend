import { Router } from "express";
import { getStats } from "../controllers/dashboard.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = Router();

router.get("/getStats", verifyToken, requireRole("superadmin"), getStats);

export default router;
