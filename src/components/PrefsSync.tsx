import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPrefs, savePrefs } from "@/lib/books.functions";
import { applyRemoteSettings, setSettingsPusher, type Settings } from "@/lib/settings";

/** Keeps theme/typography choices tied to the signed-in account. */
export function PrefsSync() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function attach() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setSettingsPusher(null);
        return;
      }
      try {
        const remote = (await getPrefs()) as Partial<Settings> | null;
        if (remote && !cancelled) applyRemoteSettings(remote);
      } catch {
        /* offline or first run */
      }
      if (cancelled) return;
      setSettingsPusher((s) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          void savePrefs({ data: { data: { ...s } } }).catch(() => {});
        }, 800);
      });
    }

    void attach();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void attach();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSettingsPusher(null);
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
