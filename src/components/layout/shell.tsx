import React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  const [location] = useLocation();
  const isMonitoring = location === "/dashboard";
  const bgImage = isMonitoring ? "/bg-dark-texture.png" : null;

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white relative overflow-hidden font-sans">
      {/* Gambar Latar Belakang */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={bgImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: bgImage ? `url(${bgImage})` : undefined, }}
        >
          {/* Overlay agar teks tetap terbaca */}
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70" />
        </motion.div>
      </AnimatePresence>

      {/* Tekstur Grid halus */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]"
        style={{ 
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} 
      />
      
      {/* Efek Vignette (gelap di pinggir) */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

      {/* Konten Utama */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("relative z-10 w-full min-h-screen flex flex-col", className)}
      >
        {children}
      </motion.div>
    </div>
  );
}