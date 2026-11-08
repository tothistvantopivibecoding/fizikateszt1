import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PointCharge, SimulationSettings, ProbeState } from '../types/physics';
import {
  calculateElectricField,
  calculatePotential,
  traceFieldLines,
  generateVectorField,
  getFieldColor,
} from '../physics/electrostatics';

interface ThreeCanvasProps {
  settings: SimulationSettings;
  charges: PointCharge[];
  probe: ProbeState;
  onUpdateProbe: (probe: Partial<ProbeState>) => void;
  onFieldMetricsUpdate: (metrics: {
    fieldMag: number;
    potential: number;
    forceMag: number;
    dirX: number;
    dirY: number;
    dirZ: number;
  }) => void;
  onInitCameraControls?: (controls: {
    setView: (view: 'perspective' | 'top' | 'front' | 'isometric') => void;
  }) => void;
}

// Pre-allocated math objects to avoid GC in animation loop
const _vec3 = new THREE.Vector3();
const _vec3Target = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _scale = new THREE.Vector3(1, 1, 1);
const _color = new THREE.Color();
const _arrowUp = new THREE.Vector3(0, 1, 0);

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  settings,
  charges,
  probe,
  onUpdateProbe,
  onFieldMetricsUpdate,
  onInitCameraControls,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Store mutable refs for render loop access without re-binding scene
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const chargesRef = useRef(charges);
  chargesRef.current = charges;
  const probeRef = useRef(probe);
  probeRef.current = probe;

  // Scene object groups
  const chargesGroupRef = useRef<THREE.Group | null>(null);
  const fieldLinesGroupRef = useRef<THREE.Group | null>(null);
  const particlesGroupRef = useRef<THREE.Points | null>(null);
  const vectorMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const equipotentialsGroupRef = useRef<THREE.Group | null>(null);
  const outerSphereGroupRef = useRef<THREE.Group | null>(null);
  const probeGroupRef = useRef<THREE.Group | null>(null);
  const probeTrajectoryRef = useRef<THREE.Line | null>(null);
  const slicePlaneRef = useRef<THREE.Mesh | null>(null);

  // Flow animation data
  const flowDataRef = useRef<{
    positions: Float32Array;
    curveProgress: Float32Array;
    curveLengths: number[];
    curves: THREE.CatmullRomCurve3[];
    speeds: Float32Array;
  } | null>(null);

  // Probe physics animation (when released)
  const probeVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060814); // Deep space dark navy
    scene.fog = new THREE.FogExp2(0x060814, 0.035);

    // 2. Camera setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.set(6.5, 4.2, 8.5);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting rig
    const ambientLight = new THREE.AmbientLight(0x223355, 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x1e1b4b, 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(8, 12, 10);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-8, -4, -10);
    scene.add(rimLight);

    // Ground contact shadow disc
    const shadowGeo = new THREE.PlaneGeometry(12, 12);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(0,0,0,0.6)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -5.1;
    scene.add(shadowMesh);

    // 6. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.0;
    controls.maxDistance = 22.0;
    controls.maxPolarAngle = Math.PI - 0.05;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Camera preset transition target
    const targetCamPos = new THREE.Vector3().copy(camera.position);
    let isTransitioningCam = false;
    let isUserInteracting = false;

    controls.addEventListener('start', () => {
      isUserInteracting = true;
      isTransitioningCam = false;
    });

    controls.addEventListener('end', () => {
      isUserInteracting = false;
    });

    if (onInitCameraControls) {
      onInitCameraControls({
        setView: (view) => {
          controls.target.set(0, 0, 0);
          if (view === 'top') {
            targetCamPos.set(0.01, 11, 0);
          } else if (view === 'front') {
            targetCamPos.set(0, 0, 11);
          } else if (view === 'isometric') {
            targetCamPos.set(7.5, 6.0, 7.5);
          } else {
            targetCamPos.set(6.5, 4.2, 8.5);
          }
          isTransitioningCam = true;
        },
      });
    }

    // 7. Initialize root groups
    const chargesGroup = new THREE.Group();
    scene.add(chargesGroup);
    chargesGroupRef.current = chargesGroup;

    const fieldLinesGroup = new THREE.Group();
    scene.add(fieldLinesGroup);
    fieldLinesGroupRef.current = fieldLinesGroup;

    const equipotentialsGroup = new THREE.Group();
    scene.add(equipotentialsGroup);
    equipotentialsGroupRef.current = equipotentialsGroup;

    const outerSphereGroup = new THREE.Group();
    scene.add(outerSphereGroup);
    outerSphereGroupRef.current = outerSphereGroup;

    const probeGroup = new THREE.Group();
    scene.add(probeGroup);
    probeGroupRef.current = probeGroup;

    // 8. Animation & Render Loop
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          animationFrameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          animationFrameId = window.setTimeout(cb, 60);
        }
      };
      animationFrameId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth camera viewpoint transitions
      if (isTransitioningCam) {
        camera.position.lerp(targetCamPos, 0.08);
        if (camera.position.distanceTo(targetCamPos) < 0.05) {
          camera.position.copy(targetCamPos);
          isTransitioningCam = false;
        }
      }

      // Controls update
      controls.update();

      // Auto rotation
      if (settingsRef.current.autoRotate && !isUserInteracting) {
        scene.rotation.y += delta * 0.25 * settingsRef.current.rotationSpeed;
      }

      // Rotate charge resonance rings and corona
      if (chargesGroupRef.current) {
        chargesGroupRef.current.children.forEach((group) => {
          const rings = group.getObjectByName('resonanceRings');
          if (rings) {
            rings.rotation.x = time * 0.8;
            rings.rotation.y = time * 1.2;
          }
          const corona = group.getObjectByName('chargeCorona');
          if (corona) {
            const scale = 1.0 + 0.05 * Math.sin(time * 4.0);
            corona.scale.set(scale, scale, scale);
          }
        });
      }

      // Animate flowing streamline energy particles
      if (
        settingsRef.current.showAnimatedFlow &&
        flowDataRef.current &&
        particlesGroupRef.current
      ) {
        const { positions, curveProgress, curves, speeds } = flowDataRef.current;
        const particleCount = curveProgress.length;
        const speedMultiplier = settingsRef.current.flowSpeed * 0.45;

        for (let i = 0; i < particleCount; i++) {
          curveProgress[i] = (curveProgress[i] + delta * speeds[i] * speedMultiplier) % 1.0;
          const curveIdx = i % curves.length;
          const curve = curves[curveIdx];
          if (curve) {
            const pt = curve.getPointAt(curveProgress[i]);
            positions[i * 3] = pt.x;
            positions[i * 3 + 1] = pt.y;
            positions[i * 3 + 2] = pt.z;
          }
        }
        particlesGroupRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Animate probe physics if released
      if (probeRef.current.isTracing) {
        const curX = probeRef.current.x;
        const curY = probeRef.current.y;
        const curZ = probeRef.current.z;

        const field = calculateElectricField(
          curX,
          curY,
          curZ,
          chargesRef.current,
          settingsRef.current.permittivity
        );

        // Force = q * E
        const chargeSign = probeRef.current.q;
        const fx = field.ex * chargeSign * 0.6;
        const fy = field.ey * chargeSign * 0.6;
        const fz = field.ez * chargeSign * 0.6;

        // Velocity integration with damping
        probeVelocityRef.current.x = (probeVelocityRef.current.x + fx * delta) * 0.94;
        probeVelocityRef.current.y = (probeVelocityRef.current.y + fy * delta) * 0.94;
        probeVelocityRef.current.z = (probeVelocityRef.current.z + fz * delta) * 0.94;

        const nextX = curX + probeVelocityRef.current.x * delta * 2.5;
        const nextY = curY + probeVelocityRef.current.y * delta * 2.5;
        const nextZ = curZ + probeVelocityRef.current.z * delta * 2.5;

        const dist = Math.sqrt(nextX * nextX + nextY * nextY + nextZ * nextZ);
        if (dist >= settingsRef.current.outerSphereRadius || isNaN(dist)) {
          // Stop tracing if hits boundary
          onUpdateProbe({ isTracing: false });
        } else {
          const newPath: [number, number, number][] = [
            ...probeRef.current.path,
            [nextX, nextY, nextZ],
          ];
          onUpdateProbe({
            x: nextX,
            y: nextY,
            z: nextZ,
            path: newPath.slice(-120),
          });
        }
      }

      // Outer containment sphere gentle glow rotation
      if (outerSphereGroupRef.current) {
        const gimbal = outerSphereGroupRef.current.getObjectByName('gimbalRings');
        if (gimbal) {
          gimbal.rotation.z = time * 0.05;
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (isSoftwareGl) {
      afterDraw(animate);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }

    // Window resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        clearTimeout(animationFrameId);
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // REBUILD CHARGE 3D COMPOSITE MODELS
  // -------------------------------------------------------------
  useEffect(() => {
    const group = chargesGroupRef.current;
    if (!group) return;

    // Clear old charge meshes
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    // Build each charge as a rich 3-6 part procedural model
    charges.forEach((charge) => {
      const chargeSubGroup = new THREE.Group();
      chargeSubGroup.position.set(charge.x, charge.y, charge.z);

      const isPositive = charge.q > 0;
      const coreColor = isPositive ? 0xef4444 : 0x3b82f6; // Red / Blue
      const coronaColor = isPositive ? 0xf97316 : 0x06b6d4; // Orange / Cyan

      // 1. Core Sphere with PBR glowing finish
      const coreGeo = new THREE.SphereGeometry(charge.radius, 32, 32);
      const coreMat = new THREE.MeshStandardMaterial({
        color: coreColor,
        emissive: coreColor,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.3,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      chargeSubGroup.add(coreMesh);

      // 2. Translucent energy corona
      const coronaGeo = new THREE.SphereGeometry(charge.radius * 1.35, 24, 24);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: coronaColor,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
      coronaMesh.name = 'chargeCorona';
      chargeSubGroup.add(coronaMesh);

      // 3. Nested orbital resonance rings
      const ringsGroup = new THREE.Group();
      ringsGroup.name = 'resonanceRings';

      const ring1Geo = new THREE.TorusGeometry(charge.radius * 1.7, 0.015, 12, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: isPositive ? 0xfecaca : 0xbfdbfe,
        emissive: isPositive ? 0xf87171 : 0x60a5fa,
        emissiveIntensity: 1.0,
        roughness: 0.1,
        metalness: 0.9,
      });
      const ring1 = new THREE.Mesh(ring1Geo, ringMat);
      ring1.rotation.x = Math.PI / 3;
      ringsGroup.add(ring1);

      const ring2Geo = new THREE.TorusGeometry(charge.radius * 2.05, 0.012, 12, 48);
      const ring2 = new THREE.Mesh(ring2Geo, ringMat);
      ring2.rotation.y = Math.PI / 4;
      ringsGroup.add(ring2);

      // Energy nodes on rings
      const nodeGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });
      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI * 2) / 3;
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(
          Math.cos(ang) * charge.radius * 1.7,
          Math.sin(ang) * charge.radius * 1.7,
          0
        );
        ring1.add(node);
      }

      chargeSubGroup.add(ringsGroup);

      // 4. Polarity Glyph (+ or -)
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 128;
      signCanvas.height = 128;
      const sCtx = signCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = 'rgba(0,0,0,0)';
        sCtx.fillRect(0, 0, 128, 128);
        sCtx.font = 'bold 96px system-ui, sans-serif';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.fillStyle = '#ffffff';
        sCtx.shadowColor = isPositive ? '#f87171' : '#60a5fa';
        sCtx.shadowBlur = 16;
        sCtx.fillText(isPositive ? '+' : '−', 64, 64);
      }
      const signTex = new THREE.CanvasTexture(signCanvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: signTex,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(charge.radius * 1.6, charge.radius * 1.6, 1);
      chargeSubGroup.add(sprite);

      group.add(chargeSubGroup);
    });
  }, [charges]);

  // -------------------------------------------------------------
  // REBUILD STREAMLINES & PARTICLES FLOW
  // -------------------------------------------------------------
  useEffect(() => {
    const group = fieldLinesGroupRef.current;
    if (!group) return;

    // Clear old lines
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Line || child instanceof THREE.Points) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    if (!settings.showFieldLines) {
      flowDataRef.current = null;
      return;
    }

    const lines = traceFieldLines(
      charges,
      settings.fieldLinesCount,
      settings.outerSphereRadius * 0.98,
      settings.permittivity
    );

    const curvesList: THREE.CatmullRomCurve3[] = [];
    const curveLengths: number[] = [];

    lines.forEach((line) => {
      if (line.points.length < 3) return;

      const vecPoints = line.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(vecPoints);
      curvesList.push(curve);
      curveLengths.push(line.totalLength);

      // Create smooth line geometry with gradient colors
      const divisions = Math.max(30, line.points.length * 2);
      const spacedPoints = curve.getSpacedPoints(divisions);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(spacedPoints);

      // Vertex colors mapped to local electric field magnitude
      const colors = new Float32Array(spacedPoints.length * 3);
      for (let i = 0; i < spacedPoints.length; i++) {
        const pt = spacedPoints[i];
        const field = calculateElectricField(
          pt.x,
          pt.y,
          pt.z,
          charges,
          settings.permittivity
        );
        // Normalized intensity on log scale
        const norm = Math.min(1.0, Math.log10(1 + field.magnitude * 2.5) / 1.6);
        const rgb = getFieldColor(norm, settings.colorTheme);
        colors[i * 3] = rgb.r;
        colors[i * 3 + 1] = rgb.g;
        colors[i * 3 + 2] = rgb.b;
      }
      lineGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.72,
        linewidth: 1.5,
        blending: THREE.AdditiveBlending,
      });

      const lineMesh = new THREE.Line(lineGeo, lineMat);
      group.add(lineMesh);
    });

    // Setup animated flux particles flowing along the streamlines
    if (settings.showAnimatedFlow && curvesList.length > 0) {
      const particlesPerCurve = 8;
      const totalParticles = curvesList.length * particlesPerCurve;
      const positions = new Float32Array(totalParticles * 3);
      const colors = new Float32Array(totalParticles * 3);
      const curveProgress = new Float32Array(totalParticles);
      const speeds = new Float32Array(totalParticles);

      let idx = 0;
      for (let c = 0; c < curvesList.length; c++) {
        const curve = curvesList[c];
        for (let p = 0; p < particlesPerCurve; p++) {
          const prog = (p / particlesPerCurve + Math.random() * 0.1) % 1.0;
          curveProgress[idx] = prog;
          speeds[idx] = 0.5 + Math.random() * 0.4;

          const pt = curve.getPointAt(prog);
          positions[idx * 3] = pt.x;
          positions[idx * 3 + 1] = pt.y;
          positions[idx * 3 + 2] = pt.z;

          colors[idx * 3] = 0.95;
          colors[idx * 3 + 1] = 0.98;
          colors[idx * 3 + 2] = 1.0;
          idx++;
        }
      }

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Circular particle texture
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 32;
      pCanvas.height = 32;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, 'rgba(125, 211, 252, 0.9)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        pCtx.fillStyle = grad;
        pCtx.fillRect(0, 0, 32, 32);
      }
      const pTex = new THREE.CanvasTexture(pCanvas);

      const pMat = new THREE.PointsMaterial({
        size: 0.16,
        map: pTex,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const pMesh = new THREE.Points(pGeo, pMat);
      group.add(pMesh);
      particlesGroupRef.current = pMesh;

      flowDataRef.current = {
        positions,
        curveProgress,
        curveLengths,
        curves: curvesList,
        speeds,
      };
    } else {
      flowDataRef.current = null;
      particlesGroupRef.current = null;
    }
  }, [
    charges,
    settings.showFieldLines,
    settings.fieldLinesCount,
    settings.showAnimatedFlow,
    settings.colorTheme,
    settings.outerSphereRadius,
    settings.permittivity,
  ]);

  // -------------------------------------------------------------
  // REBUILD 3D VECTOR FIELD (QUIVER PLOT)
  // -------------------------------------------------------------
  useEffect(() => {
    const group = fieldLinesGroupRef.current;
    if (!group) return;

    if (vectorMeshRef.current) {
      group.remove(vectorMeshRef.current);
      vectorMeshRef.current.geometry.dispose();
      (vectorMeshRef.current.material as THREE.Material).dispose();
      vectorMeshRef.current = null;
    }

    if (!settings.showVectorField) return;

    const vectors = generateVectorField(
      charges,
      settings.vectorDensity,
      settings.outerSphereRadius * 0.92,
      settings.permittivity
    );

    if (vectors.length === 0) return;

    // Create unified arrow geometry (cylinder shaft + cone tip)
    const shaftGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
    shaftGeo.translate(0, 0.175, 0);

    const headGeo = new THREE.ConeGeometry(0.045, 0.14, 8);
    headGeo.translate(0, 0.35 + 0.07, 0);

    // Merge shaft & head into single geometry
    const arrowGeo = new THREE.BufferGeometry();
    const pos1 = shaftGeo.attributes.position.array;
    const pos2 = headGeo.attributes.position.array;
    const norm1 = shaftGeo.attributes.normal.array;
    const norm2 = headGeo.attributes.normal.array;

    const combinedPos = new Float32Array(pos1.length + pos2.length);
    combinedPos.set(pos1);
    combinedPos.set(pos2, pos1.length);

    const combinedNorm = new Float32Array(norm1.length + norm2.length);
    combinedNorm.set(norm1);
    combinedNorm.set(norm2, norm1.length);

    arrowGeo.setAttribute('position', new THREE.BufferAttribute(combinedPos, 3));
    arrowGeo.setAttribute('normal', new THREE.BufferAttribute(combinedNorm, 3));

    shaftGeo.dispose();
    headGeo.dispose();

    const arrowMat = new THREE.MeshStandardMaterial({
      roughness: 0.25,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    const instancedMesh = new THREE.InstancedMesh(arrowGeo, arrowMat, vectors.length);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    vectors.forEach((v, i) => {
      _vec3.set(v.x, v.y, v.z);
      _vec3Target.set(v.dirX, v.dirY, v.dirZ).normalize();
      _quat.setFromUnitVectors(_arrowUp, _vec3Target);

      // Scale arrow length based on electric field magnitude (log scale)
      const scaleMag = Math.max(0.4, Math.min(1.4, Math.log10(1 + v.magnitude * 2) * 0.8));
      _scale.set(1.0, scaleMag, 1.0);

      _mat4.compose(_vec3, _quat, _scale);
      instancedMesh.setMatrixAt(i, _mat4);

      // Color mapping
      const norm = Math.min(1.0, Math.log10(1 + v.magnitude * 2.5) / 1.6);
      const rgb = getFieldColor(norm, settings.colorTheme);
      _color.setRGB(rgb.r, rgb.g, rgb.b);
      instancedMesh.setColorAt(i, _color);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    instancedMesh.computeBoundingSphere();

    group.add(instancedMesh);
    vectorMeshRef.current = instancedMesh;
  }, [
    charges,
    settings.showVectorField,
    settings.vectorDensity,
    settings.colorTheme,
    settings.outerSphereRadius,
    settings.permittivity,
  ]);

  // -------------------------------------------------------------
  // REBUILD EQUIPOTENTIAL TRANSPARENT SHELLS
  // -------------------------------------------------------------
  useEffect(() => {
    const group = equipotentialsGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    if (!settings.showEquipotentials) return;

    // Shell radii for nested equipotential surfaces
    const count = settings.equipotentialCount;
    const baseRadii = [1.1, 1.85, 2.7, 3.6, 4.4].slice(0, count);

    baseRadii.forEach((r, idx) => {
      // Semi-transparent glowing spherical shell
      const shellGeo = new THREE.SphereGeometry(r, 48, 48);
      const shellMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: settings.equipotentialOpacity * (0.8 - idx * 0.1),
        roughness: 0.1,
        metalness: 0.15,
        clearcoat: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      shellMesh.renderOrder = 2;
      group.add(shellMesh);

      // Latitude and longitude glowing contour lines
      if (settings.showGridLines) {
        const wireGeo = new THREE.WireframeGeometry(shellGeo);
        const wireMat = new THREE.LineBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
        });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        group.add(wireMesh);
      }
    });
  }, [
    settings.showEquipotentials,
    settings.equipotentialCount,
    settings.equipotentialOpacity,
    settings.showGridLines,
  ]);

  // -------------------------------------------------------------
  // REBUILD THE TRANSPARENT BOUNDARY SPHERE & GIMBAL RINGS
  // "ez legyen átlátszó gömb amit lehet forgatni körbe körbe"
  // -------------------------------------------------------------
  useEffect(() => {
    const group = outerSphereGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    if (!settings.showOuterSphere) return;

    const R = settings.outerSphereRadius;

    // 1. The transparent outer dielectric sphere with custom Fresnel edge glow
    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);

    // Fresnel Rim Glow Shader for authentic glass laboratory orb / plasma globe
    const fresnelMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x38bdf8) },
        rimColor: { value: new THREE.Color(0x93c5fd) },
        opacity: { value: settings.outerSphereOpacity },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 rimColor;
        uniform float opacity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.8);
          vec3 finalColor = mix(color, rimColor, fresnel);
          gl_FragColor = vec4(finalColor, opacity * (0.3 + 0.7 * fresnel));
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const outerMesh = new THREE.Mesh(sphereGeo, fresnelMat);
    outerMesh.renderOrder = 3;
    group.add(outerMesh);

    // 2. Holographic Coordinate Meridians & Parallels
    if (settings.showGridLines) {
      const linesGroup = new THREE.Group();

      // Equator Ring
      const eqGeo = new THREE.TorusGeometry(R, 0.018, 12, 96);
      const eqMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.45,
      });
      const eqMesh = new THREE.Mesh(eqGeo, eqMat);
      eqMesh.rotation.x = Math.PI / 2;
      linesGroup.add(eqMesh);

      // Prime Meridian Ring
      const merGeo = new THREE.TorusGeometry(R, 0.016, 12, 96);
      const merMesh = new THREE.Mesh(merGeo, eqMat);
      linesGroup.add(merMesh);

      // Second Meridian Ring (90 deg)
      const mer2Mesh = new THREE.Mesh(merGeo, eqMat);
      mer2Mesh.rotation.y = Math.PI / 2;
      linesGroup.add(mer2Mesh);

      group.add(linesGroup);
    }

    // 3. Technical Bezel / Gimbal Ring with angle scale
    const gimbalGroup = new THREE.Group();
    gimbalGroup.name = 'gimbalRings';

    const bezelGeo = new THREE.TorusGeometry(R * 1.035, 0.032, 16, 120);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x0f172a,
    });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.rotation.x = Math.PI / 2;
    gimbalGroup.add(bezel);

    // Angle tick marks along bezel
    const tickGeo = new THREE.BoxGeometry(0.08, 0.02, 0.02);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(Math.cos(angle) * (R * 1.035), 0, Math.sin(angle) * (R * 1.035));
      tick.rotation.y = -angle;
      gimbalGroup.add(tick);
    }

    group.add(gimbalGroup);
  }, [
    settings.showOuterSphere,
    settings.outerSphereRadius,
    settings.outerSphereOpacity,
    settings.showGridLines,
  ]);

  // -------------------------------------------------------------
  // REBUILD TEST CHARGE PROBE & FORCE VECTOR
  // -------------------------------------------------------------
  useEffect(() => {
    const group = probeGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    if (!probe.enabled) return;

    const probeSubGroup = new THREE.Group();
    probeSubGroup.position.set(probe.x, probe.y, probe.z);

    // Probe Sphere (Gold core)
    const pGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.4,
    });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    probeSubGroup.add(pMesh);

    // Probe energy halo
    const haloGeo = new THREE.SphereGeometry(0.26, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    probeSubGroup.add(haloMesh);

    // Calculate local electric field and force vector at probe position
    const field = calculateElectricField(
      probe.x,
      probe.y,
      probe.z,
      charges,
      settings.permittivity
    );
    const pot = calculatePotential(
      probe.x,
      probe.y,
      probe.z,
      charges,
      settings.permittivity
    );
    const forceMag = field.magnitude * Math.abs(probe.q);

    // Report metrics to parent HUD
    onFieldMetricsUpdate({
      fieldMag: field.magnitude,
      potential: pot,
      forceMag,
      dirX: field.ex / (field.magnitude || 1),
      dirY: field.ey / (field.magnitude || 1),
      dirZ: field.ez / (field.magnitude || 1),
    });

    // Draw Force Vector Arrow protruding from probe: F = q * E
    if (field.magnitude > 0.01) {
      const dirSign = probe.q >= 0 ? 1 : -1;
      const arrowDir = new THREE.Vector3(
        field.ex * dirSign,
        field.ey * dirSign,
        field.ez * dirSign
      ).normalize();
      const arrowLen = Math.min(2.5, Math.max(0.4, forceMag * 0.35));

      const arrowHelper = new THREE.ArrowHelper(
        arrowDir,
        new THREE.Vector3(0, 0, 0),
        arrowLen,
        0xef4444,
        0.18,
        0.09
      );
      probeSubGroup.add(arrowHelper);
    }

    group.add(probeSubGroup);

    // Trajectory path (when probe was released)
    if (probe.path.length > 1) {
      const pathPoints = probe.path.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const tGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
      const tMat = new THREE.LineBasicMaterial({
        color: 0xfacc15,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      const tLine = new THREE.Line(tGeo, tMat);
      group.add(tLine);
      probeTrajectoryRef.current = tLine;
    }
  }, [
    probe.enabled,
    probe.x,
    probe.y,
    probe.z,
    probe.q,
    probe.path,
    charges,
    settings.permittivity,
    onFieldMetricsUpdate,
  ]);

  // -------------------------------------------------------------
  // REBUILD SLICE CROSS-SECTION PLANE
  // -------------------------------------------------------------
  useEffect(() => {
    const group = fieldLinesGroupRef.current;
    if (!group) return;

    if (slicePlaneRef.current) {
      group.remove(slicePlaneRef.current);
      slicePlaneRef.current.geometry.dispose();
      (slicePlaneRef.current.material as THREE.Material).dispose();
      slicePlaneRef.current = null;
    }

    if (!settings.showSlicePlane) return;

    const planeSize = settings.outerSphereRadius * 1.95;
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize, 48, 48);

    // Generate potential heat map canvas texture
    const res = 128;
    const cv = document.createElement('canvas');
    cv.width = res;
    cv.height = res;
    const cctx = cv.getContext('2d');

    if (cctx) {
      const imgData = cctx.createImageData(res, res);
      const data = imgData.data;

      for (let py = 0; py < res; py++) {
        const v = (py / (res - 1) - 0.5) * planeSize;
        for (let px = 0; px < res; px++) {
          const u = (px / (res - 1) - 0.5) * planeSize;

          let sx = u;
          let sy = v;
          let sz = 0;

          if (settings.slicePlaneAxis === 'xz') {
            sx = u;
            sy = 0;
            sz = v;
          } else if (settings.slicePlaneAxis === 'yz') {
            sx = 0;
            sy = u;
            sz = v;
          }

          const pot = calculatePotential(sx, sy, sz, charges, settings.permittivity);
          const norm = Math.max(0, Math.min(1, (pot + 15) / 30));
          const col = getFieldColor(norm, settings.colorTheme);

          const i = (py * res + px) * 4;
          data[i] = Math.floor(col.r * 255);
          data[i + 1] = Math.floor(col.g * 255);
          data[i + 2] = Math.floor(col.b * 255);
          data[i + 3] = 130; // semi-transparent
        }
      }
      cctx.putImageData(imgData, 0, 0);
    }

    const tex = new THREE.CanvasTexture(cv);
    const planeMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(planeGeo, planeMat);
    if (settings.slicePlaneAxis === 'xz') {
      mesh.rotation.x = Math.PI / 2;
    } else if (settings.slicePlaneAxis === 'yz') {
      mesh.rotation.y = Math.PI / 2;
    }

    group.add(mesh);
    slicePlaneRef.current = mesh;
  }, [
    settings.showSlicePlane,
    settings.slicePlaneAxis,
    settings.outerSphereRadius,
    settings.colorTheme,
    settings.permittivity,
    charges,
  ]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full select-none overflow-hidden cursor-grab active:cursor-grabbing"
    />
  );
};
