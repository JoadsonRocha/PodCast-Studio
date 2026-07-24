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
    <div id="audio-player-panel" className="bg-gray-900/95 backdrop-blur-md border-t border-gray-800 text-white px-3 py-2.5 sm:px-6 sm:py-3.5 shrink-0 shadow-2xl relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4">
        
        {/* Top/Left Side: Current Speaking details or Status */}
        <div className="flex items-center justify-between md:justify-start gap-2.5 w-full md:w-1/3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl bg-gray-800 text-gray-300 shrink-0 ${isPlaying ? "text-green-400 animate-pulse" : ""}`}>
              <AudioLines size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 id="player-title" className="text-xs font-bold text-gray-200 truncate">
                {isPlaying ? "Reproduzindo Episódio" : hasScript ? "Roteiro Pronto" : "Podcast Studio"}
              </h4>
              <p id="player-subtitle" className="text-[11px] text-gray-400 truncate mt-0.5" title={activeLineText}>
                {hasScript ? activeLineText : "Gere o roteiro e inicie as vozes"}
              </p>
            </div>
          </div>

          {/* Mobile Badge: Vozes Sintetizadas */}
          {hasScript && (
            <div className="md:hidden flex items-center gap-1.5 shrink-0 bg-gray-800/90 px-2 py-1 rounded-md border border-gray-700/60">
              <span className="text-[10px] font-semibold text-gray-400">Vozes:</span>
              <span className="text-xs font-black text-violet-300">{synthesizedCount}/{totalCount}</span>
            </div>
          )}
        </div>

        {/* Center: Playback controls & mobile action row */}
        <div className="flex items-center justify-between md:justify-center w-full md:w-1/3 gap-2">
          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              id="player-btn-prev"
              type="button"
              disabled={!hasScript || activeLineIndex <= 0}
              onClick={onPreviousLine}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Falar anterior"
            >
              <SkipBack size={16} />
            </button>

            <button
              id="player-btn-play-pause"
              type="button"
              disabled={!hasScript}
              onClick={onPlayPause}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-gray-900 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 hover:scale-105 active:scale-95 shadow-sm"
              title={isPlaying ? "Pausar podcast" : "Iniciar podcast sequencial"}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
            </button>

            <button
              id="player-btn-next"
              type="button"
              disabled={!hasScript || activeLineIndex >= script.length - 1}
              onClick={onNextLine}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Próxima fala"
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* Sequential mini speaker wave (desktop) */}
          {isPlaying && (
            <div id="visual-audio-wave" className="hidden sm:flex items-center gap-0.5 h-3">
              <span className="w-0.5 h-full bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s", animationDuration: "0.7s" }}></span>
              <span className="w-0.5 h-1/2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s", animationDuration: "0.5s" }}></span>
              <span className="w-0.5 h-3/4 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0s", animationDuration: "0.6s" }}></span>
              <span className="w-0.5 h-1/3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s", animationDuration: "0.4s" }}></span>
              <span className="w-0.5 h-5/6 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s", animationDuration: "0.8s" }}></span>
            </div>
          )}

          {/* Mobile Buttons (Synthesize All, Download WAV) */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {hasScript && !isFullySynthesized && (
              <button
                id="player-btn-synth-all-mobile"
                type="button"
                disabled={isSynthesizingAll}
                onClick={onSynthesizeAll}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              >
                {isSynthesizingAll ? (
                  <Loader2 size={12} className="animate-spin text-white" />
                ) : (
                  <Sparkles size={12} className="text-white" />
                )}
                <span>{isSynthesizingAll ? `${synthesizeAllProgress.current}/${synthesizeAllProgress.total}` : "Sintetizar"}</span>
              </button>
            )}

            {hasScript && (
              <button
                id="player-btn-download-wav-mobile"
                type="button"
                disabled={synthesizedCount === 0}
                onClick={onDownloadPodcast}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                title="Baixar WAV"
              >
                <Download size={12} />
                <span>WAV</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Master controls (Synthesize All, Download WAV) - Desktop (md+) */}
        <div className="hidden md:flex items-center justify-end gap-3 w-1/3">
          {hasScript && (
            <div className="flex flex-col items-end gap-1 text-right">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400">
                  Vozes Treinadas:
                </span>
                <span className="text-xs font-black text-gray-200">
                  {synthesizedCount}/{totalCount} ({synthesisPercentage}%)
                </span>
              </div>
              <div className="w-32 sm:w-36 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${synthesisPercentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 shrink-0">
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
