import React from 'react';
import Galaxy from './Galaxy/Galaxy';
import GridScan from './GridScan/GridScan';
import LightRays from './LightRays/LightRays';

export default function BackgroundWrapper({ config }) {
  const { type } = config;

  if (type === 'gridscan') {
    return <GridScan {...config.gridscan} />;
  }

  if (type === 'lightrays') {
    return <LightRays {...config.lightrays} />;
  }

  // Default to Galaxy
  return <Galaxy {...config.galaxy} />;
}
