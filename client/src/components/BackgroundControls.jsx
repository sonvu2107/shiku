import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BackgroundControls({ config, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTypeChange = (type) => {
    onChange({ ...config, type });
  };

  const handleConfigChange = (key, value) => {
    const type = config.type;
    onChange({
      ...config,
      [type]: {
        ...config[type],
        [key]: value
      }
    });
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
              <h3 className="text-white font-bold text-sm">Background Settings</h3>
              <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Type Selector */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-400 uppercase font-semibold tracking-wider">Effect Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['galaxy', 'gridscan', 'lightrays'].map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTypeChange(t)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        config.type === t
                          ? 'bg-white text-black shadow-lg'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/10" />

              {/* Dynamic Controls */}
              <div className="space-y-4">
                {config.type === 'galaxy' && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-neutral-300">Mouse Interaction</label>
                      <input
                        type="checkbox"
                        checked={config.galaxy.mouseInteraction}
                        onChange={(e) => handleConfigChange('mouseInteraction', e.target.checked)}
                        className="accent-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-neutral-300">Mouse Repulsion</label>
                      <input
                        type="checkbox"
                        checked={config.galaxy.mouseRepulsion}
                        onChange={(e) => handleConfigChange('mouseRepulsion', e.target.checked)}
                        className="accent-white"
                      />
                    </div>
                    <ControlSlider label="Density" value={config.galaxy.density} min={0} max={5} step={0.1} onChange={(v) => handleConfigChange('density', v)} />
                    <ControlSlider label="Glow Intensity" value={config.galaxy.glowIntensity} min={0} max={2} step={0.1} onChange={(v) => handleConfigChange('glowIntensity', v)} />
                    <ControlSlider label="Saturation" value={config.galaxy.saturation} min={0} max={1} step={0.1} onChange={(v) => handleConfigChange('saturation', v)} />
                    <ControlSlider label="Hue Shift" value={config.galaxy.hueShift} min={0} max={360} step={1} onChange={(v) => handleConfigChange('hueShift', v)} />
                    <ControlSlider label="Twinkle Intensity" value={config.galaxy.twinkleIntensity} min={0} max={1} step={0.1} onChange={(v) => handleConfigChange('twinkleIntensity', v)} />
                    <ControlSlider label="Rotation Speed" value={config.galaxy.rotationSpeed} min={-1} max={1} step={0.01} onChange={(v) => handleConfigChange('rotationSpeed', v)} />
                    <ControlSlider label="Repulsion Strength" value={config.galaxy.repulsionStrength} min={0} max={10} step={0.1} onChange={(v) => handleConfigChange('repulsionStrength', v)} />
                    <ControlSlider label="Star Speed" value={config.galaxy.starSpeed} min={0} max={2} step={0.1} onChange={(v) => handleConfigChange('starSpeed', v)} />
                  </>
                )}

                {config.type === 'gridscan' && (
                  <>
                    <ControlSlider label="Grid Scale" value={config.gridscan.gridScale} min={0.01} max={0.5} step={0.01} onChange={(v) => handleConfigChange('gridScale', v)} />
                    <ControlSlider label="Line Thickness" value={config.gridscan.lineThickness} min={0.1} max={5} step={0.1} onChange={(v) => handleConfigChange('lineThickness', v)} />
                    <ControlSlider label="Scan Opacity" value={config.gridscan.scanOpacity} min={0} max={1} step={0.05} onChange={(v) => handleConfigChange('scanOpacity', v)} />
                    <ControlSlider label="Bloom Intensity" value={config.gridscan.bloomIntensity} min={0} max={5} step={0.1} onChange={(v) => handleConfigChange('bloomIntensity', v)} />
                    <ControlSlider label="Scan Duration" value={config.gridscan.scanDuration} min={0.1} max={5} step={0.1} onChange={(v) => handleConfigChange('scanDuration', v)} />
                    <ControlSlider label="Noise Intensity" value={config.gridscan.noiseIntensity} min={0} max={0.2} step={0.001} onChange={(v) => handleConfigChange('noiseIntensity', v)} />
                  </>
                )}

                {config.type === 'lightrays' && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-neutral-300">Follow Mouse</label>
                      <input
                        type="checkbox"
                        checked={config.lightrays.followMouse}
                        onChange={(e) => handleConfigChange('followMouse', e.target.checked)}
                        className="accent-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-neutral-300">Pulsating</label>
                      <input
                        type="checkbox"
                        checked={config.lightrays.pulsating}
                        onChange={(e) => handleConfigChange('pulsating', e.target.checked)}
                        className="accent-white"
                      />
                    </div>
                    <ControlSlider label="Rays Speed" value={config.lightrays.raysSpeed} min={0} max={5} step={0.1} onChange={(v) => handleConfigChange('raysSpeed', v)} />
                    <ControlSlider label="Light Spread" value={config.lightrays.lightSpread} min={0.1} max={5} step={0.1} onChange={(v) => handleConfigChange('lightSpread', v)} />
                    <ControlSlider label="Ray Length" value={config.lightrays.rayLength} min={0.1} max={5} step={0.1} onChange={(v) => handleConfigChange('rayLength', v)} />
                    <ControlSlider label="Mouse Influence" value={config.lightrays.mouseInfluence} min={0} max={1} step={0.05} onChange={(v) => handleConfigChange('mouseInfluence', v)} />
                    <ControlSlider label="Saturation" value={config.lightrays.saturation} min={0} max={2} step={0.1} onChange={(v) => handleConfigChange('saturation', v)} />
                  </>
                )}
              </div>
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
