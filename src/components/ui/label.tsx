import { cn } from "../../lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = ({ className, ...props }: LabelProps) => {
  return (
    <label
      className={cn(
        "text-white/70 font-mono text-xs uppercase",
        className
      )}
      {...props}
    />
  );
};

