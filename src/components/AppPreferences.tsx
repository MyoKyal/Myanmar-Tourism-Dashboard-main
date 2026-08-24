"use client";

import { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'my';
type Preferences = {
  language: Language; setLanguage: (language: Language) => void;
  theme: 'light' | 'dark'; toggleTheme: () => void;
  mobileNavOpen: boolean; setMobileNavOpen: (open: boolean) => void;
};
const PreferencesContext = createContext<Preferences | null>(null);

export function AppPreferences({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem('tourism-language') as Language | null;
    const savedTheme = window.localStorage.getItem('tourism-theme') as 'light' | 'dark' | null;
    if (savedLanguage) setLanguage(savedLanguage);
    if (savedTheme) setTheme(savedTheme);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('tourism-theme', theme);
  }, [theme]);
  useEffect(() => window.localStorage.setItem('tourism-language', language), [language]);
  return <PreferencesContext.Provider value={{ language, setLanguage, theme, toggleTheme: () => setTheme((value) => value === 'light' ? 'dark' : 'light'), mobileNavOpen, setMobileNavOpen }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within AppPreferences');
  return context;
}
