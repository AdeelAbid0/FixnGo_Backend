import mongoose from "mongoose";

const removedPartnerSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
      unique: true,
    },
    reason: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RejectionReason",
      required: true,
    },
  },
  { timestamps: true }
);

const RemovedPartner = mongoose.model("RemovedPartner", removedPartnerSchema);
export { RemovedPartner };
