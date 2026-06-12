import { Router } from "express";
import {
  registerCustomer,
  registerPartner,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/register/customer", registerCustomer);
router.post("/register/partner", upload.array("serviceImages", 5), registerPartner);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/forgot-password/resend-otp", resendForgotPasswordOtp);
router.post("/forgot-password/verify-otp", verifyForgotPasswordOtp);
router.post("/reset-password", resetPassword);

export default router;
