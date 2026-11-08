import { PointCharge, FieldVectorData, Streamline } from '../types/physics';

// Electrostatic constant scaled for 3D visual units (1 unit ~ 10cm, 1 uC scale)
export const K_COULOMB = 8.99; // scaled constant for visual units

/**
 * Calculate electric field E vector at position (x, y, z)
 */
export function calculateElectricField(
  x: number,
  y: number,
  z: number,
  charges: PointCharge[],
  permittivity: number = 1.0
): { ex: number; ey: number; ez: number; magnitude: number } {
  let ex = 0;
  let ey = 0;
  let ez = 0;
  const kEff = K_COULOMB / Math.max(1.0, permittivity);

  for (let i = 0; i < charges.length; i++) {
    const q = charges[i];
    const dx = x - q.x;
    const dy = y - q.y;
    const dz = z - q.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    // Softening core to avoid division by zero inside the charge
    const softenDist = Math.max(0.2, dist);
    const factor = (kEff * q.q) / (softenDist * softenDist * softenDist);

    ex += factor * dx;
    ey += factor * dy;
    ez += factor * dz;
  }

  const magnitude = Math.sqrt(ex * ex + ey * ey + ez * ez);
  return { ex, ey, ez, magnitude };
}

/**
 * Calculate electric potential V at position (x, y, z)
 */
export function calculatePotential(
  x: number,
  y: number,
  z: number,
  charges: PointCharge[],
  permittivity: number = 1.0
): number {
  let potential = 0;
  const kEff = K_COULOMB / Math.max(1.0, permittivity);

  for (let i = 0; i < charges.length; i++) {
    const q = charges[i];
    const dx = x - q.x;
    const dy = y - q.y;
    const dz = z - q.z;
    const dist = Math.max(0.18, Math.sqrt(dx * dx + dy * dy + dz * dz));
    potential += (kEff * q.q) / dist;
  }

  return potential;
}

/**
 * Generate Fibonacci sphere seed points for even angular distribution
 */
export function getFibonacciSpherePoints(samples: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    points.push([x, y, z]);
  }
  return points;
}

/**
 * Trace 3D electric field streamlines using 4th order Runge-Kutta integration
 */
export function traceFieldLines(
  charges: PointCharge[],
  linesPerPositiveCharge: number,
  maxRadius: number = 4.9,
  permittivity: number = 1.0
): Streamline[] {
  const streamlines: Streamline[] = [];
  const stepSize = 0.06;
  const maxSteps = 160;

  // Find positive charges to originate lines from; if none, originate from negative inward
  const positiveCharges = charges.filter((c) => c.q > 0);
  const negativeCharges = charges.filter((c) => c.q < 0);

  const sources = positiveCharges.length > 0 ? positiveCharges : negativeCharges;
  const traceDirection = positiveCharges.length > 0 ? 1 : -1;

  for (const source of sources) {
    const seeds = getFibonacciSpherePoints(linesPerPositiveCharge);
    const seedRadius = source.radius * 1.35;

    for (const [sx, sy, sz] of seeds) {
      let cx = source.x + sx * seedRadius;
      let cy = source.y + sy * seedRadius;
      let cz = source.z + sz * seedRadius;

      const path: [number, number, number][] = [[cx, cy, cz]];
      let totalLength = 0;

      for (let step = 0; step < maxSteps; step++) {
        // RK4 Integration for smooth curve tracing
        const k1 = calculateElectricField(cx, cy, cz, charges, permittivity);
        if (k1.magnitude < 1e-5) break;
        const norm1 = 1 / k1.magnitude;
        const v1x = k1.ex * norm1 * traceDirection;
        const v1y = k1.ey * norm1 * traceDirection;
        const v1z = k1.ez * norm1 * traceDirection;

        const m2x = cx + 0.5 * stepSize * v1x;
        const m2y = cy + 0.5 * stepSize * v1y;
        const m2z = cz + 0.5 * stepSize * v1z;
        const k2 = calculateElectricField(m2x, m2y, m2z, charges, permittivity);
        const norm2 = 1 / (k2.magnitude || 1e-5);
        const v2x = k2.ex * norm2 * traceDirection;
        const v2y = k2.ey * norm2 * traceDirection;
        const v2z = k2.ez * norm2 * traceDirection;

        const m3x = cx + 0.5 * stepSize * v2x;
        const m3y = cy + 0.5 * stepSize * v2y;
        const m3z = cz + 0.5 * stepSize * v2z;
        const k3 = calculateElectricField(m3x, m3y, m3z, charges, permittivity);
        const norm3 = 1 / (k3.magnitude || 1e-5);
        const v3x = k3.ex * norm3 * traceDirection;
        const v3y = k3.ey * norm3 * traceDirection;
        const v3z = k3.ez * norm3 * traceDirection;

        const m4x = cx + stepSize * v3x;
        const m4y = cy + stepSize * v3y;
        const m4z = cz + stepSize * v3z;
        const k4 = calculateElectricField(m4x, m4y, m4z, charges, permittivity);
        const norm4 = 1 / (k4.magnitude || 1e-5);
        const v4x = k4.ex * norm4 * traceDirection;
        const v4y = k4.ey * norm4 * traceDirection;
        const v4z = k4.ez * norm4 * traceDirection;

        const dx = (stepSize / 6) * (v1x + 2 * v2x + 2 * v3x + v4x);
        const dy = (stepSize / 6) * (v1y + 2 * v2y + 2 * v3y + v4y);
        const dz = (stepSize / 6) * (v1z + 2 * v2z + 2 * v3z + v4z);

        const nx = cx + dx;
        const ny = cy + dy;
        const nz = cz + dz;

        const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        totalLength += segLen;
        path.push([nx, ny, nz]);

        cx = nx;
        cy = ny;
        cz = nz;

        // Check boundary limits
        const distFromOrigin = Math.sqrt(cx * cx + cy * cy + cz * cz);
        if (distFromOrigin >= maxRadius) break;

        // Check if entered another charge's absorption radius
        let absorbed = false;
        for (const target of charges) {
          if (target.id === source.id) continue;
          const tdx = cx - target.x;
          const tdy = cy - target.y;
          const tdz = cz - target.z;
          const distToTarget = Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz);
          if (distToTarget <= target.radius * 1.1) {
            path.push([target.x, target.y, target.z]);
            absorbed = true;
            break;
          }
        }
        if (absorbed) break;
      }

      if (path.length > 2) {
        streamlines.push({
          points: path,
          totalLength,
          chargeId: source.id,
        });
      }
    }
  }

  return streamlines;
}

/**
 * Generate 3D vector field grid points inside sphere
 */
export function generateVectorField(
  charges: PointCharge[],
  density: 'low' | 'medium' | 'high',
  maxRadius: number = 4.6,
  permittivity: number = 1.0
): FieldVectorData[] {
  const vectors: FieldVectorData[] = [];
  const count = density === 'low' ? 7 : density === 'medium' ? 9 : 12;
  const step = (maxRadius * 2) / (count - 1);

  for (let i = 0; i < count; i++) {
    const x = -maxRadius + i * step;
    for (let j = 0; j < count; j++) {
      const y = -maxRadius + j * step;
      for (let k = 0; k < count; k++) {
        const z = -maxRadius + k * step;
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > maxRadius || dist < 0.3) continue;

        // Check distance to charges (skip if inside any charge core)
        let tooClose = false;
        for (const charge of charges) {
          const cdx = x - charge.x;
          const cdy = y - charge.y;
          const cdz = z - charge.z;
          if (Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz) < charge.radius * 1.2) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        const field = calculateElectricField(x, y, z, charges, permittivity);
        if (field.magnitude > 0.001) {
          const invMag = 1 / field.magnitude;
          const pot = calculatePotential(x, y, z, charges, permittivity);
          vectors.push({
            x,
            y,
            z,
            dirX: field.ex * invMag,
            dirY: field.ey * invMag,
            dirZ: field.ez * invMag,
            magnitude: field.magnitude,
            potential: pot,
          });
        }
      }
    }
  }

  return vectors;
}

/**
 * Interpolate RGB color according to electric field intensity and chosen color theme
 */
export function getFieldColor(
  normalizedVal: number, // 0.0 to 1.0
  theme: 'electric' | 'scientific' | 'plasma' | 'cyber'
): { r: number; g: number; b: number } {
  const t = Math.max(0, Math.min(1, normalizedVal));

  if (theme === 'electric') {
    // Deep neon blue (low) -> Electric Cyan -> Bright Ice White -> Vivid Pink/Magenta (high)
    if (t < 0.33) {
      const f = t / 0.33;
      return { r: 0.05 + 0.1 * f, g: 0.3 + 0.6 * f, b: 0.95 };
    } else if (t < 0.66) {
      const f = (t - 0.33) / 0.33;
      return { r: 0.15 + 0.7 * f, g: 0.9 + 0.1 * f, b: 0.95 };
    } else {
      const f = (t - 0.66) / 0.34;
      return { r: 0.85 + 0.15 * f, g: 0.95 - 0.6 * f, b: 0.95 - 0.2 * f };
    }
  } else if (theme === 'scientific') {
    // Standard rainbow / JET colormap: Blue -> Cyan -> Green -> Yellow -> Red
    if (t < 0.25) {
      const f = t / 0.25;
      return { r: 0.0, g: f, b: 1.0 };
    } else if (t < 0.5) {
      const f = (t - 0.25) / 0.25;
      return { r: 0.0, g: 1.0, b: 1.0 - f };
    } else if (t < 0.75) {
      const f = (t - 0.5) / 0.25;
      return { r: f, g: 1.0, b: 0.0 };
    } else {
      const f = (t - 0.75) / 0.25;
      return { r: 1.0, g: 1.0 - f, b: 0.0 };
    }
  } else if (theme === 'plasma') {
    // Purple -> Red-Orange -> Gold -> Bright Yellow
    if (t < 0.4) {
      const f = t / 0.4;
      return { r: 0.3 + 0.6 * f, g: 0.05 + 0.1 * f, b: 0.65 - 0.3 * f };
    } else if (t < 0.8) {
      const f = (t - 0.4) / 0.4;
      return { r: 0.9 + 0.1 * f, g: 0.15 + 0.5 * f, b: 0.35 - 0.3 * f };
    } else {
      const f = (t - 0.8) / 0.2;
      return { r: 1.0, g: 0.65 + 0.35 * f, b: 0.05 + 0.3 * f };
    }
  } else {
    // Cyberpunk: Neon Green -> Electric Cyan -> Deep Purple
    if (t < 0.5) {
      const f = t / 0.5;
      return { r: 0.05 * (1 - f), g: 0.95, b: 0.2 + 0.75 * f };
    } else {
      const f = (t - 0.5) / 0.5;
      return { r: 0.05 + 0.85 * f, g: 0.95 - 0.75 * f, b: 0.95 };
    }
  }
}
