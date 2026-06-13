import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls } from "@react-three/drei";
import { RobotModel } from "./RobotModel";

export default function Scene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas shadows camera={{ position: [0, 2, 10], fov: 45 }}>
        <fog attach="fog" args={["#101010", 10, 25]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight 
          position={[10, 10, 10]} 
          angle={0.15} 
          penumbra={1} 
          intensity={1} 
          castShadow 
        />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#00ff88" />
        
        {/* Environment for reflections */}
        <Environment preset="city" />

        <Suspense fallback={null}>
          <RobotModel position={[0, -1, 0]} scale={2} />
        </Suspense>

        <ContactShadows 
          position={[0, -2, 0]} 
          opacity={0.5} 
          scale={20} 
          blur={2.5} 
          far={4.5} 
          color="#00ff88"
        />

        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          minPolarAngle={Math.PI / 2.5} 
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
