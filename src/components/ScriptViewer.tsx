import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Volume2, 
  Edit2, 
  Check, 
  Loader2, 
  X, 
  Sparkles,
  MessageSquare,
  VolumeX,
  AlertCircle
} from "lucide-react";
import { PodcastScriptLine, HostConfig } from "../types";
import AudioWaveform from "./AudioWaveform";

interface ScriptViewerProps {
  title: string;
  description: string;
  script: PodcastScriptLine[];
  activeLineId: string | null;
  isPlaying: boolean;
  isGeneratingScript: boolean;
  onUpdateLineText: (id: string, text: string) => void;
  onSynthesizeLine: (id: string) => void;
  onPlayLine: (id: string) => void;
  onGenerateScript: () => void;
  hasDocuments: boolean;
  host1: HostConfig;
  host2: HostConfig;
  hasTtsQuotaError?: boolean;
  ttsQuotaErrorDetail?: string;
}

export default function ScriptViewer({
  title,
  description,
  script,
  activeLineId,
  isPlaying,
  isGeneratingScript,
  onUpdateLineText,
  onSynthesizeLine,
  onPlayLine,
  onGenerateScript,
  hasDocuments,
  host1,
  host2,
  hasTtsQuotaError = false,
  ttsQuotaErrorDetail = "",
}: ScriptViewerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeLineId && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeLineId]);

  const startEditing = (line: PodcastScriptLine) => {
    setEditingId(line.id);
    setEditingText(line.text);
  };

  const saveEditing = (id: string) => {
    onUpdateLineText(id, editingText);
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  return (
    <div id="script-viewer" className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Title Header */}
      <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/20 shrink-0">
        <div className="space-y-1">
          <h2 id="episode-view-title" className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <MessageSquare size={16} className="text-gray-500" />
            Roteiro do Podcast
          </h2>
          <p className="text-xs text-gray-400">Edite o roteiro, treine as vozes e escute a reprodução</p>
        </div>
        
        <button
          id="btn-generate-podcast-script"
          type="button"
          disabled={isGeneratingScript || !hasDocuments}
          onClick={onGenerateScript}
          className="px-4 py-2 text-xs font-bold bg-gray-950 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed shadow-sm active:scale-98"
        >
          {isGeneratingScript ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Criando Diálogo...
            </>
          ) : (
            <>
              <Sparkles size={13} />
              Gerar Roteiro (Gemini)
            </>
          )}
        </button>
      </div>

      {/* Script Body or Empty states */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 bg-gray-50/10">
        {isGeneratingScript ? (
          <div id="script-loading-state" className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="p-4 bg-gray-50 rounded-full border border-gray-100 relative">
              <Sparkles className="text-gray-400 animate-pulse" size={28} />
              <div className="absolute inset-0 rounded-full border-2 border-t-gray-900 border-gray-100 animate-spin" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-sm font-bold text-gray-800">Modelando Vozes e Diálogo...</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Nossos apresentadores estão lendo seus documentos, preparando piadas inteligentes e analogias dinâmicas para debater o assunto!
              </p>
            </div>
          </div>
        ) : script.length === 0 ? (
          <div id="script-empty-state" className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="p-4 bg-gray-50 rounded-full text-gray-400 border border-gray-100">
              <MessageSquare size={26} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-sm font-bold text-gray-800">Nenhum Roteiro Gerado</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                {!hasDocuments 
                  ? "Adicione pelo menos um documento ou texto na aba esquerda para habilitar o gerador."
                  : "Seus apresentadores estão prontos! Clique em 'Gerar Roteiro' no topo para começar o episódio."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Show Notes Preview */}
            <div id="episode-meta-header" className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-1.5">
              <span className="inline-block px-2 py-0.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-wider rounded-md">
                Episódio Atual
              </span>
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
            </div>

            {hasTtsQuotaError && (
              <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-4 text-amber-900 space-y-1.5 flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-amber-850 flex items-center gap-1">
                    Limite de Requisições do Gemini TTS Excedido (Quota Limite)
                  </p>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    {ttsQuotaErrorDetail || "A cota diária ou limite de requisições do modelo de áudio neural foi atingida."}{" "}
                    Você ainda pode ler e editar todo o roteiro abaixo, exportá-lo na aba <strong>Distribuição e SEO</strong>, ou aguardar alguns minutos para que a cota da API seja reestabelecida.
                  </p>
                </div>
              </div>
            )}

            {/* Live Audio Monitoring Waveform */}
            {(() => {
              const activeLine = script.find((l) => l.id === activeLineId);
              const activeSpeaker = activeLine ? activeLine.speaker : null;
              const isHost1Active = activeSpeaker
                ? activeSpeaker.toLowerCase() === host1.name.toLowerCase() ||
                  activeSpeaker.toLowerCase().includes(host1.name.toLowerCase()) ||
                  activeSpeaker.toLowerCase() === "host 1"
                : false;
              const activeVoice = activeSpeaker ? (isHost1Active ? host1.voice : host2.voice) : null;

              return (
                <AudioWaveform
                  isPlaying={isPlaying}
                  activeLineId={activeLineId}
                  speaker={activeSpeaker}
                  voice={activeVoice}
                  isHost1={isHost1Active}
                />
              );
            })()}

            {/* Script lines list */}
            <div className="space-y-4">
              {script.map((line) => {
                const isActive = activeLineId === line.id;
                const isHost1 = line.speaker.toLowerCase() === host1.name.toLowerCase() || 
                                line.speaker.toLowerCase().includes(host1.name.toLowerCase()) ||
                                line.speaker.toLowerCase() === "host 1";
                
                const currentVoice = isHost1 ? host1.voice : host2.voice;

                return (
                  <div
                    id={`script-line-${line.id}`}
                    key={line.id}
                    ref={isActive ? activeLineRef : null}
                    className={`flex gap-3 items-start transition-all duration-300 p-4 rounded-xl border ${
                      isActive
                        ? "border-gray-900 bg-white ring-2 ring-gray-900/5 shadow-md scale-[1.01]"
                        : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    {/* Speaker indicator avatar */}
                    <div className="shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isHost1 
                          ? "bg-blue-50 text-blue-600 border border-blue-100" 
                          : "bg-violet-50 text-violet-600 border border-violet-100"
                      }`}>
                        {line.speaker[0].toUpperCase()}
                      </div>
                      <div className="text-[9px] text-gray-400 text-center font-medium mt-1 uppercase">
                        {currentVoice}
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-900">{line.speaker}</span>
                        
                        {/* Audio and synthesize actions */}
                        <div className="flex items-center gap-1.5">
                          {line.isSynthesizing ? (
                            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                              <Loader2 size={11} className="animate-spin text-gray-400" />
                              Sintetizando...
                            </span>
                          ) : line.isSynthesized ? (
                            <button
                              id={`btn-play-line-${line.id}`}
                              type="button"
                              onClick={() => onPlayLine(line.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                              title="Tocar fala"
                            >
                              <Volume2 size={13} />
                              <span className="text-[10px] font-bold">Ouvir</span>
                            </button>
                          ) : (
                            <button
                              id={`btn-synth-line-${line.id}`}
                              type="button"
                              onClick={() => onSynthesizeLine(line.id)}
                              className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                              title="Sintetizar fala individualmente"
                            >
                              <VolumeX size={13} />
                              <span className="text-[10px] font-bold">Gerar Áudio</span>
                            </button>
                          )}

                          {editingId !== line.id && (
                            <button
                              id={`btn-edit-line-${line.id}`}
                              type="button"
                              onClick={() => startEditing(line)}
                              className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all cursor-pointer"
                              title="Editar texto"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {editingId === line.id ? (
                        <div className="space-y-2 mt-1">
                          <textarea
                            id={`textarea-edit-line-${line.id}`}
                            rows={2}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 font-sans resize-none"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              id={`btn-cancel-edit-line-${line.id}`}
                              type="button"
                              onClick={cancelEditing}
                              className="px-2 py-1 text-[10px] font-bold border border-gray-200 text-gray-500 rounded hover:bg-gray-50 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              id={`btn-save-edit-line-${line.id}`}
                              type="button"
                              onClick={() => saveEditing(line.id)}
                              className="px-2 py-1 text-[10px] font-bold bg-gray-900 text-white rounded hover:bg-gray-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={10} />
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-700 leading-relaxed pr-2 whitespace-pre-wrap">
                          {line.text}
                        </p>
                      )}

                      {line.error && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-500 bg-red-50 p-1.5 rounded">
                          <AlertCircle size={11} />
                          <span>Erro de síntese: {line.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
