"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { UiModus } from "@/lib/types";

interface Profile {
  ui_modus: UiModus;
}

interface UiModusContextValue {
  uiModus: UiModus;
  setUiModus: (modus: UiModus) => void;
}

const UiModusContext = createContext<UiModusContextValue>({
  uiModus: "standard",
  setUiModus: () => undefined,
});

export function useUiModus(): UiModusContextValue {
  return useContext(UiModusContext);
}

interface UiModusProviderProps {
  profile: Profile;
  children: React.ReactNode;
}

export function UiModusProvider({ profile, children }: UiModusProviderProps) {
  const [uiModus, setUiModusState] = useState<UiModus>(
    profile.ui_modus ?? "standard"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-modus", uiModus);
  }, [uiModus]);

  function setUiModus(modus: UiModus) {
    setUiModusState(modus);
    document.documentElement.setAttribute("data-modus", modus);
  }

  return (
    <UiModusContext.Provider value={{ uiModus, setUiModus }}>
      {children}
    </UiModusContext.Provider>
  );
}
