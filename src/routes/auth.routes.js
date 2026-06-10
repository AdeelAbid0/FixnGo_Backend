import { Router } from "express";
import {
  registerCustomer,
  registerPartner,
  login,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register/customer", registerCustomer);
router.post("/register/partner", registerPartner);
router.post("/login", login);

export default router;
