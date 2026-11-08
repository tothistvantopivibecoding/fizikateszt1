export type ChargeType = 'positive' | 'negative' | 'dipole' | 'quadrupole' | 'custom';

export interface PointCharge {
  id: string;
  x: number;
  y: number;
  z: number;
  q: number; // in microCoulombs (e.g. +2 or -2)
  radius: number;
  color: string;
}

export interface Streamline {
  points: [number, number, number][];
  totalLength: number;
  chargeId: string;
}

export interface FieldVectorData {
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  magnitude: number;
  potential: number;
}

export interface SimulationSettings {
  chargeType: ChargeType;
  chargeMagnitude: number; // 0.5 to 5.0 microCoulombs
  chargeSeparation: number; // for dipole / quadrupole
  showFieldLines: boolean;
  fieldLinesCount: number; // e.g. 16, 24, 32
  showAnimatedFlow: boolean;
  flowSpeed: number; // 0.2 to 2.0
  showVectorField: boolean;
  vectorDensity: 'low' | 'medium' | 'high';
  showEquipotentials: boolean;
  equipotentialCount: number; // 2, 3, 4, 5
  equipotentialOpacity: number;
  showOuterSphere: boolean;
  outerSphereRadius: number; // default 5.0
  outerSphereOpacity: number; // default 0.2
  showGridLines: boolean;
  showSlicePlane: boolean;
  slicePlaneAxis: 'xy' | 'xz' | 'yz';
  autoRotate: boolean;
  rotationSpeed: number;
  colorTheme: 'electric' | 'scientific' | 'plasma' | 'cyber';
  permittivity: number; // dielectric relative permittivity (1.0 = vacuum/air, 2.0, 4.0)
}

export interface ProbeState {
  enabled: boolean;
  x: number;
  y: number;
  z: number;
  q: number; // test charge magnitude (e.g. +0.5 microCoulombs)
  isTracing: boolean;
  path: [number, number, number][];
}
