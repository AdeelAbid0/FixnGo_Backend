import { Router } from "express";
import { addServices, getServices, getServicesByCategory } from "../controllers/service.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/addServices", verifyToken, addServices);
router.get("/getAllServices", verifyToken, getServices);
router.get("/getByCategory/:categoryId", verifyToken, getServicesByCategory);

export default router;
