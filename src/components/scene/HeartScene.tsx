import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { focusHotspot, useHotspotStore } from '../../lib/hotspot-store';
import type { SceneManifest } from '../../lib/scene-manifest';
import type { RendererTier } from './renderer-support';

const ACTIVE_EMISSIVE = 0x4de0c8;
const PARTICLE_COUNT = 72;
const POSITION_SCALE = 2.5;

interface HeartSceneProps {
  manifest: SceneManifest;
  modelSrc: string;
  tier: Exclude<RendererTier, 'poster'>;
  reducedMotion: boolean;
  onReady: () => void;
}

interface FlowParticles {
  points: THREE.Points;
  curves: [THREE.CatmullRomCurve3, THREE.CatmullRomCurve3];
  offsets: number[];
  speeds: number[];
  attribute: THREE.BufferAttribute;
}

interface SavedEmissive {
  color: THREE.Color;
  intensity: number;
}

function lift(point: THREE.Vector3, amount: number): THREE.Vector3 {
  return point.clone().add(new THREE.Vector3(0, amount, 0));
}

function buildCurves(manifest: SceneManifest): [THREE.CatmullRomCurve3, THREE.CatmullRomCurve3] {
  const points = manifest.hotspots.map((hotspot) => {
    return new THREE.Vector3(...hotspot.position).multiplyScalar(POSITION_SCALE);
  });
  const pick = (index: number, fallback: number): THREE.Vector3 => {
    return points[index] ?? points[fallback] ?? new THREE.Vector3();
  };

  const first = pick(2, 0);
  const second = pick(3, 1);
  const third = pick(4, 0);
  const fourth = pick(5, 1);
  return [
    new THREE.CatmullRomCurve3([first, lift(first, 0.3), lift(second, 0.3), second]),
    new THREE.CatmullRomCurve3([third, lift(third, 0.22), lift(fourth, 0.22), fourth]),
  ];
}

function createFlowParticles(manifest: SceneManifest): FlowParticles {
  const curves = buildCurves(manifest);
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const attribute = new THREE.BufferAttribute(positions, 3);
  const offsets: number[] = [];
  const speeds: number[] = [];

  for (let index = 0; index < PARTICLE_COUNT; index++) {
    offsets.push((index / PARTICLE_COUNT) * 2);
    speeds.push(0.06 + (index % 5) * 0.012);
    const point = curves[index % 2].getPointAt(offsets[index] % 1);
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = point.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', attribute);
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0x9fe8dd,
      depthWrite: false,
      opacity: 0.75,
      size: 0.028,
      transparent: true,
    }),
  );
  return { attribute, curves, offsets, points, speeds };
}

interface SceneContentsProps {
  manifest: SceneManifest;
  modelSrc: string;
  reducedMotion: boolean;
}

function SceneContents({ manifest, modelSrc, reducedMotion }: SceneContentsProps) {
  const { scene } = useGLTF(modelSrc);
  const activeHotspot = useHotspotStore((state) => state.activeHotspot);
  const group = useRef<THREE.Group>(null);
  const lookAt = useRef(new THREE.Vector3(...manifest.camera.target));
  const cameraInitialised = useRef(false);
  const savedEmissive = useRef(new Map<string, SavedEmissive>());

  const hotspotIds = useMemo(() => {
    return new Set(manifest.hotspots.map((hotspot) => hotspot.id));
  }, [manifest]);
  const positionsById = useMemo(() => {
    return new Map(
      manifest.hotspots.map((hotspot) => [
        hotspot.id,
        new THREE.Vector3(...hotspot.position).multiplyScalar(POSITION_SCALE),
      ]),
    );
  }, [manifest]);
  const basePosition = useMemo(() => {
    return new THREE.Vector3(...manifest.camera.position);
  }, [manifest]);
  const baseTarget = useMemo(() => {
    return new THREE.Vector3(...manifest.camera.target);
  }, [manifest]);

  const meshNodes = useMemo(() => {
    const found = new Map<string, THREE.Mesh>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && hotspotIds.has(object.name)) {
        found.set(object.name, object);
      }
    });
    return found;
  }, [hotspotIds, scene]);

  const flow = useMemo(() => {
    return createFlowParticles(manifest);
  }, [manifest]);

  useEffect(() => {
    const saved = savedEmissive.current;
    for (const [id, mesh] of meshNodes) {
      if (!(mesh.material instanceof THREE.MeshStandardMaterial)) {
        continue;
      }
      const material = mesh.material;
      let previous = saved.get(id);
      if (!previous) {
        previous = { color: material.emissive.clone(), intensity: material.emissiveIntensity };
        saved.set(id, previous);
      }
      if (id === activeHotspot) {
        material.emissive.setHex(ACTIVE_EMISSIVE);
        material.emissiveIntensity = 0.9;
      } else {
        material.emissive.copy(previous.color);
        material.emissiveIntensity = previous.intensity;
      }
    }
  }, [activeHotspot, meshNodes]);

  useEffect(
    () => () => {
      for (const [id, mesh] of meshNodes) {
        const previous = savedEmissive.current.get(id);
        if (previous && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.emissive.copy(previous.color);
          mesh.material.emissiveIntensity = previous.intensity;
        }
      }
      savedEmissive.current.clear();
      flow.points.geometry.dispose();
      (flow.points.material as THREE.Material).dispose();
    },
    [flow, meshNodes],
  );

  useFrame((state, delta) => {
    if (reducedMotion) {
      flow.points.visible = false;
      if (!cameraInitialised.current) {
        state.camera.position.copy(basePosition);
        lookAt.current.copy(baseTarget);
        state.camera.lookAt(lookAt.current);
        cameraInitialised.current = true;
      }
      return;
    }

    cameraInitialised.current = false;
    if (group.current) {
      group.current.scale.setScalar(1 + Math.sin(state.elapsed * 2.6) * 0.012);
    }

    flow.points.visible = true;
    const desired = positionsById.get(activeHotspot ?? '') ?? baseTarget;
    const cameraGoal = basePosition.clone().add(desired.clone().multiplyScalar(0.35));
    const alpha = 1 - Math.exp(-delta * 2.8);
    state.camera.position.lerp(cameraGoal, alpha);
    lookAt.current.lerp(desired, alpha);
    state.camera.lookAt(lookAt.current);

    const positions = flow.attribute.array as Float32Array;
    for (let index = 0; index < PARTICLE_COUNT; index++) {
      const curveIndex = index % 2;
      const progress = (flow.offsets[index] + state.elapsed * flow.speeds[index]) % 1;
      const point = flow.curves[curveIndex].getPointAt(progress);
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    }
    flow.attribute.needsUpdate = true;
  });

  function handleClick(event: ThreeEvent<MouseEvent>): void {
    const id = event.object.name;
    if (!hotspotIds.has(id)) {
      return;
    }
    focusHotspot(id);
  }

  return (
    <group ref={group}>
      <primitive object={scene} onClick={handleClick} />
      <primitive object={flow.points} />
    </group>
  );
}

/** R3F island. One Canvas, with the renderer backend chosen by the caller. */
export function HeartScene({ manifest, modelSrc, tier, reducedMotion, onReady }: HeartSceneProps) {
  return (
    <Canvas
      camera={{ fov: manifest.camera.fov ?? 42, position: manifest.camera.position }}
      dpr={[1, 2]}
      onCreated={onReady}
      renderer={{ antialias: true, forceWebGL: tier === 'webgl' }}
    >
      <Suspense fallback={null}>
        <SceneContents manifest={manifest} modelSrc={modelSrc} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}
