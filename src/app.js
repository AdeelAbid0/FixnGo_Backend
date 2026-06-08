import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

// coniguration for express app
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true })); // to allow cross-origin requests from the frontend and allow cookies to be sent with requests
app.use(express.json({ limit: "50kb" })); // to parse json data sent from client in body of request and set limit to 50kb to prevent large payloads
app.use(urlencoded({ extended: true })); // to parse urlencoded data sent from client in parameters of url
app.use(express.static("public")); // to serve static files like images, css, js from the public folder
app.use(cookieParser()); // to get access to cookies of user in browser to perform crud operations on database
export default app;
