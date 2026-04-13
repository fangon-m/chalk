import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const SettingsContext = createContext({
  accentColor:  "#c8f04c",
  hideOffToday: false,
  kanbanMode:   false,
  bgColor:      "#0d0d0d",
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    accentColor:  "#c8f04c",
    hideOffToday: false,
    kanbanMode:   false,
    bgColor:      "#0d0d0d",
  });

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
          accentColor:  data.accent_color  || "#c8f04c",
          hideOffToday: data.hide_off_today ?? false,
          kanbanMode:   data.kanban_mode   ?? false,
          bgColor:      data.bg_color      || "#0d0d0d",
        });
      }
    }
    load();

    function handleUpdate(e) {
      setSettings(prev => ({
        ...prev,
        accentColor:  e.detail.accentColor  ?? prev.accentColor,
        hideOffToday: e.detail.hideOffToday ?? prev.hideOffToday,
        kanbanMode:   e.detail.kanbanMode   ?? prev.kanbanMode,
        bgColor:      e.detail.bgColor      ?? prev.bgColor,
      }));
    }
    window.addEventListener("chalk:settings", handleUpdate);
    return () => window.removeEventListener("chalk:settings", handleUpdate);
  }, []);

  // Keep document body background in sync so every page picks it up
  useEffect(() => {
    document.body.style.background = settings.bgColor;
    document.documentElement.style.background = settings.bgColor;
  }, [settings.bgColor]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);