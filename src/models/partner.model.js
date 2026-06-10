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
    services: [{ type: String, trim: true }],
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

partnerSchema.index({ location: "2dsphere" });

const Partner = mongoose.model("Partner", partnerSchema);
export { Partner };
