import dotenv from "dotenv";
import express, { Express } from "express";
import cors from "cors";
import { RegisterRoutes } from "./generated/routes/routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../dist/swagger/swagger.json" with { type: "json" };

dotenv.config();

const app: Express = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// Swagger UI 연결
const prefixedPaths = Object.fromEntries(
  Object.entries(swaggerDocument.paths).map(([path, val]) => [`/api/v1${path}`, val])
);

const swaggerDoc = {
  ...swaggerDocument,
  paths: prefixedPaths,
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
const router = express.Router();
RegisterRoutes(router);

app.use("/api/v1", router);

export default app;