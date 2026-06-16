import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  role: { type: String, enum: ["customer", "partner"], required: true },
  otp: { type: String, required: true },
  otpExpiry: { type: Date, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
});

// MongoDB auto-deletes the document once otpExpiry is reached
pendingRegistrationSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 });

const PendingRegistration = mongoose.model(
  "PendingRegistration",
  pendingRegistrationSchema
);
export { PendingRegistration };
