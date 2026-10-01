import localities from "./localities.json";
import omCatalog from "../../om-crests.json";

export type SemanticEntry = { value: string; canonical: string; category: "LOCALITY" | "OM" | "ACRONYM" | "PI" | "UASG" | "UNIT" | "IDENTIFIER"; provenance: string };
const acronyms = "MCL CMO CCOL OM OMDS UG UGS UASG PI PIS MEM QDMP PEEX SISCOFIS PRDU IRDU PCA PNCP CATMAT CATSER DFD SAG RPN RP ARP SISFRON EB PASA B MNT BSUP BI BIM BIA AAAE RM C MEC INF MTZ LOG GLO I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX".split(" ");
// Only words whose grammatical use is known are lowered. Ambiguous words keep
// source spelling, rather than guessing whether a person/institution is a noun.
const common = new Set("a as o os de da das do dos em no na nos nas para por e ou com sem ao aos à às até que desta deste forma sempre execução orçamentária orçamentário situação recursos recebidos recebimento total totais classe classes suprimento materiais material saúde operacional transporte transportes missão missões previsto prevista realizadas realizado realizada real destinado destinados distribuição distribuído disponível disponíveis quantidade quantidades itens item recebido recebida valor valores crédito créditos empenhado empenhados exercício anterior atual atualização movimentos logística logístico logística planejamento balanço capacidade capacete capacetes balístico balísticos balística balísticas equipamentos equipamento fluvial rodoviário viatura viaturas observações descrição descrições programação período despesas receita custeio investimento investimentos empenhos processados liquidados pagos resumo resumos financiamento financeiro financeiros unidades unidade tabela gráfico gráficos documentais levantamento referência informações objetivo comparativo instrução relatório efetivo militares manutenção permanente mobilização manutenção operacionalidade suprimentos movimentação apoio sistemas sistema dados proteção individual título corrigido não poder escrever assim".split(" "));
const key = (text: string) => text.normalize("NFC").toLocaleLowerCase("pt-BR");
type Trie = { entry?: SemanticEntry; children: Map<string, Trie> };
function trie(entries: SemanticEntry[]) {
  const root: Trie = { children: new Map() };
  for (const entry of entries) {
    const words = entry.value.match(/[\p{L}\p{N}]+(?:[ºª])?/gu) ?? [];
    if (!words.length || words.length === 1 && common.has(key(words[0]))) continue;
    let node = root;
    for (const word of words) {
      const next = node.children.get(key(word)) ?? { children: new Map<string, Trie>() };
      node.children.set(key(word), next); node = next;
    }
    node.entry = entry;
  }
  return root;
}
const builtin = trie([
  ...localities.names.map(value => ({ value, canonical: value, category: "LOCALITY" as const, provenance: localities.source })),
  ...omCatalog.units.flatMap(unit => [unit.name, unit.acronym, ...unit.aliases].map(value => ({ value, canonical: value === unit.name ? unit.name : unit.acronym.toLocaleUpperCase("pt-BR"), category: "OM" as const, provenance: "MCL OM catalog: " + unit.id }))),
  ...acronyms.map(value => ({ value, canonical: value, category: "ACRONYM" as const, provenance: "MCL institutional vocabulary" })),
]);

/** Catalog matches have provenance. Unknown spelling is preserved, never an
 * instruction to add a filename/monitor-specific capitalization exception. */
export function normalizeSemanticTitle(value: string, catalog: SemanticEntry[] = []) {
  const clean = value.normalize("NFC").replace(/[–—]/g, ":").replace(/(?<=\p{L})-(?=\p{L})/gu, " ").replace(/\s+/g, " ").trim();
  const words = [...clean.matchAll(/[\p{L}\p{N}]+(?:[ºª])?/gu)];
  const catalogs = catalog.length ? [trie(catalog), builtin] : [builtin];
  const protectedTokens: Array<{ source: string; normalized: string; category: string; provenance: string }> = [];
  let result = "", cursor = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i], start = word.index!;
    result += clean.slice(cursor, start);
    let best: { end: number; entry: SemanticEntry } | undefined;
    for (const root of catalogs) {
      let node: Trie | undefined = root;
      for (let j = i; j < words.length; j++) {
        if (j > i && !/^[\s'-]*$/.test(clean.slice(words[j - 1].index! + words[j - 1][0].length, words[j].index!))) break;
        node = node?.children.get(key(words[j][0])); if (!node) break;
        if (node.entry && (!best || j > best.end)) best = { end: j, entry: node.entry };
      }
    }
    if (best) {
      const end = words[best.end].index! + words[best.end][0].length;
      protectedTokens.push({ source: clean.slice(start, end), normalized: best.entry.canonical, category: best.entry.category, provenance: best.entry.provenance });
      result += best.entry.canonical; cursor = end; i = best.end; continue;
    }
    const original = word[0];
    const lower = key(original);
    const identifier = /\d/u.test(original);
    let normalized = common.has(lower) ? lower : original;
    if (i === 0) normalized = normalized.charAt(0).toLocaleUpperCase("pt-BR") + normalized.slice(1);
    if (identifier) { normalized = original; protectedTokens.push({ source: original, normalized, category: "IDENTIFIER", provenance: "lexical identifier" }); }
    result += normalized; cursor = start + original.length;
  }
  return { text: result + clean.slice(cursor), protectedTokens };
}
