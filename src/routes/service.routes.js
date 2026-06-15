import { Router } from "express";
import { addServices, getServices } from "../controllers/service.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/addServices", verifyToken, addServices);
router.get("/getAllServices", verifyToken, getServices);

export default router;
