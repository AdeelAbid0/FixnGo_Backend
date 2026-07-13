import "dotenv/config";
import connectDB from "./db/index.js";
import app from "./app.js";
import { User } from "./models/user.model.js";

const ensureSuperAdmin = async () => {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) return;

  const exists = await User.findOne({ email });
  if (!exists) {
    await User.create({
      name: "Super Admin",
      email,
      password,
      role: "superadmin",
    });
    console.log("Superadmin created.");
  }
};

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

connectDB()
  .then(async () => {
    await ensureSuperAdmin();
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  });
