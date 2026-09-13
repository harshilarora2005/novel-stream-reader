import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in to Marginal — your reading room" },
      {
        name: "description",
        content:
          "Sign in to Marginal to keep your library, reading position and notes in sync across every device.",
      },
      { property: "og:title", content: "Sign in to Marginal" },
      {
        property: "og:description",
        content: "A reading room, not a feed. Sign in to carry your place across devices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/library", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/library", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setNote("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10 font-body text-ink">
      <div className="w-full max-w-[400px] animate-fade-up">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="label text-tint">Marginal</p>
            <h1 className="mt-2 text-balance font-display text-3xl tracking-tight sm:text-4xl">
              A reading room, not a feed.
            </h1>
            <p className="mt-3 text-pretty text-[15px] text-ink-soft">
              Sign in to keep your library, your place in every book, and your notes together on
              every device.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <button
          onClick={google}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-paper-deep px-4 py-3 text-sm font-medium transition-colors hover:border-inkline"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-line bg-paper-deep px-4 py-3 text-[15px] outline-none transition-colors focus:border-inkline placeholder:text-ink-soft/60"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-line bg-paper-deep px-4 py-3 text-[15px] outline-none transition-colors focus:border-inkline placeholder:text-ink-soft/60"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/80 disabled:opacity-60"
          >
            {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {note && <p className="mt-3 text-sm text-ink-soft">{note}</p>}

        <p className="mt-5 text-center font-mono text-[11px] text-ink-soft">
          {mode === "signin" ? "New to Marginal?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNote(null);
            }}
            className="text-tint underline underline-offset-4"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
