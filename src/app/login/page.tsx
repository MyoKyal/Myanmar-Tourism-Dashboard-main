"use client";

import { Suspense, useActionState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Globe2, Loader2, LogIn, ShieldCheck, MousePointerClick } from "lucide-react";
import { loginAction, type LoginState } from "@/actions/auth";

const DEMO_PASSWORD = "Demo@2025";
const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "admin@myanmar-tourism.gov.mm" },
  { role: "Destination Manager (Bagan)", email: "bagan.manager@myanmar-tourism.gov.mm" },
  { role: "Business User", email: "owner@ngapali-bay-resort.example" },
  { role: "Tourist", email: "tourist@example.com" },
];

const initialState: LoginState = { error: null };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "";
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Typing (or copy-pasting) a 30+ character demo email is exactly where a stray typo or an
  // invisible copied space creeps in -- both produce the same generic "Incorrect email or
  // password" message as a genuinely wrong credential, with no way to tell them apart. One
  // click fills both fields with values known to be exactly correct, removing that failure
  // mode entirely instead of just making it easier to debug after the fact.
  function fillDemoAccount(email: string) {
    if (emailRef.current) emailRef.current.value = email;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="fixed top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-900/20 blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-purple-900/20 blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Globe2 className="w-7 h-7 text-emerald-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">Myanmar Tourism Platform</h1>
        </div>

        <form action={formAction} className="glass-panel p-7">
          <h2 className="text-lg font-bold text-slate-100 mb-1">Sign in</h2>
          <p className="text-sm text-slate-400 mb-6">Access your role&apos;s dashboard.</p>

          <input type="hidden" name="redirectTo" value={redirectTo} />

          <label className="flex flex-col gap-1.5 mb-4">
            <span className="text-sm font-semibold text-slate-400">Email</span>
            <input
              ref={emailRef}
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-700/50 bg-slate-950/50 px-3 py-2.5 text-slate-200 outline-none focus:border-cyan-500 transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1.5 mb-2">
            <span className="text-sm font-semibold text-slate-400">Password</span>
            <input
              ref={passwordRef}
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-700/50 bg-slate-950/50 px-3 py-2.5 text-slate-200 outline-none focus:border-cyan-500 transition-colors"
            />
          </label>

          {state.error && (
            <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg px-3 py-2 mt-3">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-semibold py-2.5 transition-colors"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="glass-panel p-5 mt-4 border-amber-800/30">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">Demo environment -- not real accounts</p>
              <p className="text-[11px] text-slate-500 mb-2 flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> Click a row to fill the form -- avoids typos in the long emails below.</p>
              <ul className="space-y-1 text-xs text-slate-400">
                {DEMO_ACCOUNTS.map((a) => (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => fillDemoAccount(a.email)}
                      className="w-full flex justify-between gap-3 text-left px-1.5 py-1 -mx-1.5 rounded-md hover:bg-white/5 transition-colors"
                    >
                      <span className="text-slate-500">{a.role}</span>
                      <span className="font-mono text-slate-300">{a.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-2">Password for every demo account: <span className="font-mono text-slate-300">{DEMO_PASSWORD}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
