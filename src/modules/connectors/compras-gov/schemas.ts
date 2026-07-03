import { z } from "zod";

const nullableString = z.string().nullable().optional();
const nullableNumber = z.coerce.number().nullable().optional();
const nullableBoolean = z.boolean().nullable().optional();

export const comprasGovApiResponseSchema = z
  .object({
    resultado: z.array(z.unknown()).default([]),
    totalRegistros: z.coerce.number().int().nonnegative().default(0),
    totalPaginas: z.coerce.number().int().nonnegative().default(0),
    paginasRestantes: z.coerce.number().int().nonnegative().default(0),
  })
  .passthrough();

export const comprasGovArpItemSchema = z
  .object({
    numeroAtaRegistroPreco: z.string().min(1),
    codigoUnidadeGerenciadora: z.union([z.string(), z.number()]).transform(String),
    numeroCompra: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    anoCompra: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    codigoModalidadeCompra: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    dataAssinatura: nullableString,
    dataVigenciaInicial: z.string().min(1),
    dataVigenciaFinal: z.string().min(1),
    numeroItem: z.union([z.string(), z.number()]).transform(String),
    codigoItem: z.coerce.number().int().positive(),
    descricaoItem: z.string().min(1),
    tipoItem: z.string().min(1),
    quantidadeHomologadaItem: nullableNumber,
    classificacaoFornecedor: nullableString,
    niFornecedor: nullableString,
    nomeRazaoSocialFornecedor: nullableString,
    quantidadeHomologadaVencedor: nullableNumber,
    valorUnitario: nullableNumber,
    valorTotal: nullableNumber,
    maximoAdesao: nullableNumber,
    nomeUnidadeGerenciadora: nullableString,
    nomeModalidadeCompra: nullableString,
    idCompra: nullableString,
    numeroControlePncpCompra: nullableString,
    dataHoraInclusao: nullableString,
    dataHoraAtualizacao: nullableString,
    quantidadeEmpenhada: nullableNumber,
    percentualMaiorDesconto: nullableNumber,
    situacaoSicaf: nullableString,
    dataHoraExclusao: nullableString,
    itemExcluido: nullableBoolean,
    numeroControlePncpAta: nullableString,
    codigoPdm: nullableNumber,
    nomePdm: nullableString,
  })
  .passthrough();

export const comprasGovCatalogItemSchema = z
  .object({
    codigoItem: z.coerce.number().int().positive(),
    descricaoItem: z.string().min(1),
    codigoGrupo: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    codigoClasse: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    codigoPdm: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    statusItem: z.coerce.boolean().optional(),
    dataHoraInclusao: nullableString,
    dataHoraAtualizacao: nullableString,
  })
  .passthrough();

export const comprasGovArpUnitSchema = z
  .object({
    numeroAta: z.union([z.string(), z.number()]).transform(String),
    unidadeGerenciadora: z.union([z.string(), z.number()]).transform(String),
    numeroItem: z.union([z.string(), z.number()]).transform(String),
    codigoPdm: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    descricaoItem: z.string().optional(),
    fornecedor: nullableString,
    quantidadeRegistrada: nullableNumber,
    saldoAdesoes: nullableNumber,
    saldoRemanejamentoEmpenho: nullableNumber,
    qtdLimiteAdesao: nullableNumber,
    qtdLimiteInformadoCompra: nullableNumber,
    aceitaAdesao: nullableBoolean,
    dataHoraInclusao: nullableString,
    dataHoraAtualizacao: nullableString,
    dataHoraExclusao: nullableString,
    codigoUnidade: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? undefined : String(value))),
    nomeUnidade: nullableString,
    tipoUnidade: nullableString,
  })
  .passthrough();

export type ComprasGovApiResponse = z.infer<typeof comprasGovApiResponseSchema>;
export type ComprasGovArpItem = z.infer<typeof comprasGovArpItemSchema>;
export type ComprasGovCatalogItem = z.infer<typeof comprasGovCatalogItemSchema>;
export type ComprasGovArpUnit = z.infer<typeof comprasGovArpUnitSchema>;
