import React from 'react';
import Galaxy from './Galaxy/Galaxy';
import GridScan from './GridScan/GridScan';
import LightRays from './LightRays/LightRays';

// Static image background component
const StaticBackground = () => (
  <div className="absolute inset-0 w-full h-full">
    {/* Background image */}
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url("/assets/rrt2.jpg")'
      }}
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
