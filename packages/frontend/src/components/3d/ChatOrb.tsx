/**
 * ChatOrb — cinematic 3D JARVIS brain.
 * States: idle | listening | thinking | speaking
 * Glow via additive blending only (no postprocessing — better browser compat).
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

/* ── per-state targets ───────────────────────────────────────────────── */
interface Target {
  distort: number; speed: number;
  cr: number; cg: number; cb: number;
  emissive: number; lightI: number;
  ringSpd: number;
}

const T: Record<OrbState, Target> = {
  idle:      { distort: 0.12, speed: 0.8,  cr: 0.13, cg: 0.83, cb: 0.93, emissive: 1.2,  lightI: 4,   ringSpd: 0.08 },
  listening: { distort: 0.30, speed: 2.5,  cr: 0.63, cg: 0.47, cb: 0.98, emissive: 1.8,  lightI: 7,   ringSpd: 0.30 },
  thinking:  { distort: 0.45, speed: 4.0,  cr: 0.98, cg: 0.63, cb: 0.12, emissive: 1.6,  lightI: 6,   ringSpd: 0.55 },
  speaking:  { distort: 0.55, speed: 5.5,  cr: 0.13, cg: 0.93, cb: 0.95, emissive: 2.2,  lightI: 9,   ringSpd: 0.80 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ── orbit ring ──────────────────────────────────────────────────────── */
function Ring({ r, tube, rotX, rotZ, spRef, dir = 1, colRef }: {
  r: number; tube: number; rotX: number; rotZ: number;
  spRef: React.MutableRefObject<number>;
  colRef: React.MutableRefObject<THREE.Color>;
  dir?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matRef = useRef<any>(null);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += spRef.current * dir * dt;
    if (matRef.current) {
      matRef.current.color.copy(colRef.current);
      matRef.current.emissive.copy(colRef.current);
    }
  });

  return (
    <mesh ref={ref} rotation={[rotX, 0, rotZ]}>
      <torusGeometry args={[r, tube, 16, 140]} />
      <meshStandardMaterial
        ref={matRef}
        color="#22d3ee"
        emissive="#22d3ee"
        emissiveIntensity={1.8}
        toneMapped={false}
        transparent
        opacity={0.65}
      />
    </mesh>
  );
}

/* ── sonar rings (listening) ─────────────────────────────────────────── */
function Sonar({ active }: { active: boolean }) {
  const n = 3;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const refs = Array.from({ length: n }, () => useRef<THREE.Mesh>(null));

  useFrame(({ clock }) => {
    refs.forEach((ref, i) => {
      if (!ref.current) return;
      const t = ((clock.elapsedTime * 0.5 + i / n) % 1);
      ref.current.scale.setScalar(1.5 + t * 3.5);
      (ref.current.material as THREE.MeshBasicMaterial).opacity =
        active ? (1 - t) * 0.45 : 0;
    });
  });

  return (
    <>
      {refs.map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.48, 1.53, 80]} />
          <meshBasicMaterial
            color="#8b5cf6"
            transparent
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ── converging particles (thinking) ────────────────────────────────── */
function ThinkParticles({ active }: { active: boolean }) {
  const count = 80;
  const ref = useRef<THREE.Points>(null);

  const { geo, orig, vel } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 3;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(ph) * Math.cos(th);
      const y = r * Math.sin(ph) * Math.sin(th);
      const z = r * Math.cos(ph);
      pos[i * 3] = orig[i * 3] = x;
      pos[i * 3 + 1] = orig[i * 3 + 1] = y;
      pos[i * 3 + 2] = orig[i * 3 + 2] = z;
      const l = Math.sqrt(x * x + y * y + z * z);
      vel[i * 3] = -x / l;
      vel[i * 3 + 1] = -y / l;
      vel[i * 3 + 2] = -z / l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { geo: g, orig, vel };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const ping = Math.abs(Math.sin(clock.elapsedTime * 0.7));
    for (let i = 0; i < count; i++) {
      const f = active ? ping * 3.8 : 0;
      pos.setXYZ(
        i,
        orig[i * 3] + vel[i * 3] * f,
        orig[i * 3 + 1] + vel[i * 3 + 1] * f,
        orig[i * 3 + 2] + vel[i * 3 + 2] * f,
      );
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.07}
        color="#f59e0b"
        transparent
        opacity={active ? 0.9 : 0}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

/* ── core orb ────────────────────────────────────────────────────────── */
function OrbCore({ orbState }: { orbState: OrbState }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);

  const col = useRef(new THREE.Color(T.idle.cr, T.idle.cg, T.idle.cb));
  const spRef = useRef<number>(T.idle.ringSpd);
  const vals = useRef<Target>({ ...T.idle });

  useFrame(({ clock }, dt) => {
    const tgt = T[orbState];
    const α = 1 - Math.pow(0.001, dt * 2);

    vals.current.distort  = lerp(vals.current.distort,  tgt.distort,  α);
    vals.current.speed    = lerp(vals.current.speed,    tgt.speed,    α);
    vals.current.emissive = lerp(vals.current.emissive, tgt.emissive, α);
    vals.current.lightI   = lerp(vals.current.lightI,   tgt.lightI,   α);
    spRef.current         = lerp(spRef.current,         tgt.ringSpd,  α);
    col.current.r = lerp(col.current.r, tgt.cr, α);
    col.current.g = lerp(col.current.g, tgt.cg, α);
    col.current.b = lerp(col.current.b, tgt.cb, α);

    if (matRef.current) {
      matRef.current.distort = vals.current.distort;
      matRef.current.speed   = vals.current.speed;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (matRef.current as any).color.copy(col.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (matRef.current as any).emissive.copy(col.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (matRef.current as any).emissiveIntensity = vals.current.emissive;
    }
    if (lightRef.current) {
      lightRef.current.intensity = vals.current.lightI;
      lightRef.current.color.copy(col.current);
    }
    if (light2Ref.current) {
      light2Ref.current.intensity = vals.current.lightI * 0.5;
      light2Ref.current.color.copy(col.current);
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += dt * 0.07;
      meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.25) * 0.1;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y -= dt * 0.12;
    }
  });

  return (
    <>
      <pointLight ref={lightRef}  position={[4, 4, 5]}    decay={2} />
      <pointLight ref={light2Ref} position={[-4, -4, -4]} decay={2} />
      <pointLight position={[0, -5, 2]} color="#7c3aed" intensity={2.5} decay={2} />

      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.5}>
        {/* outer glow — additive */}
        <mesh>
          <sphereGeometry args={[2.6, 32, 32]} />
          <meshBasicMaterial
            color="#22d3ee"
            transparent opacity={0.06}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* atmosphere — additive */}
        <mesh>
          <sphereGeometry args={[2.0, 32, 32]} />
          <meshBasicMaterial
            color="#22d3ee"
            transparent opacity={0.10}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* secondary halo — additive */}
        <mesh>
          <sphereGeometry args={[1.75, 32, 32]} />
          <meshBasicMaterial
            color="#22d3ee"
            transparent opacity={0.08}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* main distorted orb */}
        <mesh ref={meshRef}>
          <sphereGeometry args={[1.5, 128, 128]} />
          <MeshDistortMaterial
            ref={matRef}
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={1.2}
            distort={0.12}
            speed={0.8}
            roughness={0.0}
            metalness={0.05}
            transparent opacity={0.93}
            toneMapped={false}
          />
        </mesh>

        {/* inner white glow core */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.55, 64, 64]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent opacity={0.95}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* mid core glow */}
        <mesh>
          <sphereGeometry args={[0.90, 64, 64]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={2.0}
            transparent opacity={0.55}
            toneMapped={false}
          />
        </mesh>

        {/* outer core ring glow */}
        <mesh>
          <sphereGeometry args={[1.2, 64, 64]} />
          <meshBasicMaterial
            color="#22d3ee"
            transparent opacity={0.12}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </Float>

      {/* orbit rings */}
      <Ring r={2.4} tube={0.007} rotX={Math.PI / 2}  rotZ={0}           spRef={spRef} colRef={col} />
      <Ring r={2.9} tube={0.006} rotX={Math.PI / 5}  rotZ={Math.PI / 4} spRef={spRef} colRef={col} dir={-1} />
      <Ring r={2.1} tube={0.008} rotX={-Math.PI / 4} rotZ={Math.PI / 3} spRef={spRef} colRef={col} />

      {/* state FX */}
      <Sonar active={orbState === "listening"} />
      <ThinkParticles active={orbState === "thinking"} />
      {orbState === "speaking" && (
        <Sparkles
          count={100}
          scale={6}
          size={3}
          speed={1.0}
          opacity={1.0}
          color="#22d3ee"
          noise={1.5}
        />
      )}
    </>
  );
}

/* ── exported component ──────────────────────────────────────────────── */
export function ChatOrb({ orbState = "idle", className }: {
  orbState?: OrbState;
  className?: string;
}) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.6,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.08} />
        <OrbCore orbState={orbState} />
        <Stars radius={80} depth={30} count={1200} factor={2.5} fade speed={0.3} />
      </Canvas>
    </div>
  );
}
