import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import serviceRouter from "./routes/service.routes.js";
import partnerRouter from "./routes/partner.routes.js";
import categoryRouter from "./routes/category.routes.js";
import rejectionReasonRouter from "./routes/rejectionReason.routes.js";

const app = express();

// coniguration for express app
// app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true })); // to allow cross-origin requests from the frontend and allow cookies to be sent with requests
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50kb" })); // to parse json data sent from client in body of request and set limit to 50kb to prevent large payloads
app.use(urlencoded({ extended: true })); // to parse urlencoded data sent from client in parameters of url
app.use(express.static("public")); // to serve static files like images, css, js from the public folder
app.use(cookieParser()); // to get access to cookies of user in browser to perform crud operations on database

// routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/partners", partnerRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/rejection-reasons", rejectionReasonRouter);

// global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
  });
});

export default app;
