"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";

interface DashboardUser {
  username: string;
  preferredLang: string;
  uiLanguage: string;
}

export default function DashboardStateInitializer({
  user,
}: {
  user: DashboardUser | null;
}) {
  const { setLanguage, setUsername, setPreferredLang } = useUserStore();

  useEffect(() => {
    if (user) {
      setLanguage(user.uiLanguage === "en" ? "en" : "zh");
      setUsername(user.username);
      setPreferredLang(user.preferredLang);
    }
  }, [user, setLanguage, setUsername, setPreferredLang]);

  return null;
}
