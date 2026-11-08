import React from 'react';
import { PointCharge, SimulationSettings, ProbeState } from '../types/physics';
import { Zap, HelpCircle, Eye, EyeOff, RotateCcw } from 'lucide-react';

interface HeaderInfoProps {
  settings: SimulationSettings;
  charges: PointCharge[];
  probe: ProbeState;
  metrics: {
    fieldMag: number;
    potential: number;
    forceMag: number;
    dirX: number;
    dirY: number;
    dirZ: number;
  };
  isDockCollapsed: boolean;
  onToggleDock: () => void;
  onResetCamera: () => void;
}

export const HeaderInfo: React.FC<HeaderInfoProps> = ({
  settings,
  charges,
  probe,
  metrics,
  isDockCollapsed,
  onToggleDock,
  onResetCamera,
}) => {
  const [showFormulaModal, setShowFormulaModal] = React.useState(false);

  // Total enclosed charge
  const totalCharge = charges.reduce((acc, c) => acc + c.q, 0);

  return (
    <>
      <header className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* App Title Badge */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-xl pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 tracking-wide flex items-center gap-2">
              Elektrosztatikus Tér 3D
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                Three.js PBR
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Interaktív 3D Coulomb-erőtér & ekvipotenciális gömbhéjak
            </p>
          </div>
        </div>

        {/* Live Physics HUD Badges */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Enclosed Charge Badge */}
          <div className="bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono">Q_össz:</span>
            <span
              className={`font-mono font-semibold ${
                totalCharge > 0
                  ? 'text-rose-400'
                  : totalCharge < 0
                  ? 'text-cyan-400'
                  : 'text-amber-400'
              }`}
            >
              {totalCharge > 0 ? `+${totalCharge.toFixed(1)}` : totalCharge.toFixed(1)} µC
            </span>
          </div>

          {/* Test Probe Live Data */}
          {probe.enabled && (
            <div className="hidden sm:flex items-center gap-3 bg-slate-900/90 border border-amber-500/30 px-3 py-1.5 rounded-lg shadow-lg text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-400 font-mono">Próba:</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-300">
                  |E| = <b className="text-cyan-300">{(metrics.fieldMag * 10).toFixed(1)}</b> V/m
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">
                  V = <b className="text-emerald-300">{(metrics.potential * 10).toFixed(1)}</b> V
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">
                  |F| = <b className="text-rose-400">{(metrics.forceMag * 10).toFixed(1)}</b> µN
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <button
            onClick={() => setShowFormulaModal(true)}
            title="Fizikai képletek és összefüggések"
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors shadow-lg"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onResetCamera}
            title="Kamera alaphelyzetbe állítása"
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleDock}
            title={isDockCollapsed ? 'Vezérlők megjelenítése (H)' : 'Vezérlők elrejtése (H)'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition-colors shadow-lg text-xs font-medium"
          >
            {isDockCollapsed ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden md:inline">{isDockCollapsed ? 'Vezérlők' : 'Elrejtés'}</span>
          </button>
        </div>
      </header>

      {/* Physics Formulas Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400">
                <Zap className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100 text-base">Elektrosztatika Fizikai Alapjai</h3>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-slate-100 text-sm px-2 py-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-300">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <div className="text-amber-400 font-semibold font-mono">1. Coulomb-törvény (Elektromos térerősség)</div>
                <div className="font-mono text-cyan-300 text-sm py-1">
                  E = (1 / 4πε₀εᵣ) · (Q / r²) · r̂
                </div>
                <p className="text-slate-400">
                  A ponttöltés körüli térerősség a távolság négyzetével fordítottan arányosan csökken. Pozitív töltésből kifelé, negatív töltésbe befelé mutatnak az erővonalak.
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <div className="text-amber-400 font-semibold font-mono">2. Elektromos Potenciál (V)</div>
                <div className="font-mono text-cyan-300 text-sm py-1">
                  V = (1 / 4πε₀εᵣ) · (Q / r)
                </div>
                <p className="text-slate-400">
                  Az ekvipotenciális felületek gömbhéjak, melyeken az elektromos potenciál állandó. A térerősség-vektorok minden pontban merőlegesek az ekvipotenciális felületekre.
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <div className="text-amber-400 font-semibold font-mono">3. Gauss-tétel (Elektromos fluxus)</div>
                <div className="font-mono text-cyan-300 text-sm py-1">
                  Φ = ∮ E · dA = Q_belső / (ε₀ · εᵣ)
                </div>
                <p className="text-slate-400">
                  Az átlátszó gömbfelületen áthaladó nettó elektromos fluxus egyenesen arányos a gömb belsejében található összes töltéssel.
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <div className="text-amber-400 font-semibold font-mono">4. Erőhatás a próbatöltésre</div>
                <div className="font-mono text-cyan-300 text-sm py-1">
                  F = q₀ · E
                </div>
                <p className="text-slate-400">
                  A térbe helyezett próbatöltésre ható Coulomb-erő arányos a helyi térerősséggel. Az elengedett próbatöltés az erővonal mentén gyorsul.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg transition-colors"
              >
                Értem, bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
