import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { focusHotspot, useHotspotStore } from '../../lib/hotspot-store';
import type { AnimationClip as ManifestClip, SceneManifest } from '../../lib/scene-manifest';
import { responsivePose } from './framing';
import type { RendererTier } from './renderer-support';

const ACTIVE_EMISSIVE = 0x4de0c8;
const ACTIVE_EMISSIVE_INTENSITY = 0.22;
const CAMERA_EASE_RATE = 1.4;
const PARTICLE_COUNT = 72;
const POSITION_SCALE = 1;

interface HeartSceneProps {
  manifest: SceneManifest;
  modelSrc: string;
  tier: Exclude<RendererTier, 'poster'>;
  reducedMotion: boolean;
  onReady: () => void;
  onAnimation: (clipId: string) => void;
  /** QA hook: throw on mount so the fallback ladder can be exercised in E2E. */
  failRender?: boolean;
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

interface TriggeredClip {
  action: THREE.AnimationAction;
  clip: ManifestClip;
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
    speeds.push(0.025 + (index % 5) * 0.005);
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
      opacity: 0.6,
      size: 0.024,
      transparent: true,
    }),
  );
  return { attribute, curves, offsets, points, speeds };
}

interface SceneContentsProps {
  manifest: SceneManifest;
  modelSrc: string;
  reducedMotion: boolean;
  onReady: () => void;
  onAnimation: (clipId: string) => void;
}

/** Signals readiness only after the suspended GLTF has resolved. */
function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

function SceneContents({
  manifest,
  modelSrc,
  reducedMotion,
  onReady,
  onAnimation,
}: SceneContentsProps) {
  const { animations, scene } = useGLTF(modelSrc);
  const activeHotspot = useHotspotStore((state) => state.activeHotspot);
  const lookAt = useRef(new THREE.Vector3(...manifest.camera.target));
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

  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const clipActions = useMemo(() => {
    const found = new Map<string, THREE.AnimationAction>();
    const declarations = manifest.animations;
    if (!declarations) {
      return found;
    }
    for (const clip of declarations.clips) {
      const source = animations.find((candidate) => candidate.name === (clip.name ?? clip.id));
      if (source) {
        found.set(clip.id, mixer.clipAction(source));
      }
    }
    return found;
  }, [animations, manifest, mixer]);
  const triggeredClips = useMemo(() => {
    const found = new Map<string, TriggeredClip>();
    const declarations = manifest.animations;
    if (!declarations) {
      return found;
    }
    for (const trigger of declarations.triggers) {
      const action = clipActions.get(trigger.clip);
      const clip = declarations.clips.find((candidate) => candidate.id === trigger.clip);
      if (action && clip) {
        found.set(trigger.hotspot, { action, clip });
      }
    }
    return found;
  }, [clipActions, manifest]);

  useEffect(() => {
    mixer.stopAllAction();
    const triggered = activeHotspot === null ? undefined : triggeredClips.get(activeHotspot);
    if (reducedMotion || !triggered) {
      return;
    }
    const { action, clip } = triggered;
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = clip.duration === undefined ? 1 : action.getClip().duration / clip.duration;
    action.play();
    onAnimation(clip.id);
    return () => {
      action.stop();
    };
  }, [activeHotspot, mixer, onAnimation, reducedMotion, triggeredClips]);

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
        material.emissiveIntensity = ACTIVE_EMISSIVE_INTENSITY;
      } else {
        material.emissive.copy(previous.color);
        material.emissiveIntensity = previous.intensity;
      }
    }
  }, [activeHotspot, meshNodes]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
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
    [flow, meshNodes, mixer, scene],
  );

  useFrame((state, delta) => {
    const fov = manifest.camera.fov ?? 42;
    const aspect = state.size.width / Math.max(1, state.size.height);
    if (reducedMotion) {
      flow.points.visible = false;
      const staticPose = responsivePose(
        basePosition.toArray() as [number, number, number],
        baseTarget.toArray() as [number, number, number],
        null,
        fov,
        aspect,
      );
      state.camera.position.set(...staticPose.camera);
      lookAt.current.set(...staticPose.target);
      state.camera.lookAt(lookAt.current);
      return;
    }

    mixer.update(delta);
    flow.points.visible = true;
    const desired = positionsById.get(activeHotspot ?? '') ?? null;
    const pose = responsivePose(
      basePosition.toArray() as [number, number, number],
      baseTarget.toArray() as [number, number, number],
      desired === null ? null : (desired.toArray() as [number, number, number]),
      fov,
      aspect,
    );
    const cameraGoal = new THREE.Vector3(...pose.camera);
    const focusTarget = new THREE.Vector3(...pose.target);
    const alpha = 1 - Math.exp(-delta * CAMERA_EASE_RATE);
    state.camera.position.lerp(cameraGoal, alpha);
    lookAt.current.lerp(focusTarget, alpha);
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
    <group>
      <SceneReady onReady={onReady} />
      <primitive object={scene} onClick={handleClick} />
      <primitive object={flow.points} />
    </group>
  );
}

/** R3F island. One Canvas, with the renderer backend chosen by the caller. */
export function HeartScene({
  failRender = false,
  manifest,
  modelSrc,
  tier,
  reducedMotion,
  onReady,
  onAnimation,
}: HeartSceneProps) {
  if (failRender) {
    throw new Error('Forced renderer failure (QA hook)');
  }
  return (
    <Canvas
      camera={{ fov: manifest.camera.fov ?? 42, position: manifest.camera.position }}
      dpr={[1, 2]}
      renderer={{ antialias: true, forceWebGL: tier === 'webgl' }}
    >
      {/* Shared across WebGPU and WebGL: the GLB's authored PBR base colours need light. */}
      <ambientLight intensity={0.75} />
      <hemisphereLight args={[0xffffff, 0x1a2733, 0.65]} />
      <directionalLight color={0xfff4e8} intensity={1.9} position={[3, 5, 5]} />
      <directionalLight color={0xbcd8ff} intensity={0.65} position={[-4, 2, -3]} />
      <Suspense fallback={null}>
        <SceneContents
          manifest={manifest}
          modelSrc={modelSrc}
          onAnimation={onAnimation}
          onReady={onReady}
          reducedMotion={reducedMotion}
        />
      </Suspense>
    </Canvas>
  );
}
