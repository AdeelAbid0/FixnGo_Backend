import { Router } from "express";
import {
  addCategory,
  getAllCategories,
} from "../controllers/category.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/addCategory", verifyToken, addCategory);
router.get("/getAllCategories", getAllCategories);

export default router;
