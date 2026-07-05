"use client";

import { useState } from "react";
import { cleanMockData } from "@/app/actions/admin";
import { Trash2 } from "lucide-react";

export function CleanFakesButton() {
  const [loading, setLoading] = useState(false);
  
  const handleClean = async () => {
    if (!confirm("Tem certeza que deseja apagar os dados de CATMAT simulados do banco? Isso afeta todos os usuários.")) return;
    setLoading(true);
    try {
      await cleanMockData();
      alert("Dados simulados removidos com sucesso!");
    } catch (e) {
      alert("Erro ao remover: " + (e as Error).message);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleClean}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-500 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {loading ? "Removendo..." : "Limpar CATMAT Simulados"}
    </button>
  );
}
