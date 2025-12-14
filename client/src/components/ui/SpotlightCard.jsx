import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "../../utils/cn";

/**
 * SpotlightCard - Card with spotlight effect on hover
 * Optimized: Disabled on mobile/touch devices, throttled mouse move
 * @param {boolean} noOverflow - If true, uses overflow-visible instead of overflow-hidden
 * @param {boolean} disableSpotlight - Force disable spotlight effect
 */
export function SpotlightCard({ children, className = "", onClick, noOverflow = false, disableSpotlight = false }) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const lastMoveTime = useRef(0);

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches
    );
  }, []);

  // Throttled mouse move handler (16ms ~ 60fps)
  const handleMouseMove = useCallback((e) => {
    if (isTouchDevice || disableSpotlight) return;

    const now = Date.now();
    if (now - lastMoveTime.current < 16) return; // Throttle to ~60fps
    lastMoveTime.current = now;

    if (!divRef.current) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isTouchDevice, disableSpotlight]);

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice && !disableSpotlight) setOpacity(1);
  }, [isTouchDevice, disableSpotlight]);

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
  }, []);

  // Skip spotlight rendering completely on touch devices
  const showSpotlight = !isTouchDevice && !disableSpotlight;

  return (
    <div
      ref={divRef}
      onMouseMove={showSpotlight ? handleMouseMove : undefined}
      onMouseEnter={showSpotlight ? handleMouseEnter : undefined}
      onMouseLeave={showSpotlight ? handleMouseLeave : undefined}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-6 transition-all duration-300 hover:shadow-lg",
        noOverflow ? "overflow-visible" : "overflow-hidden",
        onClick && "cursor-pointer",
        !onClick && "cursor-default",
        className
      )}
    >
      {showSpotlight && (
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
          style={{
            opacity,
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(150,150,150,0.1), transparent 40%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

