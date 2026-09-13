import { BookOpen } from "lucide-react";

export function CoverPlate({ className = "" }: { className?: string }) {
  return (
    <div
      className={`cover-plate grid place-items-center rounded-md ${className}`}
      aria-label="No cover image"
    >
      <BookOpen className="h-1/3 w-1/3 min-h-4 min-w-4 text-inkline" aria-hidden="true" />
    </div>
  );
}
