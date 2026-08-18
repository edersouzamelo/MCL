export function TechnicalFooter() {
  return (
    <footer className="mcl-technical-footer">
      <div className="flex gap-4 font-semibold uppercase tracking-widest text-[10px]">
        <a href="https://zenodo.org/records/21113715" target="_blank" rel="noopener noreferrer">
          Zenodo Project
        </a>
        <span>&bull;</span>
        <a 
          href="https://github.com/edersouzamelo/MCL" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Código Aberto (GitHub)
        </a>
        <span>&bull;</span>
        <a 
          href="/termos-de-uso" 
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
