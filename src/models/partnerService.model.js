import mongoose from "mongoose";

const partnerServiceSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: { type: Number, required: true },
    duration: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const PartnerService = mongoose.model("PartnerService", partnerServiceSchema);
export { PartnerService };
