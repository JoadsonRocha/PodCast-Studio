import React, { useState } from "react";
import { 
  Globe, 
  Send, 
  Check, 
  Copy, 
  Loader2, 
  Share2, 
  Sparkles, 
  Youtube, 
  Music, 
  Rss, 
  Tv, 
  FileText,
  BadgeAlert
} from "lucide-react";
import { PodcastScriptLine, PodcastMetadata, ExportPlatform } from "../types";

interface ExportDashboardProps {
  title: string;
  description: string;
  script: PodcastScriptLine[];
  hasAudio: boolean;
  metadata: PodcastMetadata | null;
  onGenerateMetadata: () => Promise<void>;
  isGeneratingMetadata: boolean;
}

export default function ExportDashboard({
  title,
  description,
  script,
  hasAudio,
  metadata,
  onGenerateMetadata,
  isGeneratingMetadata,
}: ExportDashboardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<ExportPlatform[]>([
    {
      id: "spotify",
      name: "Spotify for Podcasters",
      icon: "spotify",
      status: "idle",
      progress: 0,
      instruction: "Envia o arquivo WAV integrado e as Notas de Show (Show Notes) diretamente para a sua conta do Spotify de forma automática.",
    },
    {
      id: "apple",
      name: "Apple Podcasts Connect",
      icon: "apple",
      status: "idle",
      progress: 0,
      instruction: "Injeta a transmissão de áudio nos servidores da Apple com os marcadores de capítulos gerados.",
    },
    {
      id: "youtube",
      name: "YouTube Podcasts",
      icon: "youtube",
      status: "idle",
      progress: 0,
      instruction: "Mescla o áudio do podcast com uma imagem estática de capa e publica o vídeo diretamente na playlist do seu canal.",
    },
    {
      id: "rss",
      name: "Distribuição RSS Direta",
      icon: "rss",
      status: "idle",
      progress: 0,
      instruction: "Gera o XML padrão do iTunes/Spotify RSS feed para importar em qualquer distribuidor (Anchor, Libsyn, Buzzsprout).",
    }
  ]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExport = (platformId: string) => {
    // Reset platform state
    setPlatforms(prev => prev.map(p => {
      if (p.id === platformId) {
        return { ...p, status: "exporting", progress: 0, exportedUrl: undefined };
      }
      return p;
    }));

    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += 10;
      
      setPlatforms(prev => prev.map(p => {
        if (p.id === platformId) {
          const finished = progressVal >= 100;
          if (finished) {
            clearInterval(interval);
            
            // Set mock success url
            let url = "";
            if (platformId === "spotify") url = "https://open.spotify.com/show/mock-studio-id";
            if (platformId === "youtube") url = "https://youtube.com/podcasts/mock-id";
            if (platformId === "rss") url = "https://my-podcast-feed.xml";

            return { 
              ...p, 
              status: "success", 
              progress: 100, 
              exportedUrl: url || undefined 
            };
          }
          return { ...p, progress: progressVal };
        }
        return p;
      }));
    }, 400);
  };

  // Generate static XML for standard RSS
  const generateRssXml = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${title || "Meu Podcast"}</title>
    <description>${description || "Episódio criado no NotebookLM Podcast Studio"}</description>
    <language>pt-BR</language>
    <itunes:author>NotebookLM Studio</itunes:author>
    <itunes:category text="Technology"/>
    <itunes:explicit>no</itunes:explicit>
    <item>
      <title>${title || "Episódio 1"}</title>
      <itunes:summary>${description || "Notas de Show incluídas"}</itunes:summary>
      <enclosure url="https://storage.googleapis.com/podcasts/audio.wav" length="4125890" type="audio/wav"/>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;
  };

  return (
    <div id="export-dashboard" className="space-y-6 flex flex-col p-1">
      
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-50 pb-3 shrink-0">
        <div className="p-1.5 bg-gray-50 rounded-lg text-gray-800">
          <Share2 size={16} />
        </div>
        <div>
          <h2 id="export-title" className="text-sm font-bold text-gray-900">Distribuição & SEO</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Gerencie os metadados de publicação e publique online</p>
        </div>
      </div>

      {/* SEO & Show Notes Area */}
      <div id="seo-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} className="text-violet-500" />
            Metadados Gerados por IA
          </h3>
          
          {script.length > 0 && !metadata && (
            <button
              id="btn-generate-seo-metadata"
              type="button"
              disabled={isGeneratingMetadata}
              onClick={onGenerateMetadata}
              className="px-3 py-1.5 text-[10px] font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isGeneratingMetadata ? (
                <>
                  <Loader2 size={10} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles size={10} />
                  Criar Notas de Show
                </>
              )}
            </button>
          )}
        </div>

        {isGeneratingMetadata && (
          <div id="metadata-loading" className="p-5 border border-dashed border-gray-100 rounded-xl bg-gray-50/30 flex flex-col items-center justify-center text-center space-y-2">
            <Loader2 size={20} className="animate-spin text-violet-500" />
            <p className="text-xs font-semibold text-gray-700">Construindo Notas de Show e SEO...</p>
            <p className="text-[10px] text-gray-400">O Gemini está analisando o roteiro para criar marcadores de capítulos de tempo.</p>
          </div>
        )}

        {/* If no metadata and script exists */}
        {!metadata && !isGeneratingMetadata && (
          <div className="p-4 border border-dashed border-gray-100 rounded-xl bg-gray-50/50 text-center text-xs text-gray-400">
            {script.length > 0 
              ? "Clique em 'Criar Notas de Show' para gerar sumário estruturado, tags e marcadores de tempo automáticos via Gemini."
              : "Gere o roteiro do podcast primeiro para poder estruturar os metadados de distribuição."}
          </div>
        )}

        {metadata && (
          <div id="metadata-panel" className="space-y-4 border border-gray-100 p-4 rounded-xl bg-gray-50/30">
            {/* SEO Tags */}
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tags Recomendadas</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {metadata.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Chapters */}
            {metadata.chapterMarkers && metadata.chapterMarkers.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Marcadores de Capítulo</span>
                <div className="space-y-1.5 mt-1.5">
                  {metadata.chapterMarkers.map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-violet-600 font-bold bg-violet-50 px-1.5 py-0.5 rounded text-[10px]">
                        {ch.timestamp}
                      </span>
                      <span className="text-gray-700 font-medium truncate">{ch.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show Notes (Intro & Summary) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText size={11} /> Descrição Completa (Show Notes)
                </span>
                <button
                  id="btn-copy-shownotes"
                  type="button"
                  onClick={() => copyToClipboard(metadata.showNotes, "shownotes")}
                  className="p-1 text-gray-400 hover:text-gray-900 rounded hover:bg-white flex items-center gap-1 text-[10px] font-semibold cursor-pointer border border-transparent hover:border-gray-100 transition-all"
                >
                  {copiedField === "shownotes" ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                  {copiedField === "shownotes" ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <div className="max-h-28 overflow-y-auto p-2.5 border border-gray-100 bg-white rounded-lg text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
                {metadata.showNotes}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Distribution Platforms Exporters */}
      <div id="distribution-section" className="space-y-4 pt-4 border-t border-gray-50 flex-1 flex flex-col min-h-0">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
          <Globe size={12} className="text-blue-500" />
          Exportação Direta de Plataformas
        </h3>

        {!hasAudio && (
          <div className="flex gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-[11px] leading-relaxed">
            <BadgeAlert size={14} className="shrink-0 mt-0.5 text-amber-600" />
            <p>
              <strong>Aviso:</strong> É altamente recomendável <strong>sintetizar todas as falas</strong> e gerar o arquivo de áudio final antes de submeter às plataformas de podcast.
            </p>
          </div>
        )}

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {platforms.map((p) => (
            <div
              id={`platform-exporter-${p.id}`}
              key={p.id}
              className="p-3.5 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm bg-white transition-all flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    p.id === "spotify" ? "bg-green-50 text-green-600" :
                    p.id === "apple" ? "bg-gray-50 text-gray-800" :
                    p.id === "youtube" ? "bg-red-50 text-red-600" :
                    "bg-blue-50 text-blue-600"
                  }`}>
                    {p.id === "spotify" && <Music size={14} />}
                    {p.id === "apple" && <Music size={14} />}
                    {p.id === "youtube" && <Youtube size={14} />}
                    {p.id === "rss" && <Rss size={14} />}
                  </div>
                  <span className="text-xs font-bold text-gray-900">{p.name}</span>
                </div>

                {/* Export triggers */}
                {p.status === "idle" ? (
                  <button
                    id={`btn-export-trigger-${p.id}`}
                    type="button"
                    onClick={() => handleExport(p.id)}
                    className="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-[10px] font-bold text-white rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Send size={10} />
                    Exportar
                  </button>
                ) : p.status === "exporting" ? (
                  <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" />
                    Enviando ({p.progress}%)
                  </span>
                ) : (
                  <span className="text-[10px] text-green-600 font-black flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                    <Check size={10} />
                    Pronto!
                  </span>
                )}
              </div>

              <p className="text-[10px] text-gray-400 leading-normal">{p.instruction}</p>

              {/* Progress bar of export */}
              {p.status === "exporting" && (
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${p.progress}%` }} />
                </div>
              )}

              {/* Show link or copy code of RSS */}
              {p.status === "success" && (
                <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                  {p.id === "rss" ? (
                    <button
                      id="btn-copy-rss-xml"
                      type="button"
                      onClick={() => copyToClipboard(generateRssXml(), "rss")}
                      className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-[9px] font-bold text-gray-600 border border-gray-100 rounded flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedField === "rss" ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                      {copiedField === "rss" ? "Copiado!" : "Copiar Feed XML"}
                    </button>
                  ) : (
                    <a
                      id={`link-exported-${p.id}`}
                      href={p.exportedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-bold text-violet-600 hover:underline flex items-center gap-0.5"
                    >
                      <Globe size={10} />
                      Visualizar Publicação ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
