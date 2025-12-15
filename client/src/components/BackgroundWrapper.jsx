import React, { useState, useEffect, memo } from 'react';
import Galaxy from './Galaxy/Galaxy';
import GridScan from './GridScan/GridScan';
import LightRays from './LightRays/LightRays';

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

  // Static gradient (no animation) - default
  if (type === 'none') {
    return <StaticBackground />;
  }

  if (type === 'gridscan') {
    return <GridScan {...config.gridscan} />;
  }

  if (type === 'lightrays') {
    return <LightRays {...config.lightrays} />;
  }

  if (type === 'galaxy') {
    return <Galaxy {...config.galaxy} />;
  }

  // Fallback to static background
  return <StaticBackground />;
}
