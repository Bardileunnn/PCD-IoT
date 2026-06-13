import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = ({ className, ...props }: InputProps) => {
  return (
    <input
      className={cn(
        "w-full bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all",
        className
      )}
      {...props}
    />
  );
};

