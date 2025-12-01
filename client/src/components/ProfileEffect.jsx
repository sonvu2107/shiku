/**
 * ProfileEffect - Hiệu ứng động trên profile
 * Các hiệu ứng: sparkle, flames, snow, petals, lightning, aura, galaxy
 */

import { memo, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Cấu hình hiệu ứng
const EFFECT_CONFIG = {
  effect_sparkle: {
    name: 'Tinh Quang',
    particles: 25,
    icon: '✨',
    colors: ['#FFD700', '#FFF8DC', '#FFFACD', '#FFEFD5', '#FFFFFF'],
    size: { min: 3, max: 8 },
    duration: { min: 0.8, max: 2 },
    type: 'sparkle'
  },
  effect_flames: {
    name: 'Hỏa Diễm',
    particles: 35,
    icon: '🔥',
    colors: ['#FF4500', '#FF6347', '#FF7F50', '#FFA500', '#FFD700', '#FFFF00'],
    size: { min: 6, max: 16 },
    duration: { min: 0.6, max: 1.5 },
    type: 'flames'
  },
  effect_snow: {
    name: 'Tuyết Hoa',
    particles: 30,
    icon: '❄️',
    colors: ['#FFFFFF', '#E0FFFF', '#B0E0E6', '#ADD8E6'],
    size: { min: 4, max: 12 },
    duration: { min: 3, max: 6 },
    type: 'snow'
  },
  effect_petals: {
    name: 'Hoa Vũ',
    particles: 15,
    icon: '🌸',
    colors: ['#FFB7C5', '#FFC0CB', '#FF69B4', '#FFE4E1'],
    size: { min: 10, max: 18 },
    duration: { min: 4, max: 7 },
    type: 'petals'
  },
  effect_lightning: {
    name: 'Lôi Điện',
    particles: 5,
    icon: '⚡',
    colors: ['#00BFFF', '#1E90FF', '#87CEEB', '#FFFFFF', '#E0FFFF'],
    size: { min: 2, max: 4 },
    duration: { min: 0.15, max: 0.4 },
    type: 'lightning'
  },
  effect_aura: {
    name: 'Linh Khí',
    particles: 20,
    icon: '💫',
    colors: ['#9370DB', '#8A2BE2', '#BA55D3', '#DDA0DD', '#EE82EE', '#FF00FF'],
    size: { min: 4, max: 10 },
    duration: { min: 1.5, max: 3 },
    type: 'aura'
  },
  effect_galaxy: {
    name: 'Tinh Hà',
    particles: 60,
    icon: '🌌',
    colors: ['#4B0082', '#8B008B', '#9400D3', '#DA70D6', '#FFD700', '#FFFFFF', '#00CED1', '#FF1493'],
    size: { min: 1, max: 5 },
    duration: { min: 3, max: 8 },
    type: 'galaxy'
  }
};

// Random helper
const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max));
const randomItem = (arr) => arr[randomInt(0, arr.length)];

// Sparkle Particle - Lấp lánh như sao
const SparkleParticle = memo(function SparkleParticle({ config, containerWidth, containerHeight, index }) {
  const initialX = useMemo(() => random(0, containerWidth), [containerWidth]);
  const initialY = useMemo(() => random(0, containerHeight), [containerHeight]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(config.size.min, config.size.max), [config.size]);
  const duration = useMemo(() => random(config.duration.min, config.duration.max), [config.duration]);
  const delay = useMemo(() => random(0, 2), []);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: initialX,
        top: initialY,
        width: size,
        height: size,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 1, 0],
      }}
      transition={{ 
        duration,
        repeat: Infinity,
        repeatDelay: random(0.3, 1.5),
        delay,
        ease: "easeInOut"
      }}
    >
      {/* 4-pointed star shape */}
      <svg width={size * 2} height={size * 2} viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 ${size}px ${color})` }}>
        <path
          d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z"
          fill={color}
        />
      </svg>
    </motion.div>
  );
});

// Flame Particle - Ngọn lửa realistic
const FlameParticle = memo(function FlameParticle({ config, containerWidth, containerHeight, index }) {
  const initialX = useMemo(() => random(containerWidth * 0.1, containerWidth * 0.9), [containerWidth]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(config.size.min, config.size.max), [config.size]);
  const duration = useMemo(() => random(config.duration.min, config.duration.max), [config.duration]);
  const delay = useMemo(() => random(0, 1), []);
  const swayAmount = useMemo(() => random(-15, 15), []);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: initialX,
        bottom: 0,
        width: size,
        height: size * 1.5,
        background: `radial-gradient(ellipse at bottom, ${color} 0%, transparent 70%)`,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        filter: `blur(1px)`,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0, y: 0, scale: 1 }}
      animate={{ 
        opacity: [0.9, 1, 0.8, 0],
        y: [0, -containerHeight * 0.3, -containerHeight * 0.5],
        x: [0, swayAmount, swayAmount * 0.5],
        scale: [1, 0.8, 0.3],
      }}
      transition={{ 
        duration,
        repeat: Infinity,
        delay,
        ease: "easeOut"
      }}
    />
  );
});

// Snow Particle - Tuyết rơi (giữ nguyên)
const SnowParticle = memo(function SnowParticle({ config, containerWidth, containerHeight, index }) {
  const initialX = useMemo(() => random(0, containerWidth), [containerWidth]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(config.size.min, config.size.max), [config.size]);
  const duration = useMemo(() => random(config.duration.min, config.duration.max), [config.duration]);
  const delay = useMemo(() => random(0, 3), []);
  const swayAmount = useMemo(() => random(-30, 30), []);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: initialX,
        top: -20,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
        boxShadow: `0 0 ${size/2}px ${color}`,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0.8, y: -20 }}
      animate={{ 
        opacity: [0.8, 1, 0.6],
        y: containerHeight + 20,
        x: [0, swayAmount, 0],
      }}
      transition={{ 
        duration,
        repeat: Infinity,
        delay,
        ease: "linear"
      }}
    />
  );
});

// Petal Particle - Cánh hoa (giữ nguyên)
const PetalParticle = memo(function PetalParticle({ config, containerWidth, containerHeight, index }) {
  const initialX = useMemo(() => random(0, containerWidth), [containerWidth]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(config.size.min, config.size.max), [config.size]);
  const duration = useMemo(() => random(config.duration.min, config.duration.max), [config.duration]);
  const delay = useMemo(() => random(0, 3), []);
  const rotateEnd = useMemo(() => random(-360, 360), []);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: initialX,
        top: -20,
        width: size,
        height: size * 0.6,
        background: `linear-gradient(135deg, ${color} 0%, ${color}88 100%)`,
        borderRadius: '50% 0 50% 50%',
        boxShadow: `0 0 ${size/3}px ${color}`,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0.9, y: -20, rotate: 0 }}
      animate={{ 
        opacity: [0.9, 1, 0.7],
        y: containerHeight + 20,
        x: [0, random(-50, 50), random(-30, 30)],
        rotate: [0, rotateEnd / 2, rotateEnd],
      }}
      transition={{ 
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut"
      }}
    />
  );
});

// Lightning Bolt - Sấm chớp thực tế
const LightningBolt = memo(function LightningBolt({ config, containerWidth, containerHeight, index }) {
  const startX = useMemo(() => random(containerWidth * 0.2, containerWidth * 0.8), [containerWidth]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const duration = useMemo(() => random(config.duration.min, config.duration.max), [config.duration]);
  const delay = useMemo(() => random(1, 4), []);
  
  // Generate zigzag path
  const generatePath = useMemo(() => {
    let path = `M ${startX} 0 `;
    let currentX = startX;
    let currentY = 0;
    const segments = randomInt(4, 7);
    const segmentHeight = containerHeight / segments;
    
    for (let i = 0; i < segments; i++) {
      currentX += random(-40, 40);
      currentY += segmentHeight;
      path += `L ${currentX} ${currentY} `;
    }
    return path;
  }, [startX, containerHeight]);

  return (
    <motion.svg
      width={containerWidth}
      height={containerHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0.5, 1, 0] }}
      transition={{ 
        duration,
        repeat: Infinity,
        repeatDelay: delay,
        times: [0, 0.1, 0.2, 0.3, 0.4, 1]
      }}
    >
      <defs>
        <filter id={`glow-${index}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path
        d={generatePath}
        stroke={color}
        strokeWidth={random(2, 4)}
        fill="none"
        filter={`url(#glow-${index})`}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
});

// Aura Particle - Linh khí xoáy
const AuraParticle = memo(function AuraParticle({ config, containerWidth, containerHeight, index }) {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const angle = useMemo(() => (index / config.particles) * Math.PI * 2, [index, config.particles]);
  const radius = useMemo(() => random(50, Math.min(containerWidth, containerHeight) * 0.4), [containerWidth, containerHeight]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(config.size.min, config.size.max), [config.size]);
  const duration = useMemo(() => random(config.duration.min, config.duration.max), [config.duration]);
  const delay = useMemo(() => (index / config.particles) * 0.5, [index, config.particles]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: centerX,
        top: centerY,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
        boxShadow: `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}50`,
        pointerEvents: 'none',
      }}
      initial={{ 
        opacity: 0, 
        x: Math.cos(angle) * radius * 0.3,
        y: Math.sin(angle) * radius * 0.3,
        scale: 0
      }}
      animate={{ 
        opacity: [0, 0.8, 0.6, 0],
        x: [
          Math.cos(angle) * radius * 0.3,
          Math.cos(angle + Math.PI) * radius,
          Math.cos(angle + Math.PI * 2) * radius * 1.2
        ],
        y: [
          Math.sin(angle) * radius * 0.3,
          Math.sin(angle + Math.PI) * radius,
          Math.sin(angle + Math.PI * 2) * radius * 1.2
        ],
        scale: [0.5, 1, 0.3],
      }}
      transition={{ 
        duration: duration * 2,
        repeat: Infinity,
        delay,
        ease: "easeInOut"
      }}
    />
  );
});

// Galaxy Star - Ngôi sao trong dải ngân hà
const GalaxyStar = memo(function GalaxyStar({ config, containerWidth, containerHeight, index }) {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const spiralAngle = useMemo(() => (index / config.particles) * Math.PI * 4, [index, config.particles]);
  const spiralRadius = useMemo(() => (index / config.particles) * Math.min(containerWidth, containerHeight) * 0.45 + 20, [index, containerWidth, containerHeight, config.particles]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(config.size.min, config.size.max), [config.size]);
  const twinkleSpeed = useMemo(() => random(0.5, 1.5), []);

  const x = centerX + Math.cos(spiralAngle) * spiralRadius;
  const y = centerY + Math.sin(spiralAngle) * spiralRadius * 0.5; // Flatten for perspective

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
        boxShadow: `0 0 ${size}px ${color}`,
        pointerEvents: 'none',
      }}
      animate={{ 
        opacity: [0.3, 1, 0.3],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{ 
        duration: twinkleSpeed,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
});

// Galaxy Rotation Overlay
const GalaxyOverlay = memo(function GalaxyOverlay({ containerWidth, containerHeight }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at center, 
            rgba(75, 0, 130, 0.15) 0%, 
            rgba(138, 43, 226, 0.08) 30%,
            transparent 70%
          )
        `,
        pointerEvents: 'none',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
    />
  );
});

// Aura Glow Overlay
const AuraOverlay = memo(function AuraOverlay() {
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at center, 
            rgba(147, 112, 219, 0.2) 0%, 
            rgba(138, 43, 226, 0.1) 40%,
            transparent 70%
          )
        `,
        pointerEvents: 'none',
      }}
      animate={{ 
        opacity: [0.4, 0.7, 0.4],
        scale: [1, 1.05, 1]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
});

// Lightning Flash Overlay
const LightningFlash = memo(function LightningFlash() {
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(135, 206, 250, 0.1)',
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.3, 0, 0.15, 0] }}
      transition={{ 
        duration: 0.5,
        repeat: Infinity,
        repeatDelay: random(2, 4),
        times: [0, 0.1, 0.2, 0.3, 1]
      }}
    />
  );
});

// Main ProfileEffect component
const ProfileEffect = memo(function ProfileEffect({ 
  effectId, 
  containerRef,
  className = ""
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const config = EFFECT_CONFIG[effectId];
  
  useEffect(() => {
    if (!containerRef?.current) return;
    
    const updateDimensions = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);
  
  if (!config || dimensions.width === 0) return null;

  const renderParticles = () => {
    switch (config.type) {
      case 'sparkle':
        return Array.from({ length: config.particles }).map((_, i) => (
          <SparkleParticle 
            key={`sparkle-${i}`}
            config={config}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            index={i}
          />
        ));
      
      case 'flames':
        return Array.from({ length: config.particles }).map((_, i) => (
          <FlameParticle 
            key={`flame-${i}`}
            config={config}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            index={i}
          />
        ));
      
      case 'snow':
        return Array.from({ length: config.particles }).map((_, i) => (
          <SnowParticle 
            key={`snow-${i}`}
            config={config}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            index={i}
          />
        ));
      
      case 'petals':
        return Array.from({ length: config.particles }).map((_, i) => (
          <PetalParticle 
            key={`petal-${i}`}
            config={config}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            index={i}
          />
        ));
      
      case 'lightning':
        return (
          <>
            <LightningFlash />
            {Array.from({ length: config.particles }).map((_, i) => (
              <LightningBolt 
                key={`lightning-${i}`}
                config={config}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
          </>
        );
      
      case 'aura':
        return (
          <>
            <AuraOverlay />
            {Array.from({ length: config.particles }).map((_, i) => (
              <AuraParticle 
                key={`aura-${i}`}
                config={config}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
          </>
        );
      
      case 'galaxy':
        return (
          <>
            <GalaxyOverlay containerWidth={dimensions.width} containerHeight={dimensions.height} />
            {Array.from({ length: config.particles }).map((_, i) => (
              <GalaxyStar 
                key={`galaxy-${i}`}
                config={config}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
          </>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none z-10 ${className}`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {renderParticles()}
      </AnimatePresence>
    </div>
  );
});

// Export config for use in other components
export { EFFECT_CONFIG };
export default ProfileEffect;
