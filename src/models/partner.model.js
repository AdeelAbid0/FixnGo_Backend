import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessName: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    description: { type: String, trim: true },
    serviceImages: [{ type: String }],
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "inactive"],
      default: "pending",
    },
  },
  { timestamps: true }
);

partnerSchema.index({ location: "2dsphere" });

const Partner = mongoose.model("Partner", partnerSchema);
export { Partner };
