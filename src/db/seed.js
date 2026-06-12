import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: "superadmin@gmail.com" });
  if (existing) {
    console.log("Superadmin already exists, skipping.");
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name: "Super Admin",
    email: "superadmin@gmail.com",
    password: "123456",
    role: "superadmin",
  });

  console.log("Superadmin created successfully.");
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
