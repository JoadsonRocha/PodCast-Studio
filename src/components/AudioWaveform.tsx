import React, { useEffect, useState, useMemo } from "react";
import { Volume2, VolumeX, Radio, Mic } from "lucide-react";

interface AudioWaveformProps {
  isPlaying: boolean;
  activeLineId: string | null;
  speaker: string | null;
  voice: string | null;
  isHost1: boolean;
}

export default function AudioWaveform({
  isPlaying,
  activeLineId,
  speaker,
  voice,
  isHost1,
}: AudioWaveformProps) {
  const BAR_COUNT = 32;

  // Track real-time heights of the spectrum analyzer bars
  const [barHeights, setBarHeights] = useState<number[]>(
    Array(BAR_COUNT).fill(6) // default quiet state
  );

  useEffect(() => {
    if (!isPlaying) {
      // Smoothly return bars to a flat quiet state
      const interval = setInterval(() => {
        setBarHeights((prev) => {
          const next = prev.map((h) => Math.max(6, h - 10));
          if (next.every((h) => h === 6)) {
            clearInterval(interval);
          }
          return next;
        });
      }, 50);
      return () => clearInterval(interval);
    }

    // Active spectrum simulation
    let animationId: number;
    let tick = 0;

    const updateSpectrum = () => {
      tick += 0.15;
      setBarHeights((prev) =>
        prev.map((_, index) => {
          // Generate a wave pattern using a combination of sine functions and random jitter
          const baseSine = Math.sin(index * 0.4 + tick) * 35 + 45;
          const secondarySine = Math.cos(index * 0.15 - tick * 1.5) * 15;
          const noise = Math.random() * 25;
          
          // Clamp values between 10% and 95%
          const height = Math.min(95, Math.max(10, baseSine + secondarySine + noise));
          return height;
        })
      );
      animationId = requestAnimationFrame(updateSpectrum);
    };

    animationId = requestAnimationFrame(updateSpectrum);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, activeLineId]);

  // Color gradient class mapping
  const gradientClass = useMemo(() => {
    if (!isPlaying) return "bg-gray-200";
    return isHost1
      ? "bg-gradient-to-t from-blue-600 via-blue-400 to-sky-300"
      : "bg-gradient-to-t from-violet-600 via-violet-400 to-fuchsia-300";
  }, [isPlaying, isHost1]);

  return (
    <div
      id="audio-waveform-monitor"
      className={`border rounded-2xl p-4 transition-all duration-500 shadow-sm ${
        isPlaying
          ? isHost1
            ? "border-blue-100 bg-blue-50/20"
            : "border-violet-100 bg-violet-50/20"
          : "border-gray-100 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg flex items-center justify-center transition-all duration-300 ${
              isPlaying
                ? isHost1
                  ? "bg-blue-100 text-blue-600"
                  : "bg-violet-100 text-violet-600"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {isPlaying ? (
              <Radio size={14} className="animate-pulse" />
            ) : (
              <VolumeX size={14} />
            )}
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Monitor de Áudio
            </span>
            <h4 className="text-xs font-bold text-gray-800 leading-none mt-0.5">
              {isPlaying ? "Canal de Áudio Ativo" : "Canal em Espera"}
            </h4>
          </div>
        </div>

        {/* Current speaker feedback */}
        {isPlaying && speaker && (
          <div
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 transition-all duration-300 ${
              isHost1
                ? "bg-blue-100/60 text-blue-700"
                : "bg-violet-100/60 text-violet-700"
            }`}
          >
            <Mic size={10} />
            <span>
              {speaker} ({voice})
            </span>
          </div>
        )}
      </div>

      {/* Waveform graphic bars */}
      <div className="h-12 flex items-end justify-between gap-[3px] px-1 relative">
        {barHeights.map((height, i) => (
          <div
            key={i}
            className={`w-full rounded-full transition-all duration-75 ${gradientClass}`}
            style={{ height: `${height}%` }}
          />
        ))}

        {/* Overlay helper to draw a centerline */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-gray-100 pointer-events-none" />
      </div>
    </div>
  );
}
