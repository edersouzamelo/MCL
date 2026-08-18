import { AppShell } from "@/components/AppShell";
import { ScannerClient } from "@/components/ScannerClient";

export default function ScannerPage() {
  return (
    <AppShell>
      <div className="scanner-page">
        <header className="scanner-page-header">
          <div>
            <span>RASTREABILIDADE / RECEBIMENTO</span>
            <h1>Scanner de unidades</h1>
            <p>Leia a etiqueta MCL pela câmera ou informe manualmente o identificador opaco da unidade logística.</p>
          </div>
          <div className="scanner-protocol">
            <span>PROTOCOLO</span>
            <strong>MCL:UL:&lt;TOKEN&gt;</strong>
          </div>
        </header>
        <ScannerClient />
      </div>
    </AppShell>
  );
}
