export function CoverPlate({ className = "" }: { className?: string }) {
  return (
    <div className={`cover-plate grid place-items-center rounded-md ${className}`}>
      <span className="font-mono text-[9px] uppercase tracking-widest text-inkline">Cvr</span>
    </div>
  );
}
