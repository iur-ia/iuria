/**
 * Authentication Module - iuria LexFutura
 * JWT-based authentication with bcrypt password hashing
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "iuria-lexfutura-secret-key-change-in-production-2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const BCRYPT_ROUNDS = 12;

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash a plain-text password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plain-text password with a bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  // Support legacy plain-text passwords during migration
  if (!hash.startsWith("$2a$") && !hash.startsWith("$2b$")) {
    return password === hash;
  }
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for authenticated user
 */
export function generateToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extract JWT token from Authorization header or cookie
 */
function extractToken(req: Request): string | null {
  // 1. Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 2. Check cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc, c) => {
      const [key, val] = c.trim().split("=");
      if (key && val) acc[key] = val;
      return acc;
    }, {} as Record<string, string>);
    if (cookies["iuria_token"]) {
      return cookies["iuria_token"];
    }
  }

  return null;
}

/**
 * Authentication middleware - protects routes requiring login
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: "Token de autenticacao nao fornecido" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Token invalido ou expirado" });
    return;
  }

  req.userId = payload.userId;
  req.userRole = payload.role;
  next();
}

/**
 * Optional auth - populates user info if token is present, but doesn't block
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.userRole = payload.role;
    }
  }
  next();
}

/**
 * Admin-only middleware - requires admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Acesso restrito a administradores" });
    return;
  }
  next();
}

/**
 * Set auth cookie on response
 */
export function setAuthCookie(res: Response, token: string): void {
  res.setHeader("Set-Cookie", [
    `iuria_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
  ]);
}

/**
 * Clear auth cookie on response (logout)
 */
export function clearAuthCookie(res: Response): void {
  res.setHeader("Set-Cookie", [
    `iuria_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
  ]);
}
