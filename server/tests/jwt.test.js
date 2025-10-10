import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from "../src/middleware/jwtSecurity.js";
import {
  __unsafeResetStore
} from "../src/services/refreshTokenStore.js";

describe("JWT security helpers", () => {
  beforeEach(() => {
    __unsafeResetStore();
  });

  it("rejects refresh tokens passed into verifyAccessToken", () => {
    const forgedRefresh = jwt.sign(
      { id: "user-1", role: "user", type: "refresh", jti: "fake-jti" },
      process.env.ACCESS_TOKEN_SECRET,
      { algorithm: "HS256", expiresIn: "1h" }
    );

    expect(() => verifyAccessToken(forgedRefresh)).toThrow("Invalid token type");
  });

  it("rejects refresh tokens signed with the access secret", async () => {
    const invalidRefresh = jwt.sign(
      { id: "user-2", type: "refresh", jti: "legacy-jti" },
      process.env.ACCESS_TOKEN_SECRET,
      { algorithm: "HS256", expiresIn: "30d" }
    );

    await expect(verifyRefreshToken(invalidRefresh)).rejects.toThrow();
  });

  it("issues access tokens with type=access", () => {
    const token = generateAccessToken({ id: "user-3", role: "admin" });
    const payload = verifyAccessToken(token);
    expect(payload.type).toBe("access");
  });
});
