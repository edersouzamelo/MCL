import Link from "next/link";

export function TechnicalFooter() {
  return (
    <footer className="mt-12 mb-4 w-full border-t border-zinc-200 dark:border-zinc-800 bg-transparent pt-6 pb-2 text-center text-xs text-zinc-500 dark:text-zinc-500 flex flex-col items-center justify-center gap-2">
      <div className="flex gap-4 font-semibold uppercase tracking-widest text-[10px]">
        <a 
          href="https://zenodo.org/records/11135715" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          Guia do Modelo
        </a>
        <span>&bull;</span>
        <a 
          href="https://zenodo.org/records/11135715" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          Termos e Políticas
        </a>
      </div>
      <p className="max-w-md px-4 mt-2">
        MCL - Modelo de Continuidade Logística. 
        <br />
        Este é um ambiente demonstrativo construído com dados sintéticos.
      </p>
    </footer>
  );
}
