"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, X } from "lucide-react";

export function MessageInbox({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `mcl:notice:slide-guidance:v1:${userId}`;

  useEffect(() => {
    const sync = () => {
      try { setRead(localStorage.getItem(key) === "read"); } catch { setRead(false); }
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function enter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function markRead(value: boolean) {
    setRead(value);
    try { localStorage.setItem(key, value ? "read" : "unread"); } catch { /* Reading still works when storage is unavailable. */ }
  }

  return <div className="mcl-inbox" ref={root}
    onMouseEnter={enter}
    onMouseLeave={() => { closeTimer.current = setTimeout(() => setOpen(false), 250); }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" className="mcl-icon-button" aria-label={read ? "Mensagens: nenhum aviso não lido" : "Mensagens: 1 aviso não lido"}
      aria-expanded={open} aria-haspopup="dialog" aria-controls="mcl-inbox-panel"
      onClick={() => setOpen(value => !value)}>
      <Mail aria-hidden />{!read && <i className="mcl-inbox-dot" aria-hidden />}
    </button>
    {open && <section id="mcl-inbox-panel" role="dialog" aria-label="Mensagens do administrador" className="mcl-inbox-panel">
      <header><div><strong>Caixa de entrada</strong><small>{read ? "Tudo lido" : "1 aviso não lido"}</small></div>
        <button type="button" className="mcl-icon-button" aria-label="Fechar mensagens" onClick={() => setOpen(false)}><X aria-hidden /></button>
      </header>
      <article>
        <small>Eder Souza Melo · Aviso aos usuários</small>
        <h2>Como evitar desconfigurações dos slides no MCL</h2>
        <p>Antes de enviar seu material, consulte as orientações abaixo. Prefira slides simples, fontes legíveis e gráficos e tabelas com informações claras. Revise a prévia antes de aprovar a exibição.</p>
        <a href="/notices/slide-guidance.jpg" target="_blank" rel="noopener noreferrer" aria-label="Ampliar orientações sobre os slides">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/notices/slide-guidance.jpg" alt="Como evitar desconfigurações dos slides no MCL: doze boas práticas e checklist antes do upload" />
          <span>Ampliar imagem</span>
        </a>
      </article>
      <footer><label><input type="checkbox" checked={read} onChange={event => markRead(event.target.checked)} /> Já lido</label></footer>
    </section>}
  </div>;
}
