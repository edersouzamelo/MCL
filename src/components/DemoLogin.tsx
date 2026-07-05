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
      callbackUrl: "/painel",
    });
    setIsSubmitting(false);

    if (result?.ok) {
      window.location.href = result.url ?? "/painel";
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

      <button
        type="button"
        onClick={() => signIn("github", { callbackUrl: "/painel" })}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-zinc-300 px-4 py-2 font-semibold text-zinc-800 transition hover:bg-zinc-100"
      >
        <GitPullRequest aria-hidden className="h-4 w-4" />
        GitHub OAuth configuravel
      </button>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
    </form>
  );
}
