"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Must match Sculpture3D and ArtworkCard container — all use this warm off-white.
const BG = "#faf7f1";

interface ModelProps {
  url: string;
  spinning: boolean;
  scale: number;
}

function Model({ url, spinning, scale }: ModelProps) {
  const gltf = useLoader(GLTFLoader, url);
  const group = useRef<THREE.Group>(null);

  const originalBounds = useMemo(() => {
    const scene = gltf.scene;
    // Reset to identity before measuring to get true dimensions
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return { size, center };
  }, [gltf.scene]);

  useMemo(() => {
    const scene = gltf.scene;
    const { size, center } = originalBounds;
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return;
    const fitScale = (1.8 / maxDim) * scale;
    scene.scale.setScalar(fitScale);
    scene.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
  }, [gltf.scene, scale, originalBounds]);

  useFrame((_, delta) => {
    if (spinning && group.current) {
      group.current.rotation.y -= delta * ((Math.PI * 2) / 7.2);
    }
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

interface Props {
  url: string;
  spinning?: boolean;
  scale?: number;
}

export default function GLBViewer({ url, spinning = true, scale = 1 }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-3, -3, -3]} intensity={0.3} />
      <Suspense fallback={null}>
        <Model url={url} spinning={spinning} scale={scale} />
      </Suspense>
    </Canvas>
  );
}
