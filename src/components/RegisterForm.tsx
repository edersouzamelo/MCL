"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { KeyRound, Loader2, Mail } from "lucide-react";

export function RegisterForm() {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [terms, setTerms]         = useState(false);
  const [error, setError]         = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!terms) {
      setError("Você precisa aceitar os Termos de Uso para continuar.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);

    // Para o piloto demonstrativo, tentamos fazer login com as credenciais demo.
    // Em produção, aqui chamaria uma API de registro real.
    const result = await signIn("demo", {
      email,
      password,
      redirect: false,
      callbackUrl: "/primeiro-acesso",
    });

    setIsSubmitting(false);

    if (result?.ok) {
      window.location.href = result.url ?? "/primeiro-acesso";
      return;
    }

    setError(
      "Não foi possível criar a conta com as credenciais informadas. " +
      "No modo demonstrativo, use um e-mail cadastrado no piloto."
    );
  }

  return (
    <div className="space-y-5">
      {/* Login Social */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          id="btn-register-google"
          onClick={() => signIn("google", { callbackUrl: "/primeiro-acesso" })}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 font-semibold text-zinc-800 dark:text-zinc-200 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4 shrink-0" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Registrar com Google
        </button>
        <button
          type="button"
          id="btn-register-github"
          onClick={() => signIn("github", { callbackUrl: "/primeiro-acesso" })}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 font-semibold text-zinc-800 dark:text-zinc-200 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Registrar com GitHub
        </button>
      </div>

      {/* Divisor OU */}
      <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        <span>OU</span>
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Formulário */}
      <form className="space-y-3" onSubmit={handleRegister}>
        {/* E-mail */}
        <div className="flex min-h-11 items-center rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 focus-within:border-emerald-600">
          <Mail aria-hidden className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            autoComplete="username"
            required
          />
        </div>

        {/* Senha */}
        <div className="flex min-h-11 items-center rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 focus-within:border-emerald-600">
          <KeyRound aria-hidden className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Criar senha (mín. 8 caracteres)"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        {/* Confirmar Senha */}
        <div className="flex min-h-11 items-center rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 focus-within:border-emerald-600">
          <KeyRound aria-hidden className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
          <input
            id="register-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirmar senha"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            autoComplete="new-password"
            required
          />
        </div>

        {/* Checkbox de Termos — obrigatório */}
        <label
          htmlFor="register-terms"
          className="flex items-start gap-3 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 p-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
        >
          <input
            id="register-terms"
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">
            Li e concordo com os{" "}
            <Link
              href="/termos-de-uso"
              target="_blank"
              className="font-semibold text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-500 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Termos de Uso
            </Link>{" "}
            do Sistema MCL.{" "}
            <span className="text-rose-500 font-semibold">(obrigatório)</span>
          </span>
        </label>

        {error && (
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
        )}

        <button
          type="submit"
          id="btn-cadastrar-continuar"
          disabled={isSubmitting || !terms}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : null}
          Continuar
        </button>
      </form>

      {/* Voltar para login */}
      <Link
        href="/entrar"
        id="btn-ja-tenho-acesso"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        Já possui acesso? Entrar
      </Link>

      {/* Rodapé de termos */}
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 leading-5">
        Ao se registrar, você declara que leu e concorda com os{" "}
        <Link
          href="/termos-de-uso"
          className="underline hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          Termos de Uso
        </Link>{" "}
        do Sistema MCL.
      </p>
    </div>
  );
}
