import React from "react";
import { 
  Mic, 
  Settings2, 
  Volume2, 
  Clock, 
  Globe2, 
  Sparkles 
} from "lucide-react";
import { HostConfig, GenerationLength } from "../types";

interface HostConfiguratorProps {
  host1: HostConfig;
  host2: HostConfig;
  tone: string;
  length: GenerationLength;
  language: string;
  onUpdateHost1: (config: Partial<HostConfig>) => void;
  onUpdateHost2: (config: Partial<HostConfig>) => void;
  onUpdateTone: (tone: string) => void;
  onUpdateLength: (length: GenerationLength) => void;
  onUpdateLanguage: (lang: string) => void;
}

const AVAILABLE_VOICES = [
  { value: "Kore", label: "Kore", desc: "Feminina clara, calma e profissional" },
  { value: "Zephyr", label: "Zephyr", desc: "Feminina calorosa, suave e acolhedora" },
  { value: "Puck", label: "Puck", desc: "Masculina jovem, amigável e dinâmica" },
  { value: "Fenrir", label: "Fenrir", desc: "Masculina forte, moderna e articulada" },
  { value: "Charon", label: "Charon", desc: "Masculina madura, profunda e sábia" },
];

const TONE_PRESETS = [
  { value: "Descontraído e Bem-humorado", label: "Descontraído e Bem-humorado" },
  { value: "Altamente Profissional e Analítico", label: "Profissional e Analítico" },
  { value: "Curioso e Didático (Explicação simples)", label: "Didático e Explicativo" },
  { value: "Foco em Concursos Públicos (Didático e Memorização - StratisPlanner)", label: "StratisPlanner (Concursos)" },
  { value: "Investigativo, Dramático e Dinâmico", label: "Investigativo e Dramático" },
];

export default function HostConfigurator({
  host1,
  host2,
  tone,
  length,
  language,
  onUpdateHost1,
  onUpdateHost2,
  onUpdateTone,
  onUpdateLength,
  onUpdateLanguage,
}: HostConfiguratorProps) {
  return (
    <div id="host-configurator" className="space-y-6 p-1">
      <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
        <div className="p-1.5 bg-gray-50 rounded-lg text-gray-800">
          <Settings2 size={16} />
        </div>
        <div>
          <h2 id="configurator-title" className="text-sm font-bold text-gray-900">Configurações do Podcast</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Customize os apresentadores e a produção do áudio</p>
        </div>
      </div>

      {/* Host 1 (Primary) */}
      <div id="host1-settings" className="space-y-3.5 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
            1
          </div>
          <span className="text-xs font-bold text-gray-800">Apresentador Principal</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label id="lbl-host1-name" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Nome
            </label>
            <input
              id="host1-name"
              type="text"
              value={host1.name}
              onChange={(e) => onUpdateHost1({ name: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div>
            <label id="lbl-host1-voice" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Perfil da Voz (TTS)
            </label>
            <select
              id="host1-voice"
              value={host1.voice}
              onChange={(e) => onUpdateHost1({ voice: e.target.value as any })}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              {AVAILABLE_VOICES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label} ({v.value === "Kore" || v.value === "Zephyr" ? "Fem" : "Masc"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label id="lbl-host1-desc" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Volume2 size={10} /> Personalidade e Tom de Fala
          </label>
          <input
            id="host1-desc"
            type="text"
            placeholder="Ex: Entusiasmado, curioso, gosta de piadas breves"
            value={host1.toneDescription}
            onChange={(e) => onUpdateHost1({ toneDescription: e.target.value })}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Host 2 (Co-host) */}
      <div id="host2-settings" className="space-y-3.5 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-[10px] font-bold text-white">
            2
          </div>
          <span className="text-xs font-bold text-gray-800">Co-Apresentador</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label id="lbl-host2-name" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Nome
            </label>
            <input
              id="host2-name"
              type="text"
              value={host2.name}
              onChange={(e) => onUpdateHost2({ name: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div>
            <label id="lbl-host2-voice" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Perfil da Voz (TTS)
            </label>
            <select
              id="host2-voice"
              value={host2.voice}
              onChange={(e) => onUpdateHost2({ voice: e.target.value as any })}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              {AVAILABLE_VOICES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label} ({v.value === "Kore" || v.value === "Zephyr" ? "Fem" : "Masc"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label id="lbl-host2-desc" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Volume2 size={10} /> Personalidade e Tom de Fala
          </label>
          <input
            id="host2-desc"
            type="text"
            placeholder="Ex: Cético e questionador, foca em analogias práticas"
            value={host2.toneDescription}
            onChange={(e) => onUpdateHost2({ toneDescription: e.target.value })}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Global Show parameters */}
      <div id="global-show-params" className="space-y-4 pt-2 border-t border-gray-50">
        {/* Tone Preset */}
        <div>
          <label id="lbl-podcast-tone" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles size={10} /> Tom Geral do Episódio
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TONE_PRESETS.map((t) => (
              <button
                id={`btn-tone-${t.value.replace(/\s+/g, "-")}`}
                key={t.value}
                type="button"
                onClick={() => onUpdateTone(t.value)}
                className={`p-2.5 rounded-lg border text-[11px] font-medium text-left leading-tight transition-all cursor-pointer ${
                  tone === t.value
                    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic length & Language Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label id="lbl-podcast-length" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Clock size={10} /> Duração (Roteiro)
            </label>
            <select
              id="podcast-length"
              value={length}
              onChange={(e) => onUpdateLength(e.target.value as GenerationLength)}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="short">Curto (6-8 falas)</option>
              <option value="medium">Médio (10-14 falas)</option>
              <option value="long">Longo (16-22 falas)</option>
              <option value="10_mins">10 Minutos (35-45 falas)</option>
            </select>
          </div>

          <div>
            <label id="lbl-podcast-lang" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Globe2 size={10} /> Idioma do Diálogo
            </label>
            <select
              id="podcast-lang"
              value={language}
              onChange={(e) => onUpdateLanguage(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="Português">Português 🇧🇷</option>
              <option value="English">English 🇺🇸</option>
              <option value="Español">Español 🇪🇸</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
