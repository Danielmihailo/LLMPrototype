/**
 * JarvisOrb — full-screen hero 3D scene for the homepage.
 * Large distorted metallic sphere, orbit rings, ambient particles, star field.
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Stars } from "@react-three/drei";
import * as THREE from "three";

function HeroOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
      meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.25) * 0.12;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y -= delta * 0.14;
      coreRef.current.rotation.z = Math.cos(clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.6}>
      {/* main sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.8, 128, 128]} />
        <MeshDistortMaterial
          color="#22d3ee"
          emissive="#0891b2"
          emissiveIntensity={0.4}
          distort={0.28}
          speed={1.8}
          roughness={0.0}
          metalness={0.95}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* inner core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.85, 64, 64]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#22d3ee"
          emissiveIntensity={0.7}
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* soft outer halo */}
      <mesh>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.035}
          side={THREE.BackSide}
        />
      </mesh>
    </Float>
  );
}

function OrbitRing({
  radius,
  tube,
  rotX,
  rotZ,
  speed,
  offset = 0,
}: {
  radius: number;
  tube: number;
  rotX: number;
  rotZ: number;
  speed: number;
  offset?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += speed * delta;
  });
  return (
    <mesh ref={ref} rotation={[rotX, 0, rotZ + offset]}>
      <torusGeometry args={[radius, tube, 16, 128]} />
      <meshStandardMaterial
        color="#22d3ee"
        emissive="#22d3ee"
        emissiveIntensity={0.5}
        transparent
        opacity={0.28}
        toneMapped={false}
      />
    </mesh>
  );
}

function AmbientParticles() {
  const count = 800;

  const geo = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3.5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.025;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.045}
        color="#22d3ee"
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  );
}

export function JarvisOrb({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 46 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.06} />
        <pointLight position={[5, 5, 6]}   color="#22d3ee" intensity={4.5} />
        <pointLight position={[-5, -4, -4]} color="#0891b2" intensity={2.5} />
        <pointLight position={[0, -6, 3]}  color="#7c3aed" intensity={1.2} />

        <HeroOrb />

        <OrbitRing radius={2.9} tube={0.007} rotX={Math.PI / 2} rotZ={0}           speed={0.14}  />
        <OrbitRing radius={3.5} tube={0.005} rotX={Math.PI / 6} rotZ={Math.PI / 4} speed={-0.10} offset={1.0} />
        <OrbitRing radius={2.5} tube={0.009} rotX={Math.PI / 3} rotZ={Math.PI / 2} speed={0.18}  offset={2.2} />

        <AmbientParticles />
        <Stars radius={80} depth={40} count={2000} factor={3} fade speed={0.4} />
      </Canvas>
    </div>
  );
}
