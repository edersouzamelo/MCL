import { prisma } from "../src/server/db";

async function main() {
  const count = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::text as count FROM catmat_items`;
  console.log("Total catmat_items in DB:", count[0]?.count);

  const coturno = await prisma.$queryRaw<any[]>`
    SELECT codigo_item, nome_pdm, nome_classe, descricao_item 
    FROM catmat_items 
    WHERE search_text ILIKE '%coturno%' OR search_text ILIKE '%calca%' OR search_text ILIKE '%bota%'
    LIMIT 10
  `;
  console.log("Coturno/Calca/Bota in DB:", coturno);
}

main().catch(console.error).finally(() => prisma.$disconnect());
