import type { ErrorRequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed") {
    response.status(400).json({ error: { code: "INVALID_JSON", message: "O corpo da requisição não contém JSON válido." } });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "O conteúdo enviado excede o limite permitido." } });
    return;
  }

  // Keep database details and connection configuration out of client responses and logs.
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Não foi possível concluir a consulta. Tente novamente.",
    },
  });
};
