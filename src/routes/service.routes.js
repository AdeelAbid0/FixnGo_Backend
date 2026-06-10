import { Router } from "express";
import { addServices, getServices } from "../controllers/service.controller.js";

const router = Router();

router.post("/addServices", addServices);
router.get("/getAllServices", getServices);

export default router;
