"use client";

import { useState } from "react";
import {
  BookOpen,
  Bot,
  Check,
  Copy,
  Database,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { RagResponse } from "@/modules/ai/rag-engine";

const quickPrompts = [
  { title: "Analisar cobertura", text: "Qual necessidade crítica devo priorizar hoje?", query: "Qual necessidade crítica devo priorizar hoje?" },
  { title: "Explorar o orçamento", text: "Resuma a execução orçamentária por unidade.", query: "Resuma a execução orçamentária por unidade." },
  { title: "Consultar normas", text: "O que a Lei 14.133 exige para este vínculo?", query: "Quais são as regras e limites de carona no Art. 86 da Lei 14.133?" },
  { title: "Preparar documento", text: "Gere uma minuta com fontes e justificativa.", query: "Como gerar e baixar a Minuta de Adesão para instruir o processo no SEI?" },
];

const recentChats = [
  "Déficit de coturnos",
  "Síntese da execução financeira",
  "Atas vigentes por CATMAT",
  "Divergências abertas",
  "Minuta de cobertura",
];

export function AssistenteIaClient() {
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RagResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const startNewChat = () => {
    setPrompt("");
    setSubmittedPrompt("");
    setResponse(null);
  };

  const handleSearch = async (queryText?: string) => {
    const query = (queryText ?? prompt).trim();
    if (!query || loading) return;

    setLoading(true);
    setSubmittedPrompt(query);
    setPrompt("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
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
    <div className="mcl-assistant-layout">
      <aside className="mcl-assistant-rail">
        <button type="button" className="mcl-new-chat" onClick={startNewChat}>
          <Sparkles aria-hidden />
          <span>Novo chat</span>
          <Plus aria-hidden />
        </button>

        <div className="mcl-chat-search">
          <Search aria-hidden />
          <span>Buscar conversas</span>
        </div>

        <nav aria-label="Histórico de conversas">
          <span>Hoje</span>
          {recentChats.slice(0, 2).map((chat, index) => (
            <button type="button" key={chat} className={index === 0 ? "active" : ""}>
              <MessageSquare aria-hidden />
              {chat}
            </button>
          ))}
          <span>Últimos 7 dias</span>
          {recentChats.slice(2).map((chat) => (
            <button type="button" key={chat}>
              <MessageSquare aria-hidden />
              {chat}
            </button>
          ))}
        </nav>

        <footer>
          <button type="button"><Database aria-hidden /> Fontes conectadas</button>
          <button type="button"><ShieldCheck aria-hidden /> Sobre o assistente</button>
          <small>Respostas com origem e confiança</small>
        </footer>
      </aside>

      <section className="mcl-assistant-main">
        {!response && !loading ? (
          <div className="mcl-assistant-intro">
            <span className="mcl-assistant-mark"><Bot aria-hidden /></span>
            <span>ASSISTENTE MCL</span>
            <h1>Como posso ajudar?</h1>
            <p>Converse com os dados da cadeia logística. As respostas preservam contexto, evidências e nível de confiança.</p>
          </div>
        ) : null}

        {submittedPrompt ? (
          <div className="mcl-conversation" aria-live="polite">
            <article className="mcl-user-message"><p>{submittedPrompt}</p></article>
            {loading ? (
              <article className="mcl-assistant-message loading">
                <span><RefreshCw aria-hidden /></span>
                <p>Consultando fontes e preservando o contexto…</p>
              </article>
            ) : response ? (
              <article className="mcl-assistant-message">
                <header>
                  <span><Sparkles aria-hidden /></span>
                  <div>
                    <strong>Inteligência logística</strong>
                    <small>Confiança RAG · {Math.round(response.confidenceScore * 100)}%</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(response.answer);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </header>
                <div className="mcl-answer">{response.answer}</div>

                {response.citations.length > 0 ? (
                  <section className="mcl-answer-sources">
                    <strong><BookOpen aria-hidden /> Fontes e citações</strong>
                    <div>
                      {response.citations.map((citation) => (
                        <span key={citation.title}>
                          {citation.title} <small>{citation.source}</small>
                          {citation.url ? <a href={citation.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${citation.title}`}><ExternalLink aria-hidden /></a> : null}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                {response.suggestedQuestions.length > 0 ? (
                  <section className="mcl-related-questions">
                    <strong><HelpCircle aria-hidden /> Perguntas relacionadas</strong>
                    {response.suggestedQuestions.map((question) => (
                      <button type="button" key={question} onClick={() => handleSearch(question)}>{question}</button>
                    ))}
                  </section>
                ) : null}
              </article>
            ) : null}
          </div>
        ) : null}

        <form
          className="mcl-assistant-composer"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <textarea
            aria-label="Mensagem ao assistente"
            placeholder="Pergunte sobre necessidades, créditos, atas, rastreabilidade ou normas…"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSearch();
              }
            }}
          />
          <div>
            <span>
              <button type="button" aria-label="Anexar contexto"><Plus aria-hidden /></button>
              <button type="button">Piloto Classe II <b>⌄</b></button>
            </span>
            <button type="submit" className="mcl-assistant-send" aria-label="Enviar pergunta" disabled={loading || !prompt.trim()}>
              {loading ? <RefreshCw aria-hidden /> : <Send aria-hidden />}
            </button>
          </div>
        </form>

        {!response && !loading ? (
          <div className="mcl-assistant-suggestions">
            {quickPrompts.map((item) => (
              <button type="button" key={item.title} onClick={() => handleSearch(item.query)}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
                <Send aria-hidden />
              </button>
            ))}
          </div>
        ) : null}

        <small className="mcl-assistant-disclaimer">O assistente pode cometer erros. Confirme as fontes e os atos decisórios.</small>
      </section>
    </div>
  );
}
