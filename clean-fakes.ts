import { prisma } from "./src/server/db";

async function run() {
  console.log("Deletando fakes...");

  // Encontrar candidatos simulados
  const fakes = await prisma.catalogSearchCandidate.findMany({
    where: { sourceSystem: "MCL_SIMULADO" }
  });

  console.log(`Encontrados ${fakes.length} candidatos falsos.`);

  for (const fake of fakes) {
    // Apagar mappings associados
    await prisma.itemCatalogMapping.deleteMany({
      where: { externalItemCode: fake.externalItemCode }
    });
    
    // Apagar o candidato
    await prisma.catalogSearchCandidate.delete({
      where: { id: fake.id }
    });
  }

  // Apagar ARPs falsas
  await prisma.acquisitionInstrument.deleteMany({
    where: { sourceSystem: "MCL_SIMULADO" }
  });

  console.log("Fakes deletados com sucesso!");
}

run().catch(console.error).finally(() => process.exit(0));
