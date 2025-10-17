export const buildCookieOptions = (maxAge, overrides = {}) => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = isProduction ? process.env.COOKIE_DOMAIN : undefined;

  return {
    httpOnly: true,
    path: "/",
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: isProduction ? "none" : "lax",
    domain: cookieDomain,  // 🔹 domain đồng bộ
    maxAge,
    ...overrides,
  };
};
