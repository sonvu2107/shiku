/**
 * ProfileEffect - Hiệu ứng động trên profile
 * Các hiệu ứng: sparkle, flames, snow, petals, lightning, aura, galaxy
 */

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Cấu hình hiệu ứng
const EFFECT_CONFIG = {
  effect_sparkle: {
    name: 'Tinh Quang',
    particles: 20,
    icon: '✨',
    colors: ['#FFD700', '#FFF8DC', '#FFFACD', '#FFEFD5'],
    size: { min: 4, max: 10 },
    duration: { min: 1, max: 3 },
    type: 'sparkle'
  },
  effect_flames: {
    name: 'Hỏa Diễm',
    particles: 25,
    icon: '🔥',
    colors: ['#FF4500', '#FF6347', '#FF7F50', '#FFA500', '#FFD700'],
    size: { min: 8, max: 20 },
    duration: { min: 0.8, max: 2 },
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
    particles: 8,
    icon: '⚡',
    colors: ['#00BFFF', '#1E90FF', '#4169E1', '#FFFFFF'],
    size: { min: 20, max: 40 },
    duration: { min: 0.1, max: 0.3 },
    type: 'lightning'
  },
  effect_aura: {
    name: 'Linh Khí',
    particles: 12,
    icon: '💫',
    colors: ['#9370DB', '#8A2BE2', '#BA55D3', '#DDA0DD', '#EE82EE'],
    size: { min: 6, max: 14 },
    duration: { min: 2, max: 4 },
    type: 'aura'
  },
  effect_galaxy: {
    name: 'Tinh Hà',
    particles: 40,
    icon: '🌌',
    colors: ['#4B0082', '#8B008B', '#9400D3', '#DA70D6', '#FFD700', '#FFFFFF'],
    size: { min: 2, max: 8 },
    duration: { min: 2, max: 5 },
    type: 'galaxy'
  }
};

// Random helper
const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max));
const randomItem = (arr) => arr[randomInt(0, arr.length)];

// Particle component
const Particle = memo(function Particle({ config, containerWidth, containerHeight, type }) {
  const [style, setStyle] = useState(null);
  
  useEffect(() => {
    const generateStyle = () => {
      const color = randomItem(config.colors);
      const size = random(config.size.min, config.size.max);
      const duration = random(config.duration.min, config.duration.max);
      
      let x = random(0, containerWidth);
      let y = random(0, containerHeight);
      let animation = {};
      
      switch (type) {
        case 'sparkle':
          animation = {
            initial: { opacity: 0, scale: 0 },
            animate: { 
              opacity: [0, 1, 1, 0], 
              scale: [0, 1, 1.2, 0],
              rotate: [0, 180, 360]
            },
            transition: { 
              duration, 
              repeat: Infinity, 
              repeatDelay: random(0.5, 2)
            }
          };
          break;
          
        case 'flames':
          y = containerHeight - random(10, 50);
          animation = {
            initial: { opacity: 0.8, y: 0 },
            animate: { 
              opacity: [0.8, 1, 0],
              y: [0, -containerHeight * 0.4],
              x: [0, random(-20, 20)],
              scale: [1, 0.5]
            },
            transition: { duration, repeat: Infinity }
          };
          break;
          
        case 'snow':
          y = -20;
          animation = {
            initial: { opacity: 0.8, y: -20 },
            animate: { 
              opacity: [0.8, 1, 0.8],
              y: containerHeight + 20,
              x: [0, random(-30, 30), 0]
            },
            transition: { 
              duration, 
              repeat: Infinity,
              ease: "linear"
            }
          };
          break;
          
        case 'petals':
          y = -20;
          animation = {
            initial: { opacity: 0.9, y: -20, rotate: 0 },
            animate: { 
              opacity: [0.9, 1, 0.7],
              y: containerHeight + 20,
              x: [0, random(-50, 50), random(-30, 30)],
              rotate: [0, random(-180, 180), random(-360, 360)]
            },
            transition: { 
              duration, 
              repeat: Infinity,
              ease: "easeInOut"
            }
          };
          break;
          
        case 'lightning':
          animation = {
            initial: { opacity: 0, scaleY: 0 },
            animate: { 
              opacity: [0, 1, 1, 0],
              scaleY: [0, 1, 1, 0]
            },
            transition: { 
              duration,
              repeat: Infinity,
              repeatDelay: random(2, 5)
            }
          };
          break;
          
        case 'aura':
          x = containerWidth / 2;
          y = containerHeight / 2;
          animation = {
            initial: { opacity: 0, scale: 0 },
            animate: { 
              opacity: [0, 0.6, 0],
              scale: [0.5, 1.5, 2],
              rotate: [0, 360]
            },
            transition: { 
              duration,
              repeat: Infinity,
              repeatDelay: random(0.5, 1.5)
            }
          };
          break;
          
        case 'galaxy':
          const angle = random(0, Math.PI * 2);
          const radius = random(30, Math.min(containerWidth, containerHeight) / 2);
          x = containerWidth / 2 + Math.cos(angle) * radius;
          y = containerHeight / 2 + Math.sin(angle) * radius;
          animation = {
            initial: { opacity: 0, scale: 0 },
            animate: { 
              opacity: [0, 1, 0.5, 0],
              scale: [0, 1, 0.5],
              rotate: [0, 720]
            },
            transition: { 
              duration,
              repeat: Infinity,
              repeatDelay: random(0.5, 2)
            }
          };
          break;
      }
      
      setStyle({
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: type === 'petals' ? '50% 0 50% 50%' : '50%',
        boxShadow: `0 0 ${size}px ${color}`,
        pointerEvents: 'none',
        ...animation
      });
    };
    
    generateStyle();
    
    // Regenerate position periodically for variety
    const interval = setInterval(generateStyle, random(3000, 8000));
    return () => clearInterval(interval);
  }, [config, containerWidth, containerHeight, type]);
  
  if (!style) return null;
  
  return (
    <motion.div
      initial={style.initial}
      animate={style.animate}
      transition={style.transition}
      style={{
        position: style.position,
        left: style.left,
        top: style.top,
        width: style.width,
        height: style.height,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        pointerEvents: style.pointerEvents
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
  
  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none z-10 ${className}`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {Array.from({ length: config.particles }).map((_, i) => (
          <Particle 
            key={`${effectId}-${i}`}
            config={config}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            type={config.type}
          />
        ))}
      </AnimatePresence>
      
      {/* Special overlay effects */}
      {config.type === 'aura' && (
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-purple-500/10 via-transparent to-transparent"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {config.type === 'galaxy' && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(75,0,130,0.1) 0%, transparent 70%)'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
});

// Export config for use in other components
export { EFFECT_CONFIG };
export default ProfileEffect;
