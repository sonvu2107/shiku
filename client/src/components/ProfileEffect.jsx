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
  effect_aurora: {
    name: 'Cực Quang',
    particles: 8,
    icon: '🌈',
    colors: ['#00FF88', '#00FFCC', '#00CCFF', '#0088FF', '#8800FF', '#FF00CC', '#FF0088'],
    size: { min: 100, max: 200 },
    duration: { min: 4, max: 8 },
    type: 'aurora'
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

// Aurora Light Band - Dải sáng cực quang chính
const AuroraLightBand = memo(function AuroraLightBand({ config, containerWidth, containerHeight, index }) {
  const colors = config.colors;
  const color1 = colors[index % colors.length];
  const color2 = colors[(index + 1) % colors.length];
  const color3 = colors[(index + 2) % colors.length];
  const yOffset = useMemo(() => random(0, containerHeight * 0.3), [containerHeight]);
  const duration = useMemo(() => random(config.duration.min, config.duration.max), [config.duration]);
  const delay = useMemo(() => index * 0.5, [index]);
  const height = useMemo(() => random(containerHeight * 0.15, containerHeight * 0.35), [containerHeight]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: yOffset,
        height: height,
        background: `linear-gradient(180deg, 
          transparent 0%,
          ${color1}40 15%,
          ${color2}60 40%,
          ${color3}50 60%,
          ${color2}40 80%,
          transparent 100%
        )`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
        transformOrigin: 'center center',
      }}
      animate={{
        opacity: [0.3, 0.7, 0.5, 0.8, 0.4, 0.6, 0.3],
        scaleY: [1, 1.3, 0.9, 1.2, 1.1, 0.95, 1],
        y: [0, -20, 10, -15, 5, -10, 0],
        skewX: [0, 3, -2, 4, -3, 2, 0]
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut"
      }}
    />
  );
});

// Aurora Shimmer Particle - Hạt lấp lánh trong cực quang
const AuroraShimmer = memo(function AuroraShimmer({ config, containerWidth, containerHeight, index }) {
  const x = useMemo(() => random(0, containerWidth), [containerWidth]);
  const y = useMemo(() => random(0, containerHeight * 0.6), [containerHeight]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(2, 6), []);
  const duration = useMemo(() => random(1, 3), []);
  const delay = useMemo(() => random(0, 3), []);

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
        boxShadow: `0 0 ${size * 3}px ${color}, 0 0 ${size * 6}px ${color}80`,
        pointerEvents: 'none',
      }}
      animate={{
        opacity: [0, 1, 0.5, 1, 0],
        scale: [0.5, 1.5, 1, 1.3, 0.5],
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

// Aurora Glow Overlay - Ánh sáng nền cực quang
const AuroraGlowOverlay = memo(function AuroraGlowOverlay({ containerWidth, containerHeight }) {
  return (
    <>
      {/* Main gradient glow */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(180deg,
              rgba(0, 255, 136, 0.1) 0%,
              rgba(0, 200, 255, 0.15) 30%,
              rgba(136, 0, 255, 0.1) 60%,
              transparent 100%
            )
          `,
          pointerEvents: 'none',
        }}
        animate={{
          opacity: [0.5, 0.8, 0.6, 0.9, 0.5]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      {/* Vertical light rays */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={`ray-${i}`}
          style={{
            position: 'absolute',
            left: `${10 + i * 20}%`,
            top: 0,
            width: containerWidth * 0.08,
            height: containerHeight * 0.7,
            background: `linear-gradient(180deg, 
              rgba(0, 255, 200, 0.3) 0%, 
              rgba(100, 200, 255, 0.2) 50%,
              transparent 100%
            )`,
            filter: 'blur(10px)',
            pointerEvents: 'none',
            transformOrigin: 'top center',
          }}
          animate={{
            opacity: [0.2, 0.5, 0.3, 0.6, 0.2],
            scaleY: [0.8, 1.2, 0.9, 1.1, 0.8],
            x: [-10, 10, -5, 15, -10]
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut"
          }}
        />
      ))}
    </>
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
        boxShadow: `0 0 ${size / 2}px ${color}`,
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
        boxShadow: `0 0 ${size / 3}px ${color}`,
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
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
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

// Aura Energy Orb - Linh khí cầu năng lượng
const AuraEnergyOrb = memo(function AuraEnergyOrb({ config, containerWidth, containerHeight, index }) {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const angle = useMemo(() => (index / config.particles) * Math.PI * 2, [index, config.particles]);
  const orbitRadius = useMemo(() => random(60, Math.min(containerWidth, containerHeight) * 0.35), [containerWidth, containerHeight]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(config.size.min + 4, config.size.max + 6), [config.size]);
  const orbitDuration = useMemo(() => random(4, 8), []);
  const delay = useMemo(() => (index / config.particles) * 2, [index, config.particles]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: centerX - size / 2,
        top: centerY - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color} 0%, ${color}88 40%, transparent 70%)`,
        boxShadow: `
          0 0 ${size}px ${color},
          0 0 ${size * 2}px ${color}80,
          0 0 ${size * 3}px ${color}40,
          inset 0 0 ${size / 2}px rgba(255,255,255,0.3)
        `,
        pointerEvents: 'none',
      }}
      animate={{
        x: [
          Math.cos(angle) * orbitRadius,
          Math.cos(angle + Math.PI * 0.5) * orbitRadius * 0.8,
          Math.cos(angle + Math.PI) * orbitRadius,
          Math.cos(angle + Math.PI * 1.5) * orbitRadius * 1.2,
          Math.cos(angle + Math.PI * 2) * orbitRadius
        ],
        y: [
          Math.sin(angle) * orbitRadius * 0.6,
          Math.sin(angle + Math.PI * 0.5) * orbitRadius * 0.5,
          Math.sin(angle + Math.PI) * orbitRadius * 0.6,
          Math.sin(angle + Math.PI * 1.5) * orbitRadius * 0.7,
          Math.sin(angle + Math.PI * 2) * orbitRadius * 0.6
        ],
        scale: [1, 1.3, 0.9, 1.2, 1],
        opacity: [0.6, 1, 0.7, 0.9, 0.6]
      }}
      transition={{
        duration: orbitDuration,
        repeat: Infinity,
        delay,
        ease: "easeInOut"
      }}
    />
  );
});

// Aura Swirl Particle - Particles xoáy quanh
const AuraSwirlParticle = memo(function AuraSwirlParticle({ config, containerWidth, containerHeight, index }) {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const startAngle = useMemo(() => (index / 15) * Math.PI * 2, [index]);
  const startRadius = useMemo(() => random(30, 80), []);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(2, 5), []);
  const duration = useMemo(() => random(2, 4), []);
  const delay = useMemo(() => random(0, 2), []);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: centerX,
        top: centerY,
        width: size,
        height: size * 3,
        background: `linear-gradient(to top, ${color} 0%, transparent 100%)`,
        borderRadius: '50%',
        boxShadow: `0 0 ${size * 2}px ${color}`,
        pointerEvents: 'none',
        transformOrigin: 'center center'
      }}
      initial={{
        x: Math.cos(startAngle) * startRadius,
        y: Math.sin(startAngle) * startRadius,
        opacity: 0,
        rotate: startAngle * (180 / Math.PI)
      }}
      animate={{
        x: [
          Math.cos(startAngle) * startRadius,
          Math.cos(startAngle + Math.PI) * startRadius * 1.5,
          Math.cos(startAngle + Math.PI * 2) * startRadius * 2
        ],
        y: [
          Math.sin(startAngle) * startRadius,
          Math.sin(startAngle + Math.PI) * startRadius * 1.5 - 30,
          Math.sin(startAngle + Math.PI * 2) * startRadius * 2 - 60
        ],
        opacity: [0, 0.8, 0],
        scale: [0.5, 1.2, 0.3],
        rotate: [startAngle * (180 / Math.PI), startAngle * (180 / Math.PI) + 180, startAngle * (180 / Math.PI) + 360]
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

// Aura Pulse Ring - Vòng năng lượng lan tỏa
const AuraPulseRing = memo(function AuraPulseRing({ containerWidth, containerHeight, index }) {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const colors = ['#9370DB', '#8A2BE2', '#BA55D3', '#DDA0DD'];
  const color = colors[index % colors.length];
  const delay = index * 0.8;

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: centerX,
        top: centerY,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}, inset 0 0 10px ${color}50`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
      animate={{
        scale: [0.3, 3, 5],
        opacity: [0.8, 0.4, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay,
        ease: "easeOut"
      }}
    />
  );
});

// Galaxy Star - Ngôi sao xoay trong dải ngân hà
const GalaxyStar = memo(function GalaxyStar({ config, containerWidth, containerHeight, index }) {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const armIndex = useMemo(() => index % 3, [index]); // 3 cánh tay xoắn ốc
  const positionInArm = useMemo(() => Math.floor(index / 3), [index]);
  const spiralAngle = useMemo(() => (positionInArm / (config.particles / 3)) * Math.PI * 3 + (armIndex * Math.PI * 2 / 3), [positionInArm, armIndex, config.particles]);
  const spiralRadius = useMemo(() => (positionInArm / (config.particles / 3)) * Math.min(containerWidth, containerHeight) * 0.42 + 15, [positionInArm, containerWidth, containerHeight, config.particles]);
  const color = useMemo(() => randomItem(config.colors), [config.colors]);
  const size = useMemo(() => random(config.size.min, config.size.max + 2), [config.size]);
  const twinkleSpeed = useMemo(() => random(0.3, 1.2), []);
  const rotateOffset = useMemo(() => random(-10, 10), []);

  const x = centerX + Math.cos(spiralAngle) * spiralRadius;
  const y = centerY + Math.sin(spiralAngle) * spiralRadius * 0.45;

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
        boxShadow: `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}60`,
        pointerEvents: 'none',
      }}
      animate={{
        opacity: [0.2, 1, 0.5, 0.9, 0.2],
        scale: [0.6, 1.4, 0.8, 1.2, 0.6],
        rotate: [0, rotateOffset, 0]
      }}
      transition={{
        duration: twinkleSpeed * 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
});

// Galaxy Shooting Star - Sao băng
const GalaxyShootingStar = memo(function GalaxyShootingStar({ containerWidth, containerHeight, index }) {
  const startX = useMemo(() => random(0, containerWidth * 0.7), [containerWidth]);
  const startY = useMemo(() => random(0, containerHeight * 0.4), [containerHeight]);
  const length = useMemo(() => random(50, 120), []);
  const duration = useMemo(() => random(0.6, 1.2), []);
  const delay = useMemo(() => random(2, 8), []);
  const angle = useMemo(() => random(20, 50), []);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: length,
        height: 2,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 20%, #FFFFFF 50%, rgba(200,220,255,0.8) 100%)',
        borderRadius: '2px',
        boxShadow: '0 0 10px #FFFFFF, 0 0 20px rgba(100,150,255,0.5)',
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'left center',
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0, x: 0, y: 0, scaleX: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, containerWidth * 0.4],
        y: [0, containerHeight * 0.3],
        scaleX: [0, 1, 1, 0.5]
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatDelay: delay,
        times: [0, 0.1, 0.7, 1],
        ease: "easeOut"
      }}
    />
  );
});

// Galaxy Nebula Cloud - Tinh vân
const GalaxyNebula = memo(function GalaxyNebula({ containerWidth, containerHeight, index }) {
  const x = useMemo(() => random(containerWidth * 0.1, containerWidth * 0.9), [containerWidth]);
  const y = useMemo(() => random(containerHeight * 0.2, containerHeight * 0.8), [containerHeight]);
  const size = useMemo(() => random(80, 180), []);
  const colors = ['#FF1493', '#8B008B', '#4B0082', '#00CED1', '#9400D3'];
  const color = colors[index % colors.length];
  const duration = useMemo(() => random(8, 15), []);
  const delay = useMemo(() => index * 0.5, [index]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size * 0.6,
        background: `radial-gradient(ellipse at center, ${color}30 0%, ${color}15 40%, transparent 70%)`,
        borderRadius: '50%',
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }}
      animate={{
        opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
        scale: [1, 1.15, 0.95, 1.1, 1],
        x: [0, 15, -10, 5, 0],
        y: [0, -10, 5, -5, 0]
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

// Galaxy Rotation Overlay - Hiệu ứng xoay nền
const GalaxyOverlay = memo(function GalaxyOverlay({ containerWidth, containerHeight }) {
  return (
    <>
      {/* Spiral Arm glow */}
      <motion.div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: containerWidth * 0.8,
          height: containerHeight * 0.5,
          background: `
            conic-gradient(
              from 0deg at 50% 50%,
              rgba(75, 0, 130, 0.2) 0deg,
              transparent 60deg,
              rgba(138, 43, 226, 0.15) 120deg,
              transparent 180deg,
              rgba(255, 20, 147, 0.15) 240deg,
              transparent 300deg,
              rgba(75, 0, 130, 0.2) 360deg
            )
          `,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      {/* Central glow */}
      <motion.div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 80,
          height: 80,
          background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(200,180,255,0.4) 30%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          boxShadow: '0 0 40px rgba(255,255,255,0.5), 0 0 80px rgba(147,112,219,0.3)',
          pointerEvents: 'none',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
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

      case 'aurora':
        return (
          <>
            <AuroraGlowOverlay containerWidth={dimensions.width} containerHeight={dimensions.height} />
            {/* Light bands */}
            {Array.from({ length: config.particles }).map((_, i) => (
              <AuroraLightBand
                key={`aurora-band-${i}`}
                config={config}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
            {/* Shimmer particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <AuroraShimmer
                key={`aurora-shimmer-${i}`}
                config={config}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
          </>
        );

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
            {/* Pulse rings */}
            {Array.from({ length: 4 }).map((_, i) => (
              <AuraPulseRing
                key={`pulse-${i}`}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
            {/* Energy orbs */}
            {Array.from({ length: Math.min(config.particles, 12) }).map((_, i) => (
              <AuraEnergyOrb
                key={`orb-${i}`}
                config={config}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
            {/* Swirl particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <AuraSwirlParticle
                key={`swirl-${i}`}
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
            {/* Nebula clouds */}
            {Array.from({ length: 5 }).map((_, i) => (
              <GalaxyNebula
                key={`nebula-${i}`}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
            {/* Stars */}
            {Array.from({ length: config.particles }).map((_, i) => (
              <GalaxyStar
                key={`galaxy-${i}`}
                config={config}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                index={i}
              />
            ))}
            {/* Shooting stars */}
            {Array.from({ length: 3 }).map((_, i) => (
              <GalaxyShootingStar
                key={`shooting-${i}`}
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
