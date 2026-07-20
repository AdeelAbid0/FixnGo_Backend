import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String },
    role: {
      type: String,
      enum: ["customer", "partner", "superadmin"],
      default: "customer",
    },
    phone: { type: String, trim: true },
    profileImage: { type: String, default: "" },
    notificationSettings: {
      partnerMessages: { type: Boolean, default: true },
      paymentInvoiceAlerts: { type: Boolean, default: true },
      bookingReminders: { type: Boolean, default: true },
      promotionsOffers: { type: Boolean, default: true },
      newBookings: { type: Boolean, default: true },
      jobReminders: { type: Boolean, default: true },
      paymentsPayouts: { type: Boolean, default: true },
      reviewsRatings: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String },
    resetOtp: { type: String },
    resetOtpExpiry: { type: Date },
    resetOtpVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, role: this.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

const User = mongoose.model("User", userSchema);
export { User };
