export function TechnicalFooter() {
  return (
    <footer className="mt-12 mb-4 w-full border-t border-zinc-200 dark:border-zinc-800 bg-transparent pt-6 pb-2 text-center text-xs text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 flex flex-col items-center justify-center gap-2">
      <div className="flex gap-4 font-semibold uppercase tracking-widest text-[10px]">
        <a href="https://zenodo.org/records/21113715" target="_blank" rel="noopener noreferrer" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
          Zenodo Project
        </a>
        <span>&bull;</span>
        <a 
          href="https://github.com/edersouzamelo/MCL" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          Código Aberto (GitHub)
        </a>
        <span>&bull;</span>
        <a 
          href="/termos-de-uso" 
          className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          Termos de Uso
        </a>
      </div>
      <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 max-w-2xl mx-auto">
        Protótipo de Classe II para testes de interoperabilidade, orquestração logística e 
        avaliação do Catálogo Nacional de Materiais (CATMAT).
        Este sistema é estritamente experimental e não produz efeitos jurídicos ou operacionais.
      </p>
    </footer>
  );
}
