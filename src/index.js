import "dotenv/config";
import connectDB from "./db/index.js";
import app from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1); // Exit the process with an error code
  });
