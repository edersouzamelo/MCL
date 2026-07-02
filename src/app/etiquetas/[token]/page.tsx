import Image from "next/image";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/DemoBanner";
import { findUnitByQrToken } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default async function LabelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const unit = findUnitByQrToken(token);
  if (!unit) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <DemoBanner />
      <main className="mx-auto max-w-lg px-6 py-10 print:p-0">
        <section className="rounded border-2 border-zinc-950 p-6 text-center print:border-black">
          <h1 className="text-xl font-semibold">MCL | Piloto Classe II</h1>
          <p className="mt-1 text-sm">Etiqueta sintetica de unidade logistica</p>
          <Image
            src={`/api/qr/${unit.qrToken}`}
            alt={`QR Code ${unit.persistentCode}`}
            width={260}
            height={260}
            className="mx-auto my-5"
            unoptimized
          />
          <p className="font-mono text-lg font-semibold">{unit.persistentCode}</p>
          <p className="mt-1 font-mono text-sm">MCL:UL:{unit.qrToken}</p>
          <p className="mt-4 text-xs">Dados sinteticos. Nao constitui sistema oficial.</p>
        </section>
      </main>
    </div>
  );
}
