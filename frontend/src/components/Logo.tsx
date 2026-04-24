import { Stethoscope } from "lucide-react";

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Stethoscope size={size} />
      </div>
      <span className="text-lg font-bold tracking-tight">
        Medi<span className="text-primary">Queue</span>
      </span>
    </div>
  );
}
