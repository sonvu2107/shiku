/**
 * Production Environment Checker
 * 
 * Kiểm tra các environment variables cần thiết cho production.
 * Tự động chạy khi NODE_ENV=production.
 * 
 * @module checkProductionEnv
 */

export function checkProductionEnvironment() {
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!isProduction) {
    console.log("🔧 Development environment detected - skipping production checks");
    return { isValid: true, warnings: [] };
  }

  const requiredVars = [
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET', 
    'MONGODB_URI',
    'NODE_ENV'
  ];

  const recommendedVars = [
    'COOKIE_DOMAIN',
    'CORS_ORIGIN',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check recommended variables
  recommendedVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Missing recommended env var: ${varName}`);
    }
  });

  // Check JWT secrets
  if (process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    warnings.push("JWT_SECRET and REFRESH_TOKEN_SECRET should be different");
  }

  // Check cookie domain for production
  if (isProduction && !process.env.COOKIE_DOMAIN) {
    warnings.push("COOKIE_DOMAIN not set - cookies may not work across subdomains");
  }

  // Check CORS origins
  if (isProduction && !process.env.CORS_ORIGIN) {
    warnings.push("CORS_ORIGIN not set - using default origins");
  }

  const isValid = missing.length === 0;

  if (!isValid) {
    console.error("❌ Production environment validation failed:");
    missing.forEach(varName => {
      console.error(`  - Missing required: ${varName}`);
    });
  }

  if (warnings.length > 0) {
    console.warn("⚠️  Production environment warnings:");
    warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
  }

  if (isValid && warnings.length === 0) {
    console.log("✅ Production environment validation passed");
  }

  return {
    isValid,
    missing,
    warnings,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasCookieDomain: !!process.env.COOKIE_DOMAIN,
      corsOrigin: process.env.CORS_ORIGIN ? "configured" : "default",
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasRefreshSecret: !!process.env.REFRESH_TOKEN_SECRET,
      secretsMatch: process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET
    }
  };
}

// Auto-run check if this file is imported
if (process.env.NODE_ENV === "production") {
  checkProductionEnvironment();
}
