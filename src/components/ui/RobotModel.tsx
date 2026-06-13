import { useEffect, useRef } from "react";
import { useGLTF, useAnimations, Float } from "@react-three/drei";
// import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function RobotModel(props: any) {
  const group = useRef<THREE.Group>(null);
  // Load the GLB file from public directory
  const gltf = useGLTF("/robot.glb");
  const { animations } = gltf;
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Play the first animation found, if any
    if (animations.length > 0) {
      const firstAnim = Object.keys(actions)[0];
      if (firstAnim && actions[firstAnim]) {
        actions[firstAnim]?.reset().fadeIn(0.5).play();
      }
    }
  }, [actions, animations]);

  if (!gltf.scene) {
    return null; 
  }

  return (
    <Float 
      speed={2} // Animation speed
      rotationIntensity={0.5} // XYZ rotation intensity
      floatIntensity={0.5} // Up/down float intensity
    >
      <group ref={group} {...props} dispose={null}>
        <primitive object={gltf.scene} />
      </group>
    </Float>
  );
}

useGLTF.preload("/robot.glb");
