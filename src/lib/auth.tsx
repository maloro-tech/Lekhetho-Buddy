import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { repository } from "@/lib/data";
import type { Language, Profile } from "@/lib/types";

interface AuthValue {
  ready: boolean;
  user: Profile | null;
  language: Language;
  revision: number;
  signIn: (input: { email: string; password: string }) => Promise<Profile>;
  signUp: (input: { firstName: string; email: string; password: string }) => Promise<Profile>;
  signOut: () => void;
  setLanguage: (language: Language) => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function storedLanguage(): Language {
  try {
    return localStorage.getItem("lekhetho.lang") === "st" ? "st" : "en";
  } catch {
    return "en";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
  const [language, setLanguageState] = useState<Language>("en");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancel = false;
    void repository.init().then(() => {
      if (cancel) return;
      const current = repository.currentUser();
      setUser(current);
      setLanguageState(current?.preferred_language ?? storedLanguage());
      setReady(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "st" ? "st" : "en";
  }, [language]);

  const refresh = useCallback(() => {
    const current = repository.currentUser();
    setUser(current);
    if (current) setLanguageState(current.preferred_language);
    setRevision((value) => value + 1);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      user,
      language,
      revision,
      signIn: async (input) => {
        const profile = await repository.signIn(input);
        setUser(profile);
        setLanguageState(profile.preferred_language);
        setRevision((item) => item + 1);
        return profile;
      },
      signUp: async (input) => {
        const profile = await repository.signUp(input);
        setUser(profile);
        setLanguageState(profile.preferred_language);
        setRevision((item) => item + 1);
        return profile;
      },
      signOut: () => {
        repository.signOut();
        setUser(null);
        setRevision((item) => item + 1);
      },
      setLanguage: (next) => {
        try {
          localStorage.setItem("lekhetho.lang", next);
        } catch {
          /* Profile update still proceeds when signed in. */
        }
        if (repository.currentUser()) {
          const profile = repository.setLanguage(next);
          setUser(profile);
        }
        setLanguageState(next);
        setRevision((item) => item + 1);
      },
      refresh,
    }),
    [language, ready, refresh, revision, user],
  );

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper px-6 text-ink">
        <p className="text-[18px] font-semibold tracking-[-0.03em]">Lekhetho Buddy</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

export function useI18n() {
  const { language } = useAuth();
  const tr = useCallback((en: string, st: string) => (language === "st" ? st : en), [language]);
  return { language, tr };
}
