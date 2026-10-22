import {beforeEach,describe,expect,it,vi} from "vitest";
import {createTgEvidenceTools} from "@/modules/ai/tg-tools";
import {getLatestTg} from "@/modules/credits-tg/repository";
vi.mock("ai",()=>({tool:<T>(definition:T)=>definition}));
vi.mock("@/modules/credits-tg/repository",()=>({getLatestTg:vi.fn()}));
vi.mock("@/server/db",()=>({prisma:{organization:{findUnique:vi.fn().mockResolvedValue({uasg:"160136"})}}}));
vi.mock("@/modules/ai/silos",()=>({queryTgNcComposition:vi.fn()}));
const actor={id:"user",organizationId:"org-authorized",roles:["LOGISTICS_MANAGER" as const]};
// SDK exposes optional execute; test the runtime contract without coupling to SDK generics.
type Executable={execute:(input:unknown)=>Promise<unknown>};
const execute=(value:unknown,input:unknown)=>(value as Executable).execute(input);
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("DATABASE_URL","postgresql://test");vi.mocked(getLatestTg).mockResolvedValue({fileName:"TG.xlsx",rows:[],importedAt:new Date().toISOString()} as never);});
describe("escopo das ferramentas TG",()=>{
  it("compartilha uma única leitura e prende a consulta à organização autenticada",async()=>{
    const tools=createTgEvidenceTools(actor);
    await execute(tools.explorarFonteTg,{operation:"schema"});
    await execute(tools.consultarPrazosNc,{status:"TODAY"});
    expect(getLatestTg).toHaveBeenCalledTimes(1);
    expect(getLatestTg).toHaveBeenCalledWith("org-authorized");
  });
  it("não lê TG sem organização e declara indisponibilidade",async()=>{
    const tools=createTgEvidenceTools({...actor,organizationId:undefined});
    expect(await execute(tools.consultarPrazosNc,{status:"ALL"})).toMatchObject({status:"UNAVAILABLE",dataNature:"NONE"});
    expect(getLatestTg).not.toHaveBeenCalled();
  });
});
