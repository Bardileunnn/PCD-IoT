import React from "react";
import { cn } from "../../lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

interface NeonButtonProps extends HTMLMotionProps<"button"> {
  variant?: "blue" | "green" | "red" | "outline";
  glow?: boolean;
  children: React.ReactNode;
}

export const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant = "blue", glow = true, children, ...props }, ref) => {
    const variants = {
      blue: "border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black",
      green: "border-neon-green text-neon-green hover:bg-neon-green hover:text-black",
      red: "border-neon-red text-neon-red hover:bg-neon-red hover:text-black",
      outline: "border-white/20 text-white hover:border-black hover:bg-white hover:text-black",
    };

    const glowClass = glow 
      ? variant === "blue" ? "shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:shadow-[0_0_25px_rgba(0,243,255,0.6)]" 
      : variant === "green" ? "shadow-[0_0_15px_rgba(0,255,157,0.3)] hover:shadow-[0_0_25px_rgba(0,255,157,0.6)]"
      : variant === "red" ? "shadow-[0_0_15px_rgba(255,0,85,0.3)] hover:shadow-[0_0_25px_rgba(255,0,85,0.6)]"
      : variant === "outline" ? "hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
      : "" : "";

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "px-8 py-3 rounded-none border font-mono font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer",
          variants[variant],
          glowClass,
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
NeonButton.displayName = "NeonButton";