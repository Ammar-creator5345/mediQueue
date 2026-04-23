import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, type UserRole } from "../models/User";

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function getJwtSecret(): string {
  const s = process.env["JWT_SECRET"];
  if (!s) throw new Error("JWT_SECRET is required");
  return s;
}

export function signToken(user: { id: string; role: UserRole; email: string; name: string }): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "7d" });
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
    const userDoc = await User.findById(decoded.id);
    if (!userDoc) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }
    req.user = {
      id: userDoc._id.toString(),
      role: userDoc.role,
      email: userDoc.email,
      name: userDoc.name,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
