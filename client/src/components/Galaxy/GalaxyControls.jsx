import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GalaxyControls({ values, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key, value) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 hidden md:block">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-4 w-80 shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-sm">Galaxy Settings</h3>
              <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Toggles */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-300">Mouse Interaction</label>
                <input
                  type="checkbox"
                  checked={values.mouseInteraction}
                  onChange={(e) => handleChange('mouseInteraction', e.target.checked)}
                  className="accent-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-300">Mouse Repulsion</label>
                <input
                  type="checkbox"
                  checked={values.mouseRepulsion}
                  onChange={(e) => handleChange('mouseRepulsion', e.target.checked)}
                  className="accent-white"
                />
              </div>

              {/* Sliders */}
              <ControlSlider label="Density" value={values.density} min={0} max={5} step={0.1} onChange={(v) => handleChange('density', v)} />
              <ControlSlider label="Glow Intensity" value={values.glowIntensity} min={0} max={2} step={0.1} onChange={(v) => handleChange('glowIntensity', v)} />
              <ControlSlider label="Saturation" value={values.saturation} min={0} max={1} step={0.1} onChange={(v) => handleChange('saturation', v)} />
              <ControlSlider label="Hue Shift" value={values.hueShift} min={0} max={360} step={1} onChange={(v) => handleChange('hueShift', v)} />
              <ControlSlider label="Twinkle Intensity" value={values.twinkleIntensity} min={0} max={1} step={0.1} onChange={(v) => handleChange('twinkleIntensity', v)} />
              <ControlSlider label="Rotation Speed" value={values.rotationSpeed} min={-1} max={1} step={0.01} onChange={(v) => handleChange('rotationSpeed', v)} />
              <ControlSlider label="Repulsion Strength" value={values.repulsionStrength} min={0} max={10} step={0.1} onChange={(v) => handleChange('repulsionStrength', v)} />
              <ControlSlider label="Auto Center Repulsion" value={values.autoCenterRepulsion} min={0} max={5} step={0.1} onChange={(v) => handleChange('autoCenterRepulsion', v)} />
              <ControlSlider label="Star Speed" value={values.starSpeed} min={0} max={2} step={0.1} onChange={(v) => handleChange('starSpeed', v)} />
              <ControlSlider label="Animation Speed" value={values.speed} min={0} max={5} step={0.1} onChange={(v) => handleChange('speed', v)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-3 rounded-full text-white transition-all shadow-lg ml-auto block"
      >
        <Settings size={20} />
      </button>
    </div>
  );
}

const ControlSlider = ({ label, value, min, max, step, onChange }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-neutral-400">{label}</span>
      <span className="text-neutral-500 font-mono">{typeof value === 'number' ? value.toFixed(2) : value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
    />
  </div>
);
