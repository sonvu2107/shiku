import { useRef, useState } from "react";
import { cn } from "../../utils/cn";

/**
 * SpotlightCard - Card với spotlight effect khi hover
 * @param {boolean} noOverflow - Nếu true, sẽ dùng overflow-visible thay vì overflow-hidden để cho phép dropdown/popover hiển thị ra ngoài
 */
export function SpotlightCard({ children, className = "", onClick, noOverflow = false }) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-6 transition-all duration-300 hover:shadow-lg",
        noOverflow ? "overflow-visible" : "overflow-hidden",
        onClick && "cursor-pointer",
        !onClick && "cursor-default",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(150,150,150,0.1), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

