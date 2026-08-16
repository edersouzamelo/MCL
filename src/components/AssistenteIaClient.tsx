"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Sparkles, Search, Send, BookOpen, ExternalLink, Copy, Check, RefreshCw, HelpCircle } from "lucide-react";
import type { RagResponse } from "@/modules/ai/rag-engine";

const quickPrompts = [
  { label: "📜 Regras do Art. 86 (Lei 14.133/2021)", query: "Quais são as regras e limites de carona no Art. 86 da Lei 14.133?" },
  { label: "🥾 Déficit de Coturno no 9º Gpt Log", query: "Qual o déficit e situação do Coturno Operacional no 9º Gpt Log?" },
  { label: "📊 Como funciona o Score MCL?", query: "Como funciona o cálculo do Score Multicritério Operacional do MCL?" },
  { label: "📝 Como gerar a Minuta de Adesão?", query: "Como gerar e baixar a Minuta de Adesão para instruir o processo no SEI?" },
];

export function AssistenteIaClient() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RagResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (queryText?: string) => {
    const q = queryText || prompt;
    if (!q.trim()) return;
    setLoading(true);
    setPrompt(q);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q }),
      });
      const data = await res.json();
      setResponse(data);
    } catch {
      setResponse({
        answer: "Erro ao comunicar com o assistente. Por favor, tente novamente.",
        citations: [],
        suggestedQuestions: [],
        confidenceScore: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6 sm:py-10 space-y-6 overflow-hidden">
      {/* Topo Centralizado — Logotipo MCL em Proporção Google */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-md transition-transform duration-300 hover:scale-105">
          <BrandLogo tone="light" className="h-14 sm:h-16 w-auto" priority />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
            Assistente de Inteligência Logística
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            RAG com base de conhecimento sobre a Lei nº 14.133/2021, catálogo CATMAT, Atas do Compras.gov.br e dados operacionais da Força.
          </p>
        </div>
      </div>

      {/* Campo de Prompt Centralizado Estilo Google / Gemini (Pílula Glassmorphism) */}
      <div className="relative max-w-2xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center w-full rounded-full bg-white dark:bg-zinc-900/90 border border-zinc-300 dark:border-white/15 shadow-lg hover:shadow-xl focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-300 p-1.5 pl-5"
        >
          <Search className="h-5 w-5 text-zinc-400 shrink-0 mr-3" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Pergunte sobre a Lei 14.133, necessidades, CATMAT ou atas..."
            className="w-full bg-transparent text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none pr-4 font-medium"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 shadow-md disabled:opacity-40 transition-all duration-200"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Consultar</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Sugestões Rápidas (Pills de Atalho) */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {quickPrompts.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSearch(item.query)}
              className="rounded-full bg-zinc-100 dark:bg-zinc-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-zinc-200 dark:border-zinc-700/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 px-3.5 py-1.5 transition-colors duration-200"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Área de Resposta Gerada pelo Motor RAG */}
      {response && (
        <div className="max-w-3xl mx-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 sm:p-8 space-y-6 transition-all duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">Resposta da Inteligência Logística</h3>
                <span className="text-[10px] text-zinc-500 font-mono">Confiança RAG: {Math.round(response.confidenceScore * 100)}%</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(response.answer);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1.5 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setResponse(null);
                  setPrompt("");
                }}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-2 py-1"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Conteúdo Formatado */}
          <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
            {response.answer}
          </div>

          {/* Citações e Fontes de Fundamentação */}
          {response.citations.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                Fontes & Citações da Resposta:
              </span>
              <div className="flex flex-wrap gap-2">
                {response.citations.map((cit) => (
                  <span
                    key={cit.title}
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                  >
                    <span>{cit.title}</span>
                    <span className="text-zinc-400 font-normal">({cit.source})</span>
                    {cit.url && (
                      <a href={cit.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline ml-1">
                        <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Perguntas Sugeridas de Acompanhamento */}
          {response.suggestedQuestions.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-500 flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Perguntas Relacionadas:
              </span>
              <div className="space-y-1.5">
                {response.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSearch(q)}
                    className="block text-left text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    • {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
