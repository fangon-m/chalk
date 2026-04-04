import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const SettingsContext = createContext({ accentColor: "#c8f04c" });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ accentColor: "#c8f04c", compactMode: false, hideOffToday: false });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          accentColor:   data.accent_color   || "#c8f04c",
          compactMode:   data.compact_mode   ?? false,
          hideOffToday:  data.hide_off_today ?? false,
        });
      }
    }
    load();

    // Listen for updates broadcast by SettingsPage
    function handleUpdate(e) {
      setSettings(prev => ({ ...prev, ...{
        accentColor:  e.detail.accentColor,
        compactMode:  e.detail.compactMode,
        hideOffToday: e.detail.hideOffToday,
      }}));
    }
    window.addEventListener("chalk:settings", handleUpdate);
    return () => window.removeEventListener("chalk:settings", handleUpdate);
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);