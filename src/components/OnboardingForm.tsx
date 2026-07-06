"use client";

import React, { useState, useEffect } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { useFormStatus } from "react-dom";

const FUNCOES_RAE = [
  "Ordenador de Despesas (OD) / Agente Diretor",
  "Fiscal Administrativo (Fisc Adm)",
  "Encarregado do Setor de Material",
  "Encarregado do Setor de Finanças",
  "Encarregado do Setor de Aprovisionamento",
  "Almoxarife",
  "Tesoureiro",
  "Gestor de Contratos",
  "Furriel / Auxiliar",
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
    >
      {pending ? "Salvando..." : "Salvar e Continuar"}
    </button>
  );
}

export default function OnboardingForm({ initialName }: { initialName: string }) {
  const [oms, setOms] = useState<{ id: string; name: string }[]>([]);
  const [omSearch, setOmSearch] = useState("");
  const [showOmDropdown, setShowOmDropdown] = useState(false);
  const [selectedOm, setSelectedOm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    fetch("/api/oms")
      .then((res) => res.json())
      .then((data) => setOms(data))
      .catch((err) => console.error("Failed to load OMs", err));
  }, []);

  const filteredOms = oms.filter((om) =>
    om.name.toLowerCase().includes(omSearch.toLowerCase())
  );

  return (
    <form action={completeOnboarding} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nome Completo
        </label>
        <div className="mt-1">
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initialName}
            disabled
            className="appearance-none block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-sm bg-zinc-100 dark:bg-zinc-950/20 text-zinc-400 dark:text-zinc-500 sm:text-sm"
          />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">O nome é puxado automaticamente do seu provedor de login.</p>
        </div>
      </div>

      <div>
        <label htmlFor="rank" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Posto / Graduação
        </label>
        <div className="mt-1">
          <input
            id="rank"
            name="rank"
            type="text"
            required
            placeholder="Ex: Cel, Maj, Cap, 1º Ten, 1º Sgt"
            className="appearance-none block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950/40"
          />
        </div>
      </div>

      <div>
        <label htmlFor="militaryRole" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Função (RAE)
        </label>
        <div className="mt-1">
          <select
            id="militaryRole"
            name="militaryRole"
            required
            className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950/40"
          >
            <option value="" className="bg-white dark:bg-zinc-950">Selecione uma função...</option>
            {FUNCOES_RAE.map((funcao) => (
              <option key={funcao} value={funcao} className="bg-white dark:bg-zinc-950">
                {funcao}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative">
        <label htmlFor="militaryOrganization" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Organização Militar (OM)
        </label>
        <div className="mt-1 relative">
          <input
            type="text"
            placeholder="Digite para buscar sua OM..."
            value={omSearch}
            onChange={(e) => {
              setOmSearch(e.target.value);
              setShowOmDropdown(true);
              setSelectedOm("");
            }}
            onFocus={() => setShowOmDropdown(true)}
            className="appearance-none block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950/40"
          />
          <input type="hidden" name="militaryOrganization" value={selectedOm} required />
          
          {showOmDropdown && omSearch && (
            <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-zinc-950 shadow-2xl max-h-60 rounded-lg py-1 border border-zinc-200 dark:border-zinc-800 overflow-auto focus:outline-none sm:text-sm custom-scrollbar">
              {filteredOms.length === 0 ? (
                <div className="px-4 py-2 text-zinc-500">Nenhuma OM encontrada</div>
              ) : (
                filteredOms.map((om) => (
                  <div
                    key={om.id}
                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-emerald-600/20 hover:text-emerald-400 text-zinc-850 dark:text-zinc-200 transition-colors"
                    onClick={() => {
                      setSelectedOm(om.name);
                      setOmSearch(om.name);
                      setShowOmDropdown(false);
                    }}
                  >
                    {om.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Endereço
        </label>
        <div className="mt-1">
          <input
            id="address"
            name="address"
            type="text"
            required
            className="appearance-none block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Telefone
          </label>
          <div className="mt-1">
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className="appearance-none block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950/40"
            />
          </div>
        </div>
        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            WhatsApp
          </label>
          <div className="mt-1">
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              required
              className="appearance-none block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950/40"
            />
          </div>
        </div>
      </div>

      <div className="flex items-start mt-6">
        <div className="flex items-center h-5">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-zinc-300 dark:border-zinc-700 rounded dark:bg-zinc-950"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="terms" className="font-medium text-zinc-700 dark:text-zinc-300">
            Li e concordo com os <a href="/termos-de-uso" target="_blank" className="text-emerald-500 hover:text-emerald-400 underline transition-colors">Termos de Uso</a>.
          </label>
        </div>
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
