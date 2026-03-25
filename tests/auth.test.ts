/**
 * Auth Module Tests - iuria LexFutura
 */
import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, generateToken, verifyToken } from "../server/auth";

describe("Auth Module", () => {
  describe("hashPassword / comparePassword", () => {
    it("should hash and verify a password", async () => {
      const plain = "testPassword123";
      const hashed = await hashPassword(plain);
      
      expect(hashed).toBeTruthy();
      expect(hashed).not.toBe(plain);
      expect(hashed.startsWith("$2a$") || hashed.startsWith("$2b$")).toBe(true);
      
      const match = await comparePassword(plain, hashed);
      expect(match).toBe(true);
    });

    it("should reject wrong password", async () => {
      const hashed = await hashPassword("correctPassword");
      const match = await comparePassword("wrongPassword", hashed);
      expect(match).toBe(false);
    });

    it("should support legacy plain-text comparison", async () => {
      // When stored password is plain text (migration scenario)
      const match = await comparePassword("admin123", "admin123");
      expect(match).toBe(true);
      
      const noMatch = await comparePassword("wrong", "admin123");
      expect(noMatch).toBe(false);
    });
  });

  describe("generateToken / verifyToken", () => {
    it("should generate a valid JWT token", () => {
      const payload = { userId: "test-id", username: "admin", role: "admin" };
      const token = generateToken(payload);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should verify and decode a valid token", () => {
      const payload = { userId: "user-123", username: "testuser", role: "advogado" };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe("user-123");
      expect(decoded?.username).toBe("testuser");
      expect(decoded?.role).toBe("advogado");
    });

    it("should return null for invalid token", () => {
      const decoded = verifyToken("invalid.token.here");
      expect(decoded).toBeNull();
    });

    it("should return null for empty token", () => {
      const decoded = verifyToken("");
      expect(decoded).toBeNull();
    });
  });
});
