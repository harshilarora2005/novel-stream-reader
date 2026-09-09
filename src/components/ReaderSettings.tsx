import { fonts, setSettings, themes, useSettings } from "@/lib/settings";
import { X, Palette, Type, AlignJustify, MoveHorizontal } from "lucide-react";

export function ReaderSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col border-l border-line bg-paper transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-5 py-4">
          <h2 className="truncate font-display text-xl">Reader settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="shrink-0 text-ink-soft hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-8 overflow-y-auto px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <section>
            <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              <Palette className="size-4" /> Theme
            </p>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSettings({ theme: t.id, autoNight: false })}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-2.5 transition-colors ${
                    s.theme === t.id
                      ? "border-pencil bg-pencil-soft/50"
                      : "border-line hover:border-inkline"
                  }`}
                >
                  <span
                    className="size-8 rounded-full border border-inkline"
                    style={{ backgroundColor: t.swatch }}
                  />
                  <span className="font-mono text-[10px] text-ink-soft">{t.label}</span>
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
              <span>Auto night after dark</span>
              <input
                type="checkbox"
                checked={s.autoNight}
                onChange={(e) => setSettings({ autoNight: e.target.checked })}
                className="size-4 accent-pencil"
              />
            </label>
          </section>

          <section>
            <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              <Type className="size-4" /> Font
            </p>
            <div className="space-y-2">
              {fonts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSettings({ font: f.id })}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                    s.font === f.id
                      ? "border-pencil bg-pencil-soft/40"
                      : "border-line hover:border-inkline"
                  }`}
                  style={{ fontFamily: f.stack }}
                >
                  <span className="text-base">{f.label}</span>
                  <span className="text-sm text-ink-soft">Aa</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              <span className="flex items-center gap-2">
                <Type className="size-4" /> Font size
              </span>
              <span className="text-ink">{s.size}px</span>
            </div>
            <input
              type="range"
              min={14}
              max={28}
              value={s.size}
              onChange={(e) => setSettings({ size: Number(e.target.value) })}
              className="w-full accent-pencil"
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              <span className="flex items-center gap-2">
                <AlignJustify className="size-4" /> Line spacing
              </span>
              <span className="text-ink">{s.leading.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={1.3}
              max={2.4}
              step={0.1}
              value={s.leading}
              onChange={(e) => setSettings({ leading: Number(e.target.value) })}
              className="w-full accent-pencil"
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              <span className="flex items-center gap-2">
                <MoveHorizontal className="size-4" /> Width
              </span>
              <span className="text-ink">{s.width}ch</span>
            </div>
            <input
              type="range"
              min={40}
              max={90}
              value={s.width}
              onChange={(e) => setSettings({ width: Number(e.target.value) })}
              className="w-full accent-pencil"
            />
          </section>
        </div>
      </aside>
    </>
  );
}
