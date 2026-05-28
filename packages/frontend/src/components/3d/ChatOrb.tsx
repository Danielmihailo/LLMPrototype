/**
 * ChatOrb — the reactive 3D JARVIS brain in the chat view.
 *
 * States:
 *  idle      – slow, calm cyan orb with gentle rings
 *  listening – purple/indigo, faster distort, expanding sonar rings
 *  thinking  – amber / warm, particles converging inward, ring chaos
 *  speaking  – full cyan blaze, sparkles bursting outward, ring acceleration
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sparkles, Float } from "@react-three/drei";
import * as THREE from "three";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

/* ── target values per state ───────────────────────────────────────── */
interface StateTarget {
  distort: number; speed: number;
  r: number; g: number; b: number;
  emissive: number; lightI: number;
  ringSpd: number; floatSpd: number;
}

const TARGETS: Record<OrbState, StateTarget> = {
  idle:      { distort: 0.18, speed: 1.2, r: 0.15, g: 0.83, b: 0.93, emissive: 0.25, lightI: 2.0, ringSpd: 0.12, floatSpd: 1.5 },
  listening: { distort: 0.42, speed: 3.0, r: 0.51, g: 0.49, b: 0.98, emissive: 0.55, lightI: 4.0, ringSpd: 0.38, floatSpd: 2.5 },
  thinking:  { distort: 0.55, speed: 4.5, r: 0.96, g: 0.62, b: 0.15, emissive: 0.50, lightI: 3.5, ringSpd: 0.65, floatSpd: 3.5 },
  speaking:  { distort: 0.65, speed: 6.0, r: 0.13, g: 0.83, b: 0.93, emissive: 0.80, lightI: 6.0, ringSpd: 0.90, floatSpd: 4.0 },
};

/* ── lerp helper ──────────────────────────────────────────────────── */
function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ── animated orbit ring ─────────────────────────────────────────── */
function Ring({
  radius,
  tube,
  rotX,
  rotZ,
  speedRef,
}: {
  radius: number;
  tube: number;
  rotX: number;
  rotZ: number;
  speedRef: React.MutableRefObject<number>;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const baseOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += speedRef.current * delta;
    // breathing scale
    const s = 1 + Math.sin(state.clock.elapsedTime * 0.8 + baseOffset) * 0.02;
    ref.current.scale.setScalar(s);
  });

  return (
    <mesh ref={ref} rotation={[rotX, 0, rotZ]}>
      <torusGeometry args={[radius, tube, 16, 128]} />
      <meshStandardMaterial
        color="#22d3ee"
        emissive="#22d3ee"
        emissiveIntensity={0.4}
        transparent
        opacity={0.3}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ── sonar pulse rings (listening state only) ────────────────────── */
function SonarRings({ active }: { active: boolean }) {
  const rings = [0, 0.6, 1.2];
  const refs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];

  useFrame((state) => {
    refs.forEach((r, i) => {
      if (!r.current) return;
      const t = ((state.clock.elapsedTime * 0.7 + rings[i]) % 1);
      const scale = 1.6 + t * 2.5;
      const opacity = active ? (1 - t) * 0.35 : 0;
      r.current.scale.setScalar(scale);
      (r.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    });
  });

  return (
    <>
      {refs.map((ref, i) => (
        <mesh key={i} ref={ref}>
          <ringGeometry args={[1.48, 1.52, 64]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/* ── converging particles (thinking state) ───────────────────────── */
function ThinkingParticles({ active }: { active: boolean }) {
  const count = 60;
  const pointsRef = useRef<THREE.Points>(null);

  const { geo, velocities, origins } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    const origs = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 3.5 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      origs[i * 3] = x;
      origs[i * 3 + 1] = y;
      origs[i * 3 + 2] = z;
      // velocity pointing inward
      const len = Math.sqrt(x * x + y * y + z * z);
      vels[i * 3] = -x / len;
      vels[i * 3 + 1] = -y / len;
      vels[i * 3 + 2] = -z / len;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geo: g, velocities: vels, origins: origs };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const ox = origins[i * 3];
      const oy = origins[i * 3 + 1];
      const oz = origins[i * 3 + 2];
      const vx = velocities[i * 3];
      const vy = velocities[i * 3 + 1];
      const vz = velocities[i * 3 + 2];
      // ping-pong: 0→1→0
      const ping = Math.abs(Math.sin(t * 0.6 + i * 0.3));
      const factor = active ? ping * 3.5 : 0;
      pos.setXYZ(i, ox + vx * factor, oy + vy * factor, oz + vz * factor);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        size={0.06}
        color="#f59e0b"
        transparent
        opacity={active ? 0.8 : 0}
        sizeAttenuation
      />
    </points>
  );
}

/* ── main orb mesh ───────────────────────────────────────────────── */
function Orb({ orbState }: { orbState: OrbState }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matRef    = useRef<any>(null);
  const lightRef  = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  const meshRef   = useRef<THREE.Mesh>(null);

  const color    = useRef(new THREE.Color(TARGETS.idle.r, TARGETS.idle.g, TARGETS.idle.b));
  const speedRef = useRef<number>(TARGETS.idle.ringSpd);
  const vals     = useRef<StateTarget>({ ...TARGETS.idle });

  useFrame((state, delta) => {
    const tgt = TARGETS[orbState];
    const α = 1 - Math.pow(0.01, delta * 2.5); // smooth factor

    // lerp values
    vals.current.distort = lerpN(vals.current.distort, tgt.distort, α);
    vals.current.speed   = lerpN(vals.current.speed,   tgt.speed,   α);
    vals.current.emissive = lerpN(vals.current.emissive, tgt.emissive, α);
    vals.current.lightI  = lerpN(vals.current.lightI,  tgt.lightI,  α);
    speedRef.current     = lerpN(speedRef.current,     tgt.ringSpd, α);

    // color lerp
    color.current.r = lerpN(color.current.r, tgt.r, α);
    color.current.g = lerpN(color.current.g, tgt.g, α);
    color.current.b = lerpN(color.current.b, tgt.b, α);

    // apply to material
    if (matRef.current) {
      matRef.current.distort = vals.current.distort;
      matRef.current.speed   = vals.current.speed;
      (matRef.current as any).color = color.current;
      (matRef.current as any).emissiveIntensity = vals.current.emissive;
    }

    // apply to lights
    if (lightRef.current) {
      lightRef.current.intensity = vals.current.lightI;
      lightRef.current.color = color.current;
    }
    if (light2Ref.current) {
      light2Ref.current.intensity = vals.current.lightI * 0.6;
      light2Ref.current.color = color.current;
    }

    // gentle self-rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });

  return (
    <>
      <pointLight ref={lightRef} position={[3, 3, 4]} intensity={2} />
      <pointLight ref={light2Ref} position={[-3, -3, -3]} intensity={1.2} />
      <pointLight position={[0, -4, 2]} color="#7c3aed" intensity={0.8} />

      <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1.5, 128, 128]} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <MeshDistortMaterial
            ref={matRef}
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.3}
            distort={0.18}
            speed={1.2}
            roughness={0.0}
            metalness={0.95}
            transparent
            opacity={0.92}
            toneMapped={false}
          />
        </mesh>

        {/* inner core */}
        <mesh>
          <sphereGeometry args={[0.65, 64, 64]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#22d3ee"
            emissiveIntensity={0.6}
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        </mesh>

        {/* outer halo */}
        <mesh>
          <sphereGeometry args={[2.0, 32, 32]} />
          <meshBasicMaterial
            color="#22d3ee"
            transparent
            opacity={0.04}
            side={THREE.BackSide}
          />
        </mesh>
      </Float>

      {/* orbit rings - share speedRef */}
      <Ring radius={2.4} tube={0.006} rotX={Math.PI / 2}    rotZ={0}            speedRef={speedRef} />
      <Ring radius={2.9} tube={0.005} rotX={Math.PI / 5}    rotZ={Math.PI / 4}  speedRef={speedRef} />
      <Ring radius={2.1} tube={0.007} rotX={-Math.PI / 4}   rotZ={Math.PI / 3}  speedRef={speedRef} />

      {/* state-specific fx */}
      <SonarRings active={orbState === "listening"} />
      <ThinkingParticles active={orbState === "thinking"} />

      {orbState === "speaking" && (
        <Sparkles
          count={70}
          scale={5}
          size={3}
          speed={0.6}
          opacity={0.85}
          color="#22d3ee"
          noise={1}
        />
      )}
    </>
  );
}

/* ── exported component ─────────────────────────────────────────── */
export function ChatOrb({
  orbState = "idle",
  className,
}: {
  orbState?: OrbState;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.08} />
        <Orb orbState={orbState} />
      </Canvas>
    </div>
  );
}
