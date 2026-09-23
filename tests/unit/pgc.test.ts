import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPgcDetails, matchPgcDetails } from '@/modules/pca/pgc-client';
const scope = { cnpj: '00394452000103', uasg: '160136', year: 2026 };
const item = { id: 'a', itemNumber: 7, catalogCode: '123', pncpControlNumber: '00394452000103-0-000392/2026' };
const record = { orgao: scope.cnpj, codigoUasg: scope.uasg, anoPcaProjetoCompra: 2026, numeroItemPncp: 7, codigoItemCatalogo: '123', numeroArtefato: 2 };
afterEach(() => vi.unstubAllGlobals());
describe('PGC details', () => {
  it('links by source identity and preserves multiple demand records', () => {
    const result = matchPgcDetails([item], [record, { ...record, numeroArtefato: 3 }, record], scope);
    expect(result[0].records).toHaveLength(2);
  });
  it('rejects unrelated scope, same code on another item, and conflicting catalog', () => {
    expect(matchPgcDetails([item], [{ ...record, codigoUasg: '999999' }, { ...record, numeroItemPncp: 8 }], scope)[0].records).toEqual([]);
    expect(matchPgcDetails([item], [{ ...record, codigoItemCatalogo: '456' }], scope)[0]).toMatchObject({ records: [], conflict: true });
    expect(matchPgcDetails([item, { ...item, id: 'b' }], [record], scope).every(x => !x.records.length)).toBe(true);
  });
  it('reads all pages before returning any records', async () => {
    const mock = vi.fn().mockResolvedValueOnce(Response.json({resultado:[record],totalPaginas:2,totalRegistros:2}))
      .mockResolvedValueOnce(Response.json({resultado:[{...record,numeroItemPncp:8}],totalPaginas:2,totalRegistros:2}));
    vi.stubGlobal('fetch', mock);
    expect(await fetchPgcDetails(scope)).toHaveLength(2);
    expect(mock.mock.calls[1][0]).toContain('pagina=2');
  });
  it('fails closed on incomplete pages or wrong scope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({resultado:[],totalPaginas:1,totalRegistros:2})));
    await expect(fetchPgcDetails(scope)).rejects.toThrow('incompleta');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({resultado:[{...record,codigoUasg:'999999'}],totalPaginas:1,totalRegistros:1})));
    await expect(fetchPgcDetails(scope)).rejects.toThrow('fora da organização');
  });
});
