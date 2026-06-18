import { Router } from "express";
import {
  addService,
  updateService,
  deleteService,
  getServices,
} from "../controllers/service.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/addService", verifyToken, addService);
router.patch("/updateService", verifyToken, updateService);
router.delete("/deleteService", verifyToken, deleteService);
router.get("/getAllServices", getServices);

export default router;
