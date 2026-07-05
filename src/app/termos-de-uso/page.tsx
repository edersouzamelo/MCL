"use client";

import React from "react";
import { Hammer } from "lucide-react";

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Hammer className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Termos de Uso</h1>
        <p className="text-gray-600 text-lg mb-8">
          Esta página está em construção. Em breve disponibilizaremos os Termos de Uso completos do sistema.
        </p>
        <button
          onClick={() => window.history.back()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
