import { Router } from "express";
import {
  createBooking,
  getAllBookings,
  getBookingsByCustomerId,
  getBookingsByPartnerId,
  cancelBooking,
  acceptBooking,
} from "../controllers/booking.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/createBooking", verifyToken, createBooking);
router.get("/getAllBookings", verifyToken, getAllBookings);
router.get("/getBookingsByCustomerId", verifyToken, getBookingsByCustomerId);
router.get("/getBookingsByPartnerId", verifyToken, getBookingsByPartnerId);
router.patch("/cancelBooking", verifyToken, cancelBooking);
router.patch("/acceptBooking", verifyToken, acceptBooking);

export default router;
