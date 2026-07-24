import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    businessName: { type: String, trim: true, default: "" },
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    description: { type: String, trim: true },
    serviceImages: [{ type: String }],
    businessHours: [
      {
        _id: false,
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          required: true,
        },
        isOpen: { type: Boolean, default: false },
        startTime: { type: String, default: null },
        endTime: { type: String, default: null },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "inactive"],
      default: "pending",
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "offline"],
      default: "available",
    },
  },
  { timestamps: true }
);

partnerSchema.index({ location: "2dsphere" });

const Partner = mongoose.model("Partner", partnerSchema);
export { Partner };
