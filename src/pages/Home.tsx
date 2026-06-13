import { Link } from "wouter";
import React, { useState, useEffect, useRef, Component, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Float, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { Button } from "@/components/ui/button";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import * as THREE from "three";

// Error Boundary untuk handle model loading error
class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Model loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

      // Fallback robot component
function FallbackRobot({ mouseX }: { mouseX: number }) {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (group.current) {
      const targetRotationY = mouseX * 0.5;
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotationY, 0.05);
      group.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.1;
    }
  });
  
  return (
    <group ref={group}>
      {/* Placeholder robot sebagai fallback */}
      <mesh scale={1.5} position={[0, -1, 0]}>
        <boxGeometry args={[1.5, 0.8, 1]} />
        <meshStandardMaterial 
          color="#00ff88" 
          emissive="#00ff88" 
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Wheels */}
      <mesh position={[0.6, -1.4, 0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.6, -1.4, 0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.6, -1.4, -0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.6, -1.4, -0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

      // Load actual robot.glb model
function RobotModelInternal({ mouseX }: { mouseX: number }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/robot.glb");
  
  // Clone dengan SkeletonUtils agar animasi tetap jalan
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  
  const { actions, names } = useAnimations(animations, group);
  
  React.useEffect(() => {
    if (names && names.length > 0) {
      console.log('Available animations:', names);
      
      names.forEach(name => {
        const action = actions[name];
        if (action) {
          console.log('Playing:', name);
          action.reset().play();
        }
      });
    }
  }, [actions, names]);

  useFrame((state) => {
    if (group.current) {
      const targetRotationY = mouseX * 0.5; 
      const targetRotationX = mouseX * 0.1;
      
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotationY, 0.05);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotationX, 0.05);
      group.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.1;
    }
  });

  return (
    <group ref={group}>
      <primitive object={clone} scale={1.5} position={[0, -1, 0]} />
      
      <Float speed={4} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[2, 1, -1]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.5} />
        </mesh>
      </Float>
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[-2, -0.5, -1]}>
          <octahedronGeometry args={[0.3]} />
          <meshStandardMaterial color="#00ffff" emissiveIntensity={0.5} />
        </mesh>
      </Float>
    </group>
  );
}

      // Wrapper dengan ErrorBoundary
function RobotModel({ mouseX }: { mouseX: number }) {
  return (
    <ModelErrorBoundary fallback={<FallbackRobot mouseX={mouseX} />}>
      <RobotModelInternal mouseX={mouseX} />
    </ModelErrorBoundary>
  );
}

      // Preload model
      useGLTF.preload("/robot.glb");

      // Platform for the robot
      function Platform() {
        return (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
            <circleGeometry args={[3, 64]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
            {/* Grid texture simulation via wireframe ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[2.8, 3, 64]} />
              <meshBasicMaterial color="#00ff88" wireframe />
            </mesh>
          </mesh>
        );
      }
// --- MAIN PAGE COMPONENT ---

export default function Home() {
  const [mouseX, setMouseX] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);

  // Smooth camera movement following cursor horizontally only
  const mouseXMotion = useMotionValue(0);
  const smoothMouseX = useSpring(mouseXMotion, { stiffness: 50, damping: 20 });

  // Transform for text parallax (Left side moves slightly opposite to mouse)
  const textParallax = useTransform(smoothMouseX, [-1, 1], [20, -20]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
      setMouseX(normalizedX);
      mouseXMotion.set(normalizedX);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Random glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 150);
      }
    }, 3000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(glitchInterval);
    };
  }, [mouseXMotion]);

  const textVariants = {
    hidden: { opacity: 0, x: -50, filter: "blur(10px)" },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.8,
        type: "spring" as const,
        stiffness: 100,
      },
    }),
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white selection:bg-[#00ff88] selection:text-black font-sans">
      
      {/* --- BACKGROUND ELEMENTS --- */}
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#00ff88] rounded-full blur-[1px]"
            animate={{
              y: [Math.random() * 1000, Math.random() * -200],
              x: [Math.random() * 1000, Math.random() * 1000],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: "100%",
            }}
          />
        ))}
      </div>

    {/* --- MAIN LAYOUT GRID --- */}
    <div className="relative z-10 w-full h-full grid grid-cols-1 md:grid-cols-2 gap-0 p-6 md:p-12 pointer-events-none">
      
      {/* LEFT HALF: TYPOGRAPHY */}
      <motion.div 
        className="col-span-1 flex flex-col justify-center items-start pointer-events-auto h-full"
        style={{ x: textParallax }}
      >
        <div className="space-y-2">
          {/* Subheader */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-6"
          >
            <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse"></div>
            <span className="font-mono text-xs tracking-[0.3em] text-[#00ff88]">
              AGV_SYSTEM
            </span>
          </motion.div>

          {/* Main Title */}
          <div className="relative">
            <motion.h1
              custom={0}
              initial="hidden"
              animate="visible"
              variants={textVariants}
              className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] text-white"
            >
              AUTO<br/>
              <span className="relative inline-block">
                MATED
                {/* Glitch layers */}
                <motion.span 
                  className="absolute top-0 left-0 -ml-1 text-[#ff00ff] opacity-0 mix-blend-screen"
                  animate={isGlitching ? { x: [-2, 2, -1, 0], opacity: [0, 0.8, 0] } : {}}
                  transition={{ duration: 0.15 }}
                >
                  MATED
                </motion.span>
              </span>
            </motion.h1>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={textVariants}
              className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] text-transparent stroke-text mt-2"
            >
              GUIDED
            </motion.h1>
          </div>

          {/* Vehicle Title */}
          <div className="mt-8 space-y-1">
            <motion.h2
              custom={2}
              initial="hidden"
              animate="visible"
              variants={textVariants}
              className="text-2xl md:text-4xl font-bold text-[#00ff88] tracking-[0.25em] uppercase leading-tight"
            >
              Vehicle
            </motion.h2>

            <motion.h3
              custom={3}
              initial="hidden"
              animate="visible"
              variants={textVariants}
              className="text-sm md:text-lg font-mono text-white/50 tracking-[0.3em] uppercase"
            >
              Line Follower
            </motion.h3>
          </div>
        </div>
      </motion.div>

      {/* RIGHT HALF: 3D SCENE + BUTTON */}
      <div className="col-span-1 relative h-full w-full pointer-events-auto flex flex-col">
        
        {/* 3D Canvas Area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 z-0">
            <Canvas 
              camera={{ position: [0, 0, 6], fov: 45 }}
              gl={{ 
                antialias: true,
                alpha: false,
                powerPreference: "high-performance"
              }}
              onCreated={({ gl }) => {
                gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              }}
            >
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} color="#00ff88" />
              <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00ff" />
              
              <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
                <RobotModel mouseX={mouseX} />
                <Platform />
              </Float>
            </Canvas>
          </div>
          
          {/* Scanline Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30 z-10"></div>
        </div>

        {/* START Button - Bottom Right */}
        <div className="absolute bottom-8 right-8 z-20">
        <Link href="/auth" className="w-full">
          <motion.div
            whileHover={{ scale: 0.95 }}
            whileTap={{ scale: 0.95 }}
          >
              <Button 
                className="group relative px-8 py-6 text-lg font-bold bg-transparent border border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88] hover:text-black transition-all duration-300 overflow-hidden clip-path-slant"
              >
                {/* Button Glow Effect */}
                <motion.div
                  className="absolute inset-0 bg-[#00ff88] opacity-0 group-hover:opacity-20"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                  <span className="relative flex items-center gap-3 font-mono tracking-wider">
                    START
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.span>
                  </span>
              </Button>
          </motion.div>
        </Link>
        </div>
      </div>
    </div>

      {/* --- GLOBAL OVERLAYS --- */}

      {/* Vignette Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 z-30 pointer-events-none opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      ></div>

      <style>{`
        .stroke-text {
          -webkit-text-stroke: 2px rgba(255, 255, 255, 0.5);
          color: transparent;
        }
        .clip-path-slant {
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%);
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}