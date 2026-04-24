"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Model3DType } from "@/lib/types";

interface Props {
  type: Model3DType;
  color: string;
  spinning: boolean;
}

function Scene({ type, color, spinning }: Props) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (spinning && group.current) {
      // 2π / 7.2s ≈ 0.873 rad/s — matches the CSS painting rotation period + direction
      group.current.rotation.y -= delta * ((Math.PI * 2) / 7.2);
    }
  });

  const content = useMemo(() => {
    const mat = (
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.35}
        emissive={color}
        emissiveIntensity={0.05}
      />
    );

    switch (type) {
      case "knot":
        return (
          <mesh>
            <torusKnotGeometry args={[0.75, 0.26, 180, 24, 2, 3]} />
            {mat}
          </mesh>
        );

      case "crystal": {
        // Cluster of asymmetric prisms pointing different ways
        const shards = [
          { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1.4, 1] },
          { pos: [0.55, 0.15, 0.1], rot: [0.3, 0.8, 0.4], scale: [0.55, 0.9, 0.55] },
          { pos: [-0.5, -0.05, 0.3], rot: [-0.4, -0.6, 0.2], scale: [0.5, 1.1, 0.5] },
          { pos: [0.1, 0.25, -0.55], rot: [0.1, 1.4, -0.3], scale: [0.4, 0.75, 0.4] },
          { pos: [-0.25, -0.3, -0.35], rot: [-0.2, 0.5, 0.7], scale: [0.45, 0.85, 0.45] },
        ] as const;
        return (
          <group>
            {shards.map((s, i) => (
              <mesh
                key={i}
                position={s.pos as unknown as [number, number, number]}
                rotation={s.rot as unknown as [number, number, number]}
                scale={s.scale as unknown as [number, number, number]}
              >
                <coneGeometry args={[0.4, 1.4, 5]} />
                {mat}
              </mesh>
            ))}
          </group>
        );
      }

      case "spikes": {
        // Central sphere with radial spikes in random directions
        const spikes: Array<[number, number, number]> = [];
        for (let i = 0; i < 14; i++) {
          const phi = Math.acos(1 - (2 * (i + 0.5)) / 14);
          const theta = Math.PI * (1 + Math.sqrt(5)) * i;
          spikes.push([Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]);
        }
        return (
          <group>
            <mesh>
              <icosahedronGeometry args={[0.55, 1]} />
              {mat}
            </mesh>
            {spikes.map(([x, y, z], i) => {
              const dir = new THREE.Vector3(x, y, z).normalize();
              const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
              const e = new THREE.Euler().setFromQuaternion(q);
              return (
                <mesh
                  key={i}
                  position={[dir.x * 0.85, dir.y * 0.85, dir.z * 0.85]}
                  rotation={[e.x, e.y, e.z]}
                >
                  <coneGeometry args={[0.14, 0.7, 6]} />
                  {mat}
                </mesh>
              );
            })}
          </group>
        );
      }

      case "helix": {
        // Cubes spiralling upward — very asymmetric, shows rotation strongly
        const N = 16;
        return (
          <group>
            {Array.from({ length: N }).map((_, i) => {
              const t = i / (N - 1);
              const angle = t * Math.PI * 2.2;
              const r = 0.7;
              const y = -1 + t * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(angle) * r, y, Math.sin(angle) * r]}
                  rotation={[angle, angle * 1.5, 0]}
                >
                  <boxGeometry args={[0.28, 0.28, 0.28]} />
                  {mat}
                </mesh>
              );
            })}
          </group>
        );
      }

      case "totem":
        // Asymmetric totem — elements offset off-axis
        return (
          <group>
            <mesh position={[0, -0.85, 0]} rotation={[0, 0.3, 0]}>
              <boxGeometry args={[1.0, 0.35, 0.8]} />
              {mat}
            </mesh>
            <mesh position={[0.15, -0.35, 0]} rotation={[0, -0.2, 0.1]}>
              <boxGeometry args={[0.7, 0.6, 0.55]} />
              {mat}
            </mesh>
            <mesh position={[-0.1, 0.2, 0.05]} rotation={[0.15, 0.4, -0.1]}>
              <boxGeometry args={[0.5, 0.55, 0.5]} />
              {mat}
            </mesh>
            <mesh position={[0.2, 0.75, -0.1]}>
              <sphereGeometry args={[0.32, 20, 20]} />
              {mat}
            </mesh>
            <mesh position={[-0.15, 1.05, 0.1]}>
              <tetrahedronGeometry args={[0.28, 0]} />
              {mat}
            </mesh>
          </group>
        );

      case "stack":
        // Clearly off-center stacked slabs — rotation is visible
        return (
          <group>
            {[-0.9, -0.4, 0.1, 0.6].map((y, i) => {
              const w = 1.15 - i * 0.08;
              const d = 0.55 + (i % 2) * 0.15;
              const offX = (i % 2 === 0 ? 0.15 : -0.15) * (i + 1) * 0.3;
              const rotY = (i % 2 === 0 ? 0.25 : -0.35) * (i + 1);
              return (
                <mesh key={i} position={[offX, y, 0]} rotation={[0, rotY, 0]}>
                  <boxGeometry args={[w, 0.4, d]} />
                  {mat}
                </mesh>
              );
            })}
          </group>
        );

      case "orbit":
        // A central distorted shape with orbiting satellites
        return (
          <group>
            <mesh>
              <dodecahedronGeometry args={[0.55, 0]} />
              {mat}
            </mesh>
            {[0, Math.PI * 0.6, Math.PI * 1.3].map((a, i) => (
              <mesh
                key={i}
                position={[Math.cos(a) * 1.1, (i - 1) * 0.4, Math.sin(a) * 1.1]}
                rotation={[a, a * 1.3, 0]}
              >
                <octahedronGeometry args={[0.28, 0]} />
                {mat}
              </mesh>
            ))}
          </group>
        );

      default:
        return (
          <mesh>
            <torusKnotGeometry args={[0.7, 0.25, 128, 16]} />
            {mat}
          </mesh>
        );
    }
  }, [type, color]);

  return <group ref={group}>{content}</group>;
}

export default function Sculpture3D({ type, color, spinning }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 3.6], fov: 35 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#faf7f1"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} />
      <directionalLight position={[-3, 1, -2]} intensity={0.45} color="#bcd4ff" />
      <pointLight position={[0, -2, 2]} intensity={0.35} color="#fff2d0" />
      <Scene type={type} color={color} spinning={spinning} />
    </Canvas>
  );
}
