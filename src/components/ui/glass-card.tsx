import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type GlassCardProps = {
  children?: ReactNode;
  className?: string;
  noBorder?: boolean;
  lighter?: boolean;
} & Omit<HTMLMotionProps<"div">, "children">;

export function GlassCard({
  className,
  children,
  noBorder = false,
  lighter = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "backdrop-blur-md relative overflow-hidden transition-all duration-500",
        lighter ? "bg-white/15" : "bg-black/40",
        !noBorder && (lighter ? "border border-white/20" : "border border-white/10"),
        className
      )}
      {...props}
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-white/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-white/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-white/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-white/30" />
      {children}
    </motion.div>
  );
}
