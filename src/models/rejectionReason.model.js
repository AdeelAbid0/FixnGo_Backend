import mongoose from "mongoose";

const rejectionReasonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const RejectionReason = mongoose.model("RejectionReason", rejectionReasonSchema);
export { RejectionReason };
