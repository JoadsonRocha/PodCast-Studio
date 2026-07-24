import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Volume2, 
  Edit2, 
  Check, 
  Loader2, 
  X, 
  Sparkles,
  MessageSquare,
  VolumeX,
  AlertCircle,
  Maximize2,
  Minimize2,
  Type,
  BookOpen
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
  onPlayPause?: () => void;
  onPreviousLine?: () => void;
  onNextLine?: () => void;
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
  onPlayPause,
  onPreviousLine,
  onNextLine,
}: ScriptViewerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readerFontSize, setReaderFontSize] = useState<"normal" | "lg" | "xl" | "2xl">("lg");
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const fullscreenActiveLineRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeLineId) {
      if (activeLineRef.current) {
        activeLineRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
      if (fullscreenActiveLineRef.current) {
        fullscreenActiveLineRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeLineId, isFullscreen]);

  // Keyboard listeners for fullscreen mode (ESC to close, Space to play/pause)
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.code === "Space" && onPlayPause) {
        // Prevent default space bar scrolling if user is reading
        const target = e.target as HTMLElement;
        if (target.tagName !== "TEXTAREA" && target.tagName !== "INPUT") {
          e.preventDefault();
          onPlayPause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onPlayPause]);

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

  // Font size mapping for teleprompter reader
  const getFontSizeClass = () => {
    switch (readerFontSize) {
      case "normal": return "text-sm sm:text-base leading-relaxed";
      case "lg": return "text-base sm:text-lg leading-relaxed";
      case "xl": return "text-lg sm:text-xl leading-relaxed";
      case "2xl": return "text-xl sm:text-2xl leading-loose";
      default: return "text-base sm:text-lg leading-relaxed";
    }
  };

  return (
    <div id="script-viewer" className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Title Header */}
      <div className="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/20 shrink-0 gap-2">
        <div className="space-y-1 min-w-0">
          <h2 id="episode-view-title" className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5 truncate">
            <MessageSquare size={16} className="text-gray-500 shrink-0" />
            <span>Roteiro do Podcast</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 truncate">Edite o roteiro, treine as vozes e escute a reprodução</p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {script.length > 0 && (
            <button
              id="btn-open-fullscreen-script"
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-3 py-2 text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Abrir em Tela Cheia / Teleprompter"
            >
              <Maximize2 size={13} className="text-violet-600" />
              <span className="hidden sm:inline">Tela Cheia</span>
            </button>
          )}

          <button
            id="btn-generate-podcast-script"
            type="button"
            disabled={isGeneratingScript || !hasDocuments}
            onClick={onGenerateScript}
            className="px-3.5 py-2 text-xs font-bold bg-gray-950 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed shadow-sm active:scale-98"
          >
            {isGeneratingScript ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Criando...</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>Gerar Roteiro</span>
              </>
            )}
          </button>
        </div>
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
                    Limite de Requisições de Áudio Excedido (Cota do Sistema)
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

      {/* Fullscreen Teleprompter / Reader Mode Overlay */}
      {isFullscreen && (
        <div 
          id="fullscreen-reader-overlay"
          className="fixed inset-0 z-50 bg-gray-950 text-gray-100 flex flex-col font-sans overflow-hidden animate-in fade-in duration-200 select-text"
        >
          {/* Top Bar */}
          <div className="bg-gray-900/90 border-b border-gray-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-md">
            {/* Title & Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded-xl shrink-0">
                <BookOpen size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-violet-600 text-white px-2 py-0.5 rounded">
                    Modo Leitura & Teleprompter
                  </span>
                  <span className="hidden sm:inline-block text-[11px] text-gray-400">
                    Pressione <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono text-gray-300">Espaço</kbd> para pausar/tocar ou <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono text-gray-300">ESC</kbd> para sair
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-100 truncate mt-0.5">{title || "Roteiro do Podcast"}</h3>
              </div>
            </div>

            {/* Controls Bar: Font Size & Playback */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Font Size Selector */}
              <div className="flex items-center gap-1 bg-gray-800/80 p-1 rounded-xl border border-gray-700/60">
                <Type size={14} className="text-gray-400 ml-1.5 mr-0.5" />
                {(["normal", "lg", "xl", "2xl"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setReaderFontSize(size)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      readerFontSize === size 
                        ? "bg-violet-600 text-white shadow-sm" 
                        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                    }`}
                  >
                    {size === "normal" ? "A" : size === "lg" ? "A+" : size === "xl" ? "A++" : "MAX"}
                  </button>
                ))}
              </div>

              {/* Playback Controls */}
              {onPlayPause && (
                <div className="flex items-center gap-1.5 bg-gray-800/80 px-2 py-1 rounded-xl border border-gray-700/60">
                  {onPreviousLine && (
                    <button
                      type="button"
                      onClick={onPreviousLine}
                      className="p-1.5 text-gray-300 hover:text-white transition-colors cursor-pointer"
                      title="Fala Anterior"
                    >
                      <SkipBack size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onPlayPause}
                    className="p-1.5 bg-white text-gray-900 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold flex items-center justify-center"
                    title={isPlaying ? "Pausar" : "Tocar"}
                  >
                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
                  </button>
                  {onNextLine && (
                    <button
                      type="button"
                      onClick={onNextLine}
                      className="p-1.5 text-gray-300 hover:text-white transition-colors cursor-pointer"
                      title="Próxima Fala"
                    >
                      <SkipForward size={15} />
                    </button>
                  )}
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                title="Sair da Tela Cheia (ESC)"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </div>

          {/* Reader Content Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 space-y-6 max-w-4xl mx-auto w-full scroll-smooth">
            {script.map((line) => {
              const isActive = activeLineId === line.id;
              const isHost1 = line.speaker.toLowerCase() === host1.name.toLowerCase() || 
                              line.speaker.toLowerCase().includes(host1.name.toLowerCase()) ||
                              line.speaker.toLowerCase() === "host 1";
              
              const currentVoice = isHost1 ? host1.voice : host2.voice;

              return (
                <div
                  key={`fullscreen-${line.id}`}
                  ref={isActive ? fullscreenActiveLineRef : null}
                  onClick={() => onPlayLine(line.id)}
                  className={`p-5 sm:p-7 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-gray-900 border-violet-500 shadow-2xl ring-2 ring-violet-500/40 scale-[1.01]"
                      : "bg-gray-900/40 border-gray-800/80 hover:border-gray-700 hover:bg-gray-900/70 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 text-xs font-black rounded-lg border ${
                        isHost1
                          ? "bg-blue-950/80 text-blue-400 border-blue-800/60"
                          : "bg-violet-950/80 text-violet-400 border-violet-800/60"
                      }`}>
                        {line.speaker}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono uppercase bg-gray-800 px-2 py-0.5 rounded">
                        Voz: {currentVoice}
                      </span>
                    </div>

                    {isActive && (
                      <span className="text-[10px] font-bold text-violet-400 flex items-center gap-1 bg-violet-950/60 px-2.5 py-1 rounded-full border border-violet-800/50 animate-pulse">
                        <Volume2 size={12} />
                        Lendo agora
                      </span>
                    )}
                  </div>

                  <p className={`font-medium text-gray-100 ${getFontSizeClass()} whitespace-pre-wrap`}>
                    {line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
