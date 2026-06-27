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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

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
app.get("/api/docs/swagger.json", (_req, res) => res.json(spec));

app.use("/api", mainRoutes);
app.use(errorHandler);

export default app;
