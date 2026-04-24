import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation error", issues: err.issues });
    return;
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: message });
}
