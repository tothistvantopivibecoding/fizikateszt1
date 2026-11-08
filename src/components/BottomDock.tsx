import React, { useState } from 'react';
import { SimulationSettings, ChargeType, ProbeState } from '../types/physics';
import {
  Sliders,
  Layers,
  Globe,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BottomDockProps {
  settings: SimulationSettings;
  onUpdateSettings: (settings: Partial<SimulationSettings>) => void;
  probe: ProbeState;
  onUpdateProbe: (probe: Partial<ProbeState>) => void;
  onResetProbe: () => void;
  onSetCameraView: (view: 'perspective' | 'top' | 'front' | 'isometric') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type TabType = 'charges' | 'field' | 'sphere' | 'probe' | 'camera';

export const BottomDock: React.FC<BottomDockProps> = ({
  settings,
  onUpdateSettings,
  probe,
  onUpdateProbe,
  onResetProbe,
  onSetCameraView,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('charges');

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-[940px] px-3 transition-transform duration-300 ease-out select-none ${
        isCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Tab Handle */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 border-t border-x border-slate-700/80 rounded-t-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vezérlők megjelenítése</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Vezérlők elrejtése</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Container */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-3 md:p-4 text-slate-200">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 pb-3 mb-3 border-b border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('charges')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'charges'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Töltések ({settings.chargeType})</span>
          </button>

          <button
            onClick={() => setActiveTab('field')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'field'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Erőtér & Vektorok</span>
          </button>

          <button
            onClick={() => setActiveTab('sphere')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'sphere'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Átlátszó Burok & Stílus</span>
          </button>

          <button
            onClick={() => setActiveTab('probe')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'probe'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Próbatöltés ({probe.enabled ? 'Aktív' : 'Ki'})</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'camera'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Nézet & Forgatás</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="min-h-[110px] text-xs">
          {/* 1. CHARGES TAB */}
          {activeTab === 'charges' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Charge configuration buttons */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Töltés elrendezés:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onUpdateSettings({ chargeType: 'positive' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      settings.chargeType === 'positive'
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    +Q Pozitív
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ chargeType: 'negative' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      settings.chargeType === 'negative'
                        ? 'bg-blue-500/20 border-blue-500/60 text-blue-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    −Q Negatív
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ chargeType: 'dipole' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      settings.chargeType === 'dipole'
                        ? 'bg-purple-500/20 border-purple-500/60 text-purple-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    ±Q Dipólus
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ chargeType: 'quadrupole' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      settings.chargeType === 'quadrupole'
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Kvadrupólus
                  </button>
                </div>
              </div>

              {/* Charge magnitude slider */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Töltés nagysága (|Q|):</span>
                    <span className="font-mono text-cyan-300 font-semibold">
                      {settings.chargeMagnitude.toFixed(1)} µC
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={settings.chargeMagnitude}
                    onChange={(e) =>
                      onUpdateSettings({ chargeMagnitude: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Separation slider if dipole/quadrupole */}
                {(settings.chargeType === 'dipole' || settings.chargeType === 'quadrupole') && (
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Töltéstávolság (d):</span>
                      <span className="font-mono text-cyan-300 font-semibold">
                        {settings.chargeSeparation.toFixed(1)} egység
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.1"
                      value={settings.chargeSeparation}
                      onChange={(e) =>
                        onUpdateSettings({ chargeSeparation: parseFloat(e.target.value) })
                      }
                      className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Dielectric medium */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Közeg permittivitása (εᵣ):</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {settings.permittivity === 1
                      ? '1.0 (Vákuum/Levegő)'
                      : `${settings.permittivity.toFixed(1)} (Dielektrikum)`}
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.5"
                  value={settings.permittivity}
                  onChange={(e) =>
                    onUpdateSettings({ permittivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-2">
                  A permittivitás növelésével a térerősség csökken a dielektromos polarizáció miatt.
                </p>
              </div>
            </div>
          )}

          {/* 2. FIELD & VECTORS TAB */}
          {activeTab === 'field' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field lines controls */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showFieldLines}
                      onChange={(e) => onUpdateSettings({ showFieldLines: e.target.checked })}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="font-medium text-slate-200">Erővonalak (Streamlines)</span>
                  </label>
                  <span className="font-mono text-cyan-300 text-[11px]">
                    {settings.fieldLinesCount} db
                  </span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="48"
                  step="4"
                  disabled={!settings.showFieldLines}
                  value={settings.fieldLinesCount}
                  onChange={(e) =>
                    onUpdateSettings({ fieldLinesCount: parseInt(e.target.value) })
                  }
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showAnimatedFlow}
                      onChange={(e) => onUpdateSettings({ showAnimatedFlow: e.target.checked })}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="text-slate-300">Áramló részecskék</span>
                  </label>
                  <span className="font-mono text-cyan-300 text-[11px]">
                    {settings.flowSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.2"
                  disabled={!settings.showAnimatedFlow}
                  value={settings.flowSpeed}
                  onChange={(e) =>
                    onUpdateSettings({ flowSpeed: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                />
              </div>

              {/* 3D Vector field arrows */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showVectorField}
                      onChange={(e) => onUpdateSettings({ showVectorField: e.target.checked })}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="font-medium text-slate-200">3D Vektormező Nyilai</span>
                  </label>
                </div>

                <div className="text-slate-400 text-[11px] mb-1">Vektorháló sűrűsége:</div>
                <div className="grid grid-cols-3 gap-1">
                  {(['low', 'medium', 'high'] as const).map((d) => (
                    <button
                      key={d}
                      disabled={!settings.showVectorField}
                      onClick={() => onUpdateSettings({ vectorDensity: d })}
                      className={`py-1 rounded text-center text-[11px] font-medium border transition-colors ${
                        settings.vectorDensity === d
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      } disabled:opacity-30`}
                    >
                      {d === 'low' ? 'Kevés' : d === 'medium' ? 'Közepes' : 'Sűrű'}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showSlicePlane}
                      onChange={(e) => onUpdateSettings({ showSlicePlane: e.target.checked })}
                      className="accent-emerald-400 rounded cursor-pointer"
                    />
                    <span className="text-slate-300">Potenciál Hőtérkép Szeletsík</span>
                  </label>
                </div>
              </div>

              {/* Equipotential surfaces */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showEquipotentials}
                      onChange={(e) =>
                        onUpdateSettings({ showEquipotentials: e.target.checked })
                      }
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                    <span className="font-medium text-slate-200">Ekvipotenciális Gömbhéjak</span>
                  </label>
                  <span className="font-mono text-cyan-300 text-[11px]">
                    {settings.equipotentialCount} héj
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  disabled={!settings.showEquipotentials}
                  value={settings.equipotentialCount}
                  onChange={(e) =>
                    onUpdateSettings({ equipotentialCount: parseInt(e.target.value) })
                  }
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                />

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Héjak átlátszósága:</span>
                  <span className="font-mono text-cyan-300">
                    {(settings.equipotentialOpacity * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  disabled={!settings.showEquipotentials}
                  value={settings.equipotentialOpacity}
                  onChange={(e) =>
                    onUpdateSettings({ equipotentialOpacity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                />
              </div>
            </div>
          )}

          {/* 3. TRANSPARENT SPHERE & STYLE TAB */}
          {activeTab === 'sphere' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Outer transparent boundary sphere */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showOuterSphere}
                    onChange={(e) => onUpdateSettings({ showOuterSphere: e.target.checked })}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="font-medium text-slate-200">Átlátszó Zárógömb</span>
                </label>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Gömb átlátszósága:</span>
                  <span className="font-mono text-cyan-300">
                    {(settings.outerSphereOpacity * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.45"
                  step="0.05"
                  disabled={!settings.showOuterSphere}
                  value={settings.outerSphereOpacity}
                  onChange={(e) =>
                    onUpdateSettings({ outerSphereOpacity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                />

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={settings.showGridLines}
                    onChange={(e) => onUpdateSettings({ showGridLines: e.target.checked })}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="text-slate-300">Fokbeosztás & Körgyűrűk</span>
                </label>
              </div>

              {/* Sphere Radius */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-slate-400">
                  <span>Gömb határsugara (R):</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {settings.outerSphereRadius.toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="3.5"
                  max="6.5"
                  step="0.5"
                  value={settings.outerSphereRadius}
                  onChange={(e) =>
                    onUpdateSettings({ outerSphereRadius: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  A gömb felületén kilépő erővonalak fluxusa a Gauss-tétel alapján kiszámítható:
                  Φ = ∮ E · dA.
                </p>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Színtéma (Térkép):</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'electric', label: 'Neon Elektromos' },
                    { id: 'scientific', label: 'Tudományos (Jet)' },
                    { id: 'plasma', label: 'Plazma Arany' },
                    { id: 'cyber', label: 'Kiberpunk' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() =>
                        onUpdateSettings({ colorTheme: theme.id as SimulationSettings['colorTheme'] })
                      }
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                        settings.colorTheme === theme.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. TEST PROBE TAB */}
          {activeTab === 'probe' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Probe toggle & charge */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={probe.enabled}
                    onChange={(e) => onUpdateProbe({ enabled: e.target.checked })}
                    className="accent-amber-400 rounded cursor-pointer"
                  />
                  <span className="font-medium text-amber-300">Próbatöltés Megjelenítése</span>
                </label>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Próbatöltés nagysága (q₀):</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {probe.q > 0 ? `+${probe.q.toFixed(1)}` : probe.q.toFixed(1)} µC
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateProbe({ q: 0.5 })}
                    className={`flex-1 py-1 rounded text-[11px] border ${
                      probe.q > 0
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    +0.5 µC (Pozitív)
                  </button>
                  <button
                    onClick={() => onUpdateProbe({ q: -0.5 })}
                    className={`flex-1 py-1 rounded text-[11px] border ${
                      probe.q < 0
                        ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    −0.5 µC (Negatív)
                  </button>
                </div>

                {/* Release / Trace button */}
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={!probe.enabled}
                    onClick={() => onUpdateProbe({ isTracing: !probe.isTracing })}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      probe.isTracing
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    } disabled:opacity-30`}
                  >
                    {probe.isTracing ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Megállítás</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Elengedés (Mozgás)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={onResetProbe}
                    title="Próbatöltés visszaállítása és nyomvonal törlése"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Coordinates sliders */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>X pozíció:</span>
                    <span className="font-mono text-cyan-300">{probe.x.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="-4.0"
                    max="4.0"
                    step="0.1"
                    disabled={!probe.enabled || probe.isTracing}
                    value={probe.x}
                    onChange={(e) => onUpdateProbe({ x: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Y pozíció:</span>
                    <span className="font-mono text-cyan-300">{probe.y.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="-4.0"
                    max="4.0"
                    step="0.1"
                    disabled={!probe.enabled || probe.isTracing}
                    value={probe.y}
                    onChange={(e) => onUpdateProbe({ y: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Z pozíció:</span>
                    <span className="font-mono text-cyan-300">{probe.z.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="-4.0"
                    max="4.0"
                    step="0.1"
                    disabled={!probe.enabled || probe.isTracing}
                    value={probe.z}
                    onChange={(e) => onUpdateProbe({ z: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                  />
                </div>
              </div>

              {/* Information text */}
              <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-slate-400">
                <div className="text-amber-400 font-semibold">Coulomb-erővektor:</div>
                <p className="text-[11px] leading-relaxed">
                  A piros nyíl a próbatöltésre ható pillanatnyi erőt ábrázolja:
                  <span className="block font-mono text-cyan-300 my-1">F = q₀ · E</span>
                  Az &apos;Elengedés&apos; gomb megnyomásával a töltés a valós Coulomb-erők mentén gyorsul
                  és trajektóriát húz maga után!
                </p>
              </div>
            </div>
          )}

          {/* 5. CAMERA & ROTATION TAB */}
          {activeTab === 'camera' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Auto rotate toggle & speed */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoRotate}
                    onChange={(e) => onUpdateSettings({ autoRotate: e.target.checked })}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="font-medium text-slate-200">Automatikus Körbeforgatás</span>
                </label>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Forgatási sebesség:</span>
                  <span className="font-mono text-cyan-300">
                    {settings.rotationSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.2"
                  disabled={!settings.autoRotate}
                  value={settings.rotationSpeed}
                  onChange={(e) =>
                    onUpdateSettings({ rotationSpeed: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                />
              </div>

              {/* Camera preset viewpoints */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Nézőpont Beállítás:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onSetCameraView('perspective')}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Izometrikus / Térbeli
                  </button>
                  <button
                    onClick={() => onSetCameraView('top')}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Felülnézet (XY)
                  </button>
                  <button
                    onClick={() => onSetCameraView('front')}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Elölnézet (XZ)
                  </button>
                  <button
                    onClick={() => onSetCameraView('isometric')}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Alapértelmezett
                  </button>
                </div>
              </div>

              {/* Rotation instructions */}
              <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1 text-slate-400">
                <div className="text-cyan-400 font-semibold">Egér & Érintésvezérlés:</div>
                <ul className="text-[11px] space-y-0.5 list-disc list-inside">
                  <li><b className="text-slate-300">Bal egérgomb / 1 ujj:</b> 360°-os forgatás</li>
                  <li><b className="text-slate-300">Görgetés / 2 ujj:</b> Közelítés / Távolítás</li>
                  <li><b className="text-slate-300">Jobb egérgomb / 2 ujjas húzás:</b> Eltolás</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
