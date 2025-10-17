const isProduction = process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

export function buildCookieOptions(maxAge, overrides = {}) {
  const base = {
    httpOnly: true,
    path: "/",
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge,
    ...overrides
  };

  if (isProduction && cookieDomain) {
    base.domain = cookieDomain;
  }

  if (!isProduction) {
    delete base.domain;
    base.secure = false;
  }

  return base;
}
