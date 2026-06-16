import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    duration: { type: String, trim: true },
    price: { type: Number },
    isActive: { type: Boolean, default: true },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);
export { Service };
