"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GitPullRequest, KeyRound, Loader2, Mail } from "lucide-react";

export function DemoLogin() {
  const [email, setEmail] = useState("operador.demo@mcl.invalid");
  const [password, setPassword] = useState("MCL-DEMO-2026");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDemoLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await signIn("demo", {
      email,
      password,
      redirect: false,
      callbackUrl: "/inicio",
    });
    setIsSubmitting(false);

    if (result?.ok) {
      window.location.href = result.url ?? "/inicio";
      return;
    }

    setError("Email ou senha invalidos, ou modo demonstrativo desabilitado.");
  }

  return (
    <form className="space-y-4" onSubmit={handleDemoLogin}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-800" htmlFor="email">
          Email
        </label>
        <div className="flex min-h-11 items-center rounded border border-zinc-300 bg-white px-3 focus-within:border-emerald-600">
          <Mail aria-hidden className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 outline-none"
            autoComplete="username"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-800" htmlFor="password">
          Senha
        </label>
        <div className="flex min-h-11 items-center rounded border border-zinc-300 bg-white px-3 focus-within:border-emerald-600">
          <KeyRound aria-hidden className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 outline-none"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-emerald-700 px-4 py-2 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-emerald-100"
      >
        {isSubmitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <KeyRound aria-hidden className="h-4 w-4" />}
        Entrar
      </button>

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200" />
        <span>OAuth opcional</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/inicio" })}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded border border-zinc-300 px-4 py-2 font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: "/inicio" })}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded border border-zinc-300 px-4 py-2 font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          <GitPullRequest aria-hidden className="h-4 w-4" />
          GitHub
        </button>
      </div>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
    </form>
  );
}
