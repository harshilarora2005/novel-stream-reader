import { cycleTheme, useSettings, themes } from "@/lib/settings";

export function ThemeToggle() {
  const { theme } = useSettings();
  const label = themes.find((t) => t.id === theme)?.label ?? "Light";

  return (
    <button
      onClick={cycleTheme}
      aria-label={`Theme: ${label}. Change theme`}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft transition-colors hover:border-inkline hover:text-ink"
    >
      <span
        className="size-3 rounded-full border border-inkline"
        style={{ backgroundColor: themes.find((t) => t.id === theme)?.swatch }}
      />
      {label}
    </button>
  );
}
