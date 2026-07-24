import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
  },
  { timestamps: true }
);

bookmarkSchema.index({ customer: 1, partner: 1 }, { unique: true });

const Bookmark = mongoose.model("Bookmark", bookmarkSchema);
export { Bookmark };
