import React, { useMemo } from "react";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Download, 
  Loader2, 
  AudioLines,
  Sparkles,
  Volume2
} from "lucide-react";
import { PodcastScriptLine } from "../types";

interface AudioPlayerPanelProps {
  script: PodcastScriptLine[];
  activeLineId: string | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNextLine: () => void;
  onPreviousLine: () => void;
  isSynthesizingAll: boolean;
  synthesizeAllProgress: { current: number; total: number };
  onSynthesizeAll: () => void;
  onDownloadPodcast: () => void;
}

export default function AudioPlayerPanel({
  script,
  activeLineId,
  isPlaying,
  onPlayPause,
  onNextLine,
  onPreviousLine,
  isSynthesizingAll,
  synthesizeAllProgress,
  onSynthesizeAll,
  onDownloadPodcast,
}: AudioPlayerPanelProps) {
  
  // Calculate total synthesis statistics
  const { synthesizedCount, totalCount } = useMemo(() => {
    const total = script.length;
    const synthesized = script.filter((line) => line.isSynthesized && line.audioBase64).length;
    return { synthesizedCount: synthesized, totalCount: total };
  }, [script]);

  const activeLineIndex = useMemo(() => {
    if (!activeLineId) return -1;
    return script.findIndex((l) => l.id === activeLineId);
  }, [script, activeLineId]);

  const activeLineText = useMemo(() => {
    if (activeLineIndex === -1) return "Estúdio de Gravação NotebookLM";
    const line = script[activeLineIndex];
    return `[${line.speaker}]: "${line.text.substring(0, 70)}${line.text.length > 70 ? "..." : ""}"`;
  }, [script, activeLineIndex]);

  const hasScript = script.length > 0;
  const isFullySynthesized = hasScript && synthesizedCount === totalCount;
  const synthesisPercentage = hasScript ? Math.round((synthesizedCount / totalCount) * 100) : 0;

  return (
    <div id="audio-player-panel" className="bg-gray-900 border-t border-gray-800 text-white p-4 shrink-0 shadow-2xl relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Current Speaking details or Status */}
        <div className="flex items-center gap-3 w-full md:w-1/3 min-w-0">
          <div className={`p-2.5 rounded-xl bg-gray-800 text-gray-300 ${isPlaying ? "text-green-400 animate-pulse" : ""}`}>
            <AudioLines size={18} />
          </div>
          <div className="min-w-0">
            <h4 id="player-title" className="text-xs font-bold text-gray-200 truncate">
              {isPlaying ? "Reproduzindo Episódio" : hasScript ? "Roteiro Pronto" : "Podcast Studio"}
            </h4>
            <p id="player-subtitle" className="text-[11px] text-gray-400 truncate mt-0.5" title={activeLineText}>
              {hasScript ? activeLineText : "Gere o roteiro e inicie as sínteses das vozes"}
            </p>
          </div>
        </div>

        {/* Middle: Playback controls */}
        <div className="flex flex-col items-center gap-2 w-full md:w-1/3">
          <div className="flex items-center gap-4">
            <button
              id="player-btn-prev"
              type="button"
              disabled={!hasScript || activeLineIndex <= 0}
              onClick={onPreviousLine}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors cursor-pointer"
              title="Falar anterior"
            >
              <SkipBack size={18} />
            </button>

            <button
              id="player-btn-play-pause"
              type="button"
              disabled={!hasScript}
              onClick={onPlayPause}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isPlaying 
                  ? "bg-white text-gray-900 hover:scale-105" 
                  : "bg-white text-gray-900 hover:scale-105"
              }`}
              title={isPlaying ? "Pausar podcast" : "Iniciar podcast sequencial"}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
            </button>

            <button
              id="player-btn-next"
              type="button"
              disabled={!hasScript || activeLineIndex >= script.length - 1}
              onClick={onNextLine}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors cursor-pointer"
              title="Próxima fala"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Sequential mini speaker anim */}
          {isPlaying && (
            <div id="visual-audio-wave" className="flex items-center gap-0.5 h-3">
              <span className="w-0.5 h-full bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s", animationDuration: "0.7s" }}></span>
              <span className="w-0.5 h-1/2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s", animationDuration: "0.5s" }}></span>
              <span className="w-0.5 h-3/4 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0s", animationDuration: "0.6s" }}></span>
              <span className="w-0.5 h-1/3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s", animationDuration: "0.4s" }}></span>
              <span className="w-0.5 h-5/6 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s", animationDuration: "0.8s" }}></span>
            </div>
          )}
        </div>

        {/* Right Side: Master controls (Synthesize All, Download WAV) */}
        <div className="flex items-center justify-end gap-3 w-full md:w-1/3">
          {hasScript && (
            <div className="flex flex-col items-end gap-1.5 text-right">
              {/* Progress bar of cached speech */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400">
                  Vozes Treinadas:
                </span>
                <span className="text-xs font-black text-gray-200">
                  {synthesizedCount}/{totalCount} ({synthesisPercentage}%)
                </span>
              </div>
              <div className="w-36 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${synthesisPercentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 shrink-0">
            {/* Synthesize All Button */}
            {hasScript && !isFullySynthesized && (
              <button
                id="player-btn-synth-all"
                type="button"
                disabled={isSynthesizingAll}
                onClick={onSynthesizeAll}
                className="px-3 py-2 text-[11px] font-bold bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-gray-700"
              >
                {isSynthesizingAll ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-gray-400" />
                    <span>Sintetizando {synthesizeAllProgress.current}/{synthesizeAllProgress.total}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-violet-400" />
                    <span>Sintetizar Tudo</span>
                  </>
                )}
              </button>
            )}

            {/* Download Master WAV button */}
            {hasScript && (
              <button
                id="player-btn-download-wav"
                type="button"
                disabled={synthesizedCount === 0}
                onClick={onDownloadPodcast}
                className="px-3 py-2 text-[11px] font-bold bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-transparent disabled:border-transparent"
                title="Concatenar falas e baixar arquivo .wav completo"
              >
                <Download size={12} />
                <span>Baixar WAV</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
