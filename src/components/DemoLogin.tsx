"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GitPullRequest, KeyRound } from "lucide-react";

export function DemoLogin() {
  const [accessCode, setAccessCode] = useState("MCL-DEMO-2026");
  const [error, setError] = useState("");

  async function handleDemoLogin() {
    setError("");
    const result = await signIn("demo", {
      accessCode,
      redirect: false,
      callbackUrl: "/painel",
    });

    if (result?.ok) {
      window.location.href = result.url ?? "/painel";
      return;
    }

    setError("Codigo demonstrativo invalido ou modo demonstrativo desabilitado.");
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-800" htmlFor="accessCode">
        Codigo demonstrativo
      </label>
      <input
        id="accessCode"
        value={accessCode}
        onChange={(event) => setAccessCode(event.target.value)}
        className="w-full rounded border border-zinc-300 px-3 py-2"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={handleDemoLogin}
        className="inline-flex w-full items-center justify-center gap-2 rounded bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
      >
        <KeyRound aria-hidden className="h-4 w-4" />
        Entrar em modo demonstrativo
      </button>
      <button
        type="button"
        onClick={() => signIn("github", { callbackUrl: "/painel" })}
        className="inline-flex w-full items-center justify-center gap-2 rounded border border-zinc-300 px-4 py-2 font-semibold text-zinc-800 hover:bg-zinc-100"
      >
        <GitPullRequest aria-hidden className="h-4 w-4" />
        GitHub OAuth configuravel
      </button>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
