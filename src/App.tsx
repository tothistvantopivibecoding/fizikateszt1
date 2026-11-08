/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ThreeCanvas } from './components/ThreeCanvas';
import { HeaderInfo } from './components/HeaderInfo';
import { BottomDock } from './components/BottomDock';
import { PointCharge, SimulationSettings, ProbeState } from './types/physics';

export default function App() {
  // Main electrostatic simulation settings
  const [settings, setSettings] = useState<SimulationSettings>({
    chargeType: 'positive',
    chargeMagnitude: 2.5,
    chargeSeparation: 2.2,
    showFieldLines: true,
    fieldLinesCount: 28,
    showAnimatedFlow: true,
    flowSpeed: 1.0,
    showVectorField: true,
    vectorDensity: 'medium',
    showEquipotentials: true,
    equipotentialCount: 3,
    equipotentialOpacity: 0.22,
    showOuterSphere: true,
    outerSphereRadius: 5.0,
    outerSphereOpacity: 0.22,
    showGridLines: true,
    showSlicePlane: false,
    slicePlaneAxis: 'xy',
    autoRotate: true,
    rotationSpeed: 0.7,
    colorTheme: 'electric',
    permittivity: 1.0,
  });

  // Interactive Test Charge Probe state
  const [probe, setProbe] = useState<ProbeState>({
    enabled: true,
    x: 2.0,
    y: 1.4,
    z: 1.6,
    q: 0.5,
    isTracing: false,
    path: [],
  });

  // Real-time calculated field metrics at test charge position
  const [metrics, setMetrics] = useState({
    fieldMag: 0,
    potential: 0,
    forceMag: 0,
    dirX: 0,
    dirY: 0,
    dirZ: 0,
  });

  // Bottom dock collapse state
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  // Compute point charges based on user configuration
  const charges: PointCharge[] = useMemo(() => {
    const qMag = settings.chargeMagnitude;
    const sep = settings.chargeSeparation;

    switch (settings.chargeType) {
      case 'positive':
        return [
          {
            id: 'c-pos-center',
            x: 0,
            y: 0,
            z: 0,
            q: qMag,
            radius: 0.36,
            color: '#ef4444',
          },
        ];
      case 'negative':
        return [
          {
            id: 'c-neg-center',
            x: 0,
            y: 0,
            z: 0,
            q: -qMag,
            radius: 0.36,
            color: '#3b82f6',
          },
        ];
      case 'dipole':
        return [
          {
            id: 'c-dipole-pos',
            x: -sep / 2,
            y: 0,
            z: 0,
            q: qMag,
            radius: 0.32,
            color: '#ef4444',
          },
          {
            id: 'c-dipole-neg',
            x: sep / 2,
            y: 0,
            z: 0,
            q: -qMag,
            radius: 0.32,
            color: '#3b82f6',
          },
        ];
      case 'quadrupole':
        return [
          {
            id: 'c-quad-1',
            x: -sep / 2,
            y: -sep / 2,
            z: 0,
            q: qMag,
            radius: 0.28,
            color: '#ef4444',
          },
          {
            id: 'c-quad-2',
            x: sep / 2,
            y: -sep / 2,
            z: 0,
            q: -qMag,
            radius: 0.28,
            color: '#3b82f6',
          },
          {
            id: 'c-quad-3',
            x: sep / 2,
            y: sep / 2,
            z: 0,
            q: qMag,
            radius: 0.28,
            color: '#ef4444',
          },
          {
            id: 'c-quad-4',
            x: -sep / 2,
            y: sep / 2,
            z: 0,
            q: -qMag,
            radius: 0.28,
            color: '#3b82f6',
          },
        ];
      default:
        return [
          {
            id: 'c-default',
            x: 0,
            y: 0,
            z: 0,
            q: qMag,
            radius: 0.36,
            color: '#ef4444',
          },
        ];
    }
  }, [settings.chargeType, settings.chargeMagnitude, settings.chargeSeparation]);

  // Update simulation settings
  const handleUpdateSettings = useCallback((newSettings: Partial<SimulationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Update test probe
  const handleUpdateProbe = useCallback((newProbe: Partial<ProbeState>) => {
    setProbe((prev) => ({ ...prev, ...newProbe }));
  }, []);

  // Reset probe position
  const handleResetProbe = useCallback(() => {
    setProbe((prev) => ({
      ...prev,
      x: 2.0,
      y: 1.4,
      z: 1.6,
      isTracing: false,
      path: [],
    }));
  }, []);

  // Keyboard shortcuts handler (H: toggle dock, Space: toggle auto-rotate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, autoRotate: !prev.autoRotate }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Camera presets triggers
  const cameraActionRef = useRef<((view: 'perspective' | 'top' | 'front' | 'isometric') => void) | null>(null);

  const handleSetCameraView = useCallback((view: 'perspective' | 'top' | 'front' | 'isometric') => {
    if (cameraActionRef.current) {
      cameraActionRef.current(view);
    }
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <ThreeCanvas
        settings={settings}
        charges={charges}
        probe={probe}
        onUpdateProbe={handleUpdateProbe}
        onFieldMetricsUpdate={setMetrics}
        onInitCameraControls={(ctrls) => {
          cameraActionRef.current = ctrls.setView;
        }}
      />

      {/* Top Header & Live Physics HUD */}
      <HeaderInfo
        settings={settings}
        charges={charges}
        probe={probe}
        metrics={metrics}
        isDockCollapsed={isDockCollapsed}
        onToggleDock={() => setIsDockCollapsed((prev) => !prev)}
        onResetCamera={() => handleSetCameraView('perspective')}
      />

      {/* Consolidated Collapsible Bottom Dock (Center-Bottom, zero viewport obstruction) */}
      <BottomDock
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        probe={probe}
        onUpdateProbe={handleUpdateProbe}
        onResetProbe={handleResetProbe}
        onSetCameraView={handleSetCameraView}
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
      />
    </main>
  );
}
