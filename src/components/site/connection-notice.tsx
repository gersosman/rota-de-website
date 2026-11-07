"use client";

import { useEffect, useState } from "react";

export function ConnectionNotice({ slow, offline }: { slow: string; offline: string }) {
  const [mode, setMode] = useState<"ok" | "slow" | "offline">("ok");
  useEffect(() => {
    const read = () => {
      if (!navigator.onLine) {
        setMode("offline");
        return;
      }
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
      const slowType = connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g" || connection?.saveData;
      setMode(slowType ? "slow" : "ok");
    };
    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);
  if (mode === "ok") return null;
  return (
    <p className="bg-band px-4 py-2 text-center text-sm text-band-foreground" role="status">
      {mode === "offline" ? offline : slow}
    </p>
  );
}
