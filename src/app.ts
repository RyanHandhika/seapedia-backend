import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import mainRoutes from "./routes/main.js";
import { spec } from "./docs/openapi.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// Relax CSP only for the docs route so Swagger UI assets load correctly.
app.use("/api/docs", helmet({ contentSecurityPolicy: false }));
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Swagger UI ───────────────────────────────────────────────────────────────
// Interactive docs:  http://localhost:4000/api/docs
// Raw JSON spec:     http://localhost:4000/api/docs/swagger.json
//   → paste that URL into Postman (File → Import → Link) to get a full collection
//
// To authenticate in Swagger UI:
//   1. Call POST /auth/login → copy accessToken
//   2. Click 🔒 Authorize (top right) → paste:  Bearer <accessToken>
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: "SEAPEDIA API Docs",
    customCss: ".swagger-ui .topbar { background-color: #1a56db; }",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  }),
);

// Raw spec endpoint — import into Postman via URL instead of file upload.
app.get("/api/docs/swagger.json", (_req, res) => res.json(spec));

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/api", mainRoutes);
app.use(errorHandler);

export default app;
