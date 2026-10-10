import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import categoriesRouter from "./routes/categories.js";
import neighborhoodsRouter from "./routes/neighborhoods.js";
import providersRouter from "./routes/providers.js";
import demoIdentitiesRouter from "./routes/demo-identities.js";
import serviceRequestsRouter from "./routes/service-requests.js";
import conversationsRouter from "./routes/conversations.js";
import quotesRouter from "./routes/quotes.js";

const app = express();

app.use(
  cors({
    origin: [
      /^http:\/\/localhost:517[3-9]$/,
      /^http:\/\/127\.0\.0\.1:517[3-9]$/,
    ],
  }),
);
app.use(express.json());

app.use("/api/categories", categoriesRouter);
app.use("/api/neighborhoods", neighborhoodsRouter);
app.use("/api/providers", providersRouter);
app.use("/api/demo-identities", demoIdentitiesRouter);
app.use("/api/service-requests", serviceRequestsRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api", quotesRouter);

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "marketplace-api",
  });
});

app.use("/api", (_request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: "Rota não encontrada." },
  });
});

app.use(errorHandler);

export default app;
