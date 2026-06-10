import { Router } from "express";
import {
  registerCustomer,
  registerPartner,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register/customer", registerCustomer);
router.post("/register/partner", registerPartner);

export default router;
