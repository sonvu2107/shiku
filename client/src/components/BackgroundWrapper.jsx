import React, { useState, useEffect, memo, Suspense, lazy } from 'react';

// =====================================================================
// LAZY LOAD HEAVY BACKGROUND COMPONENTS
// These components use WebGL libraries (THREE.js, OGL, face-api.js)
// Total ~1MB+ - only load when user selects the effect type
// =====================================================================
const Galaxy = lazy(() => import('./Galaxy/Galaxy'));
const GridScan = lazy(() => import('./GridScan/GridScan'));
const LightRays = lazy(() => import('./LightRays/LightRays'));

// Loading fallback for background effects
const BackgroundLoadingFallback = () => (
  <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900 animate-pulse" />
);

// Preload image utility
const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Static image background component with preloading
const StaticBackground = memo(() => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageSrc = '/assets/rrt2.jpg';

  useEffect(() => {
    // Preload the background image
    preloadImage(imageSrc)
      .then(() => setImageLoaded(true))
      .catch(() => setImageLoaded(true)); // Still show even if fails
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Background image with fade-in effect */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-300"
        style={{
          backgroundImage: `url("${imageSrc}")`,
          opacity: imageLoaded ? 1 : 0
        }}
      />
      {/* Placeholder gradient while loading */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900 transition-opacity duration-300"
        style={{ opacity: imageLoaded ? 0 : 1 }}
      />
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50" />
      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
        }}
      />
    </div>
  );
});

StaticBackground.displayName = 'StaticBackground';

export default function BackgroundWrapper({ config }) {
  const { type } = config;

  // Static gradient (no animation) - default, no lazy loading needed
  if (type === 'none') {
    return <StaticBackground />;
  }

  // Heavy effects - lazy loaded with Suspense
  if (type === 'gridscan') {
    return (
      <Suspense fallback={<BackgroundLoadingFallback />}>
        <GridScan {...config.gridscan} />
      </Suspense>
    );
  }

  if (type === 'lightrays') {
    return (
      <Suspense fallback={<BackgroundLoadingFallback />}>
        <LightRays {...config.lightrays} />
      </Suspense>
    );
  }

  if (type === 'galaxy') {
    return (
      <Suspense fallback={<BackgroundLoadingFallback />}>
        <Galaxy {...config.galaxy} />
      </Suspense>
    );
  }

  // Fallback to static background
  return <StaticBackground />;
}

