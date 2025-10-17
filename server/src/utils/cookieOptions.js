export const buildCookieOptions = (maxAge, overrides = {}) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  // For production, use more permissive settings for cross-domain cookies
  const cookieDomain = isProduction ? ".shiku.click" : undefined;
  
  return {
    httpOnly: true,
    path: "/",
    secure: isProduction, // Always secure in production
    sameSite: isProduction ? "lax" : "lax", // Use 'lax' for better compatibility
    domain: cookieDomain,
    maxAge,
    ...overrides,
  };
};
