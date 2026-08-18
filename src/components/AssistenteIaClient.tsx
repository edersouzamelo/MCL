"use client";

import { useState, useRef, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Sparkles,
  Search,
  Send,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
  ChevronDown,
  Layers,
  Info,
  X,
  Plus,
  Menu,
  FileText,
  ShieldCheck,
  Database,
} from "lucide-react";
import type { RagResponse } from "@/modules/ai/rag-engine";

interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  response?: RagResponse;
  timestamp: string;
}

interface ChatHistoryEntry {
  id: string;
  title: string;
  query: string;
  category: "HOJE" | "ÚLTIMOS 7 DIAS";
}

const PRESET_CONVERSATIONS: ChatHistoryEntry[] = [
  {
    id: "coturnos",
    title: "Déficit de coturnos",
    query: "Qual o déficit e situação do Coturno Operacional no 9º Gpt Log?",
    category: "HOJE",
  },
  {
    id: "orcamento",
    title: "Síntese da execução financeira",
    query: "Resuma a execução orçamentária por unidade.",
    category: "HOJE",
  },
  {
    id: "catmat",
    title: "Atas vigentes por CATMAT",
    query: "Quais são as Atas vigentes por CATMAT no Compras.gov.br?",
    category: "ÚLTIMOS 7 DIAS",
  },
  {
    id: "divergencias",
    title: "Divergências abertas",
    query: "Quais divergências de recebimento físico ou fiscal estão abertas?",
    category: "ÚLTIMOS 7 DIAS",
  },
  {
    id: "minuta",
    title: "Minuta de cobertura",
    query: "Gere uma minuta com fontes e justificativa para instruir o processo no SEI.",
    category: "ÚLTIMOS 7 DIAS",
  },
];

const QUICK_CARDS = [
  {
    title: "Analisar cobertura",
    desc: "Qual necessidade crítica devo priorizar hoje?",
    query: "Qual necessidade crítica devo priorizar hoje?",
  },
  {
    title: "Explorar o orçamento",
    desc: "Resuma a execução orçamentária por unidade.",
    query: "Resuma a execução orçamentária por unidade.",
  },
  {
    title: "Consultar normas",
    desc: "O que a Lei 14.133 exige para este vínculo?",
    query: "O que a Lei 14.133 exige para este vínculo?",
  },
  {
    title: "Preparar documento",
    desc: "Gere uma minuta com fontes e justificativa.",
    query: "Gere uma minuta com fontes e justificativa.",
  },
];

const SCOPES = [
  "Piloto Classe II",
  "Art. 86 (Lei 14.133)",
  "CATMAT & Atas",
  "Todos os Dados",
];

interface AssistenteIaClientProps {
  userRole?: string;
  userUnit?: string;
}

export function AssistenteIaClient({
  userUnit = "9º Gpt Log",
}: AssistenteIaClientProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState(SCOPES[0]);
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modais informativos
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSearch = async (queryText?: string, chatId?: string) => {
    const q = (queryText !== undefined ? queryText : prompt).trim();
    if (!q) return;

    const userMessage: MessageItem = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);
    if (chatId) {
      setActiveChatId(chatId);
    }

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q, scope: selectedScope }),
      });
      const data: RagResponse = await res.json();

      const assistantMessage: MessageItem = {
        id: "ast-" + Date.now(),
        sender: "assistant",
        text: data.answer,
        response: data,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: MessageItem = {
        id: "err-" + Date.now(),
        sender: "assistant",
        text: "Ocorreu um erro ao comunicar com a inteligência logística. Por favor, tente novamente.",
        response: {
          answer: "Ocorreu um erro ao comunicar com a inteligência logística. Por favor, tente novamente.",
          citations: [],
          suggestedQuestions: ["Quais são as regras de adesão à Ata pela Lei 14.133?"],
          confidenceScore: 0,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setPrompt("");
    setSidebarOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSelectHistory = (entry: ChatHistoryEntry) => {
    setActiveChatId(entry.id);
    setMessages([]);
    handleSearch(entry.query, entry.id);
    setSidebarOpen(false);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredHistory = PRESET_CONVERSATIONS.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.query.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const historyHoje = filteredHistory.filter((item) => item.category === "HOJE");
  const history7Dias = filteredHistory.filter((item) => item.category === "ÚLTIMOS 7 DIAS");

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#edf2f7] dark:bg-zinc-950 p-2.5 sm:p-3.5 gap-3 font-sans">
      {/* OVERLAY MOBILE PARA SIDEBAR */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* 1. SIDEBAR LATERAL DO ASSISTENTE IA                       */}
      {/* ========================================================= */}
      <aside
        className={`
          fixed md:relative inset-y-2 left-2 z-50 md:z-auto
          w-72 sm:w-80 shrink-0 h-[calc(100vh-16px)] md:h-full
          flex flex-col bg-[#f4f7fa] dark:bg-zinc-900/90
          rounded-2xl border border-zinc-200/70 dark:border-zinc-800
          p-3.5 flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Topo da Sidebar: Botão Novo Chat */}
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#e3f2fd] dark:bg-sky-950/60 hover:bg-[#d4ebfc] border border-[#cbe5fb] dark:border-sky-800/60 text-[#0284c7] dark:text-sky-300 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0284c7] shrink-0" />
              <span>Novo chat</span>
            </span>
            <Plus className="h-4 w-4 text-[#0284c7] shrink-0" />
          </button>
          
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Campo de Busca de Conversas */}
        <div className="relative mb-3">
          <div className="flex items-center w-full px-3 py-1.5 rounded-lg bg-[#eef2f6] dark:bg-zinc-800/80 border border-transparent focus-within:border-sky-300 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all text-xs">
            <Search className="h-3.5 w-3.5 text-zinc-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversas"
              className="w-full bg-transparent text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none text-xs font-normal"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Histórico de Conversas com Scroll */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          {/* Seção HOJE */}
          {historyHoje.length > 0 && (
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 mb-1">
                HOJE
              </h3>
              <div className="space-y-0.5">
                {historyHoje.map((entry) => {
                  const isActive = activeChatId === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelectHistory(entry)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#e2edf6] dark:bg-zinc-800 text-zinc-800 dark:text-white font-medium"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-[#eef2f6] dark:hover:bg-zinc-800/60 font-normal"
                      }`}
                    >
                      <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#0284c7] dark:text-sky-400" : "text-zinc-400"}`} />
                      <span className="truncate">{entry.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção ÚLTIMOS 7 DIAS */}
          {history7Dias.length > 0 && (
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 mb-1">
                ÚLTIMOS 7 DIAS
              </h3>
              <div className="space-y-0.5">
                {history7Dias.map((entry) => {
                  const isActive = activeChatId === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelectHistory(entry)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#e2edf6] dark:bg-zinc-800 text-zinc-800 dark:text-white font-medium"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-[#eef2f6] dark:hover:bg-zinc-800/60 font-normal"
                      }`}
                    >
                      <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#0284c7] dark:text-sky-400" : "text-zinc-400"}`} />
                      <span className="truncate">{entry.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredHistory.length === 0 && (
            <div className="text-center py-6 text-xs text-zinc-400 font-normal">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>

        {/* Rodapé da Sidebar: Fontes Conectadas & Sobre */}
        <div className="pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 space-y-0.5 mt-auto shrink-0">
          <button
            type="button"
            onClick={() => setSourcesModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-[#eef2f6] dark:hover:bg-zinc-800/60 transition-colors text-left font-normal cursor-pointer"
          >
            <Database className="h-3.5 w-3.5 text-zinc-400" />
            <span>Fontes conectadas</span>
          </button>
          <button
            type="button"
            onClick={() => setAboutModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-[#eef2f6] dark:hover:bg-zinc-800/60 transition-colors text-left font-normal cursor-pointer"
          >
            <Info className="h-3.5 w-3.5 text-zinc-400" />
            <span>Sobre o assistente</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. ÁREA PRINCIPAL DO CHAT (FULL-SCREEN)                   */}
      {/* ========================================================= */}
      <main className="flex-1 h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-2xs relative overflow-hidden">
        {/* Barra Superior com Botão 'Retornar ao Sistema' */}
        <header className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 bg-white/90 dark:bg-zinc-900/90 z-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Abrir menu de conversas"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-normal text-zinc-400">
              <span className="hover:text-zinc-600 dark:hover:text-zinc-300">MCL</span>
              <span>/</span>
              <span className="text-[#0284c7] dark:text-sky-400 font-medium">ASSISTENTE IA</span>
            </div>
          </div>

          {/* Botão no canto superior direito: 'Retornar ao Sistema' (a tag para navegação limpa) */}
          <div className="flex items-center gap-2">
            <a
              href="/inicio"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-normal text-zinc-600 dark:text-zinc-300 bg-[#f0f4f8] dark:bg-zinc-800 hover:bg-[#e2edf6] border border-zinc-200/80 dark:border-zinc-700 transition-colors"
              title="Sair do módulo IA e voltar à tela inicial"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
              <span>Retornar ao Sistema</span>
            </a>
          </div>
        </header>

        {/* Conteúdo Central */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col justify-between">
          {/* CASO A: ESTADO INICIAL / HERO (COMO POSSO AJUDAR?) */}
          {messages.length === 0 ? (
            <div className="max-w-2xl w-full mx-auto my-auto flex flex-col items-center justify-center py-2 sm:py-4">
              {/* ÍCONE LOGO MCL EM TOM AZUL CLARO NA MESMA PALETA */}
              <div className="w-11 h-11 rounded-xl bg-[#e8f3fb] dark:bg-sky-950/60 border border-[#d0e5f7] dark:border-sky-800/60 flex items-center justify-center p-2 shadow-2xs mb-2.5">
                <BrandLogo
                  tone="sky"
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              {/* Subtítulo ASSISTENTE MCL */}
              <span className="text-[11px] font-bold tracking-wider text-[#38a3e5] uppercase block text-center mb-1">
                ASSISTENTE MCL
              </span>

              {/* Título Principal (SEM NEGITO PESADO - FONT-SEMIBOLD ELEGANTE) */}
              <h1 className="text-3xl sm:text-[34px] font-semibold text-[#1e293b] dark:text-zinc-100 tracking-tight text-center">
                Como posso ajudar?
              </h1>

              {/* Descrição em fonte leve/normal */}
              <p className="mt-1.5 text-xs sm:text-sm text-[#64748b] dark:text-zinc-400 text-center max-w-md mx-auto leading-relaxed font-normal">
                Converse com os dados da cadeia logística. As respostas preservam contexto, evidências e nível de confiança.
              </p>

              {/* Caixa de Entrada de Prompt Principal */}
              <div className="mt-6 w-full rounded-2xl border border-zinc-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs focus-within:border-sky-400 transition-all p-3.5">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Pergunte sobre necessidades, créditos, atas, rastreabilidade ou normas..."
                  rows={3}
                  className="w-full bg-transparent resize-none focus:outline-none text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 leading-relaxed font-normal"
                />

                {/* Linha Inferior da Caixa de Entrada */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                  {/* Seletor de Escopo (+ Piloto Classe II ˅) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#f0f4f8] dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-[11px] font-normal transition-colors cursor-pointer border border-zinc-200/60 dark:border-zinc-700"
                    >
                      <Plus className="h-3 w-3 text-zinc-400" />
                      <span>{selectedScope}</span>
                      <ChevronDown className="h-3 w-3 text-zinc-400" />
                    </button>

                    {isScopeMenuOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg py-1 z-30 animate-menu-in">
                        {SCOPES.map((scope) => (
                          <button
                            key={scope}
                            type="button"
                            onClick={() => {
                              setSelectedScope(scope);
                              setIsScopeMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                              selectedScope === scope
                                ? "bg-sky-50 dark:bg-sky-950 text-[#0284c7] font-medium"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 font-normal"
                            }`}
                          >
                            {scope}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botão de Envio Circular */}
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={loading || !prompt.trim()}
                    className="w-8 h-8 rounded-full bg-[#80caee] hover:bg-[#64bfea] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                    title="Enviar pergunta"
                  >
                    {loading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Grade 2x2 de Cartões de Sugestão Rápida */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {QUICK_CARDS.map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => handleSearch(card.query)}
                    className="group p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-sky-300 transition-colors text-left flex justify-between items-start cursor-pointer shadow-2xs"
                  >
                    <div className="space-y-0.5 pr-2">
                      <h4 className="text-xs font-semibold text-[#1e293b] dark:text-zinc-200 group-hover:text-[#0284c7] transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-[11px] font-normal text-[#64748b] dark:text-zinc-400 leading-snug">
                        {card.desc}
                      </p>
                    </div>
                    <Send className="h-3.5 w-3.5 text-[#38a3e5] shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* CASO B: THREAD DE MENSAGENS ATIVA */
            <div className="max-w-3xl w-full mx-auto space-y-5 pb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {msg.sender === "user" ? (
                    /* Balão do Usuário */
                    <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#0284c7] text-white p-3.5 text-xs sm:text-sm font-normal shadow-2xs leading-relaxed">
                      {msg.text}
                      <div className="text-[10px] text-sky-100 text-right mt-1 font-mono">
                        {msg.timestamp}
                      </div>
                    </div>
                  ) : (
                    /* Cartão de Resposta do Assistente RAG */
                    <div className="w-full rounded-2xl bg-[#f8fafc] dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/80 p-4 sm:p-5 space-y-4 shadow-2xs">
                      {/* Cabeçalho da Resposta com Confiança & Ações */}
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-200/70 dark:border-zinc-700/70">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#e8f3fb] dark:bg-sky-950/60 border border-[#d0e5f7] flex items-center justify-center p-1">
                            <BrandLogo tone="sky" className="h-full w-full object-contain" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-[#1e293b] dark:text-zinc-100 block">
                              Inteligência Logística MCL
                            </span>
                            {msg.response && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                                Confiança RAG: {Math.round(msg.response.confidenceScore * 100)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões Copiar e Timestamp */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-normal text-zinc-600 dark:text-zinc-400 hover:text-[#0284c7] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Conteúdo Textual Formatado */}
                      <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-normal">
                        {msg.text}
                      </div>

                      {/* Citações e Fontes Legais */}
                      {msg.response && msg.response.citations.length > 0 && (
                        <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-700/70 space-y-2">
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-[#38a3e5]" />
                            Fontes & Citações da Resposta:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.response.citations.map((cit) => (
                              <span
                                key={cit.title}
                                className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-zinc-900 px-2.5 py-1 text-[11px] font-normal text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-2xs"
                              >
                                <span className="font-medium">{cit.title}</span>
                                <span className="text-zinc-400">({cit.source})</span>
                                {cit.url && (
                                  <a
                                    href={cit.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#0284c7] hover:underline ml-0.5"
                                  >
                                    <ExternalLink className="h-3 w-3 inline" />
                                  </a>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Perguntas Sugeridas de Acompanhamento */}
                      {msg.response && msg.response.suggestedQuestions.length > 0 && (
                        <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-700/70 space-y-1.5">
                          <span className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                            <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                            Perguntas Relacionadas:
                          </span>
                          <div className="space-y-1">
                            {msg.response.suggestedQuestions.map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => handleSearch(q)}
                                className="block text-left text-[11px] font-normal text-[#0284c7] hover:underline cursor-pointer"
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
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 p-2 animate-pulse font-normal">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#38a3e5]" />
                  <span>Consultando fontes logísticas e legislação...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BARRA FIXA INFERIOR DE PROMPT (QUANDO EM CONVERSA ATIVA) */}
        {messages.length > 0 && (
          <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
            <div className="max-w-3xl mx-auto flex items-center gap-2 rounded-xl bg-[#f0f4f8] dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 focus-within:border-sky-400 focus-within:bg-white transition-colors">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Faça uma pergunta complementar ou continue o diálogo..."
                className="w-full bg-transparent text-xs sm:text-sm text-zinc-700 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-normal px-1"
              />
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={loading || !prompt.trim()}
                className="p-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 3. MODAIS INFORMATIVOS (FONTES & SOBRE O ASSISTENTE)        */}
      {/* ========================================================= */}

      {/* Modal: Fontes Conectadas */}
      {sourcesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-menu-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-[#0284c7]" />
                <h3 className="text-base font-semibold text-[#1e293b] dark:text-zinc-100">
                  Fontes de Dados Conectadas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSourcesModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              O motor de IA consulta em tempo real bases oficiais, ontologias e repositórios parametrizados:
            </p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-[#1e293b] dark:text-zinc-200">
                    Legislação Federal & Lei 14.133/2021
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-normal">
                    Art. 86, limites de carona (50% individual e 200% global) e Decreto nº 11.462/2023.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-start gap-3">
                <Database className="h-4 w-4 text-[#0284c7] mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-[#1e293b] dark:text-zinc-200">
                    Compras.gov.br (API Oficial de ARPs)
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-normal">
                    Atas de Registro de Preços vigentes, saldos de adesão, fornecedores e atas homologadas.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-start gap-3">
                <FileText className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-[#1e293b] dark:text-zinc-200">
                    Catálogo Unificado CATMAT
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-normal">
                    Indexação de códigos de materiais com descritores oficiais padronizados.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-start gap-3">
                <Layers className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-[#1e293b] dark:text-zinc-200">
                    Base Operacional {userUnit} (Demonstrativo)
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-normal">
                    Déficits de suprimento Classe II, histórico de demandas e níveis de estoque.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSourcesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sobre o Assistente */}
      {aboutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-menu-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-[#0284c7]" />
                <h3 className="text-base font-semibold text-[#1e293b] dark:text-zinc-100">
                  Sobre o Assistente IA MCL
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAboutModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
              O <strong>Assistente IA MCL</strong> é uma camada de inteligência cognitiva voltada para a gestão de suprimentos e compras públicas federais.
            </p>

            <div className="p-3.5 rounded-xl bg-[#f0f4f8] dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-zinc-700 dark:text-sky-200 space-y-1.5">
              <div className="font-semibold text-[#0284c7] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Arquitetura RAG Determinística
              </div>
              <p className="text-[11px] leading-relaxed font-normal text-zinc-600">
                As respostas são geradas com fundamentação normativa estrita, sem alucinações de dados orçamentários e com indicação explícita dos níveis de confiança e das fontes consultadas.
              </p>
            </div>

            <div className="text-[11px] text-zinc-500 font-normal space-y-1">
              <div>• <strong>Versão do Motor:</strong> MCL RAG Engine v0.9 (Piloto Classe II)</div>
              <div>• <strong>Governança:</strong> Em conformidade com as diretrizes do Exército Brasileiro e Compras.gov.br</div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setAboutModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

