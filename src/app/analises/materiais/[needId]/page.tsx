import { redirect } from "next/navigation";

export default async function MaterialAnalysisRedirectPage({ params }: { params: Promise<{ needId: string }> }) {
  const { needId } = await params;
  redirect(`/necessidades/${needId}/buscar-cobertura`);
}
