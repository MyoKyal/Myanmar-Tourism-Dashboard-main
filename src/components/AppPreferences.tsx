"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { translate } from '@/lib/translations';

type Language = 'en' | 'my';
type Preferences = {
  language: Language; setLanguage: (language: Language) => void;
  theme: 'light' | 'dark'; toggleTheme: () => void;
  mobileNavOpen: boolean; setMobileNavOpen: (open: boolean) => void;
  t: (text: string) => string;
};
const PreferencesContext = createContext<Preferences | null>(null);

export function AppPreferences({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Guards the two write-effects below until the read-effect's saved values have actually
  // been applied to state. Without this, both effects fire once on mount using this
  // render's still-default language/theme (state updates from the read-effect haven't
  // landed yet within the same commit), silently overwriting a real saved preference back
  // to 'en'/'light' on every fresh page load before it ever reaches the screen.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem('tourism-language') as Language | null;
    const savedTheme = window.localStorage.getItem('tourism-theme') as 'light' | 'dark' | null;
    if (savedLanguage) setLanguage(savedLanguage);
    if (savedTheme) setTheme(savedTheme);
    setHydrated(true);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (hydrated) window.localStorage.setItem('tourism-theme', theme);
  }, [theme, hydrated]);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem('tourism-language', language);
  }, [language, hydrated]);
  const t = (text: string) => translate(text, language);
  return <PreferencesContext.Provider value={{ language, setLanguage, theme, toggleTheme: () => setTheme((value) => value === 'light' ? 'dark' : 'light'), mobileNavOpen, setMobileNavOpen, t }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within AppPreferences');
  return context;
}
