import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Settings2, 
  Share2, 
  Volume2, 
  ListMusic, 
  HelpCircle, 
  Mic2,
  FileSpreadsheet
} from "lucide-react";
import DocumentManager from "./components/DocumentManager";
import HostConfigurator from "./components/HostConfigurator";
import ScriptViewer from "./components/ScriptViewer";
import AudioPlayerPanel from "./components/AudioPlayerPanel";
import ExportDashboard from "./components/ExportDashboard";
import { 
  SourceDocument, 
  PodcastScriptLine, 
  HostConfig, 
  PodcastMetadata, 
  GenerationLength 
} from "./types";
import { createAudioBufferFromPcm, pcmChunksToWavBlob } from "./utils/audio";

// Initial placeholder documents to populate the playground instantly
const INITIAL_DOCUMENTS: SourceDocument[] = [
  {
    id: "doc-1",
    type: "text",
    title: "O Impacto da Inteligência Artificial no Aprendizado Autônomo",
    content: `A Inteligência Artificial está redefinindo o modelo tradicional de educação de maneiras profundas. Em vez de uma abordagem de tamanho único, sistemas de tutoria inteligente baseados em IA conseguem analisar o ritmo, os pontos fortes e as fraquezas específicas de cada estudante em tempo real.
Essas ferramentas conseguem adaptar explicações, sugerir problemas de prática personalizados e criar analogias personalizadas com base nos interesses prévios do aluno (por exemplo, explicar física usando analogias de futebol).
Estudos recentes mostram que estudantes utilizando assistentes inteligentes obtêm uma retenção de conteúdo até 40% maior em comparação com métodos de estudo lineares tradicionais, permitindo que cada indivíduo atinja a maestria do conteúdo no seu próprio ritmo. No entanto, educadores alertam que a IA não deve substituir a interação humana, mas servir como um copiloto que liberta o professor para focar em mentoria profunda e desenvolvimento de habilidades socioemocionais.`,
    charCount: 955,
    addedAt: new Date()
  },
  {
    id: "doc-2",
    type: "text",
    title: "Cultura de Trabalho Remoto e a Comunicação Assíncrona",
    content: `Com a consolidação do trabalho híbrido e remoto global, as empresas começaram a perceber que simplesmente transpor o escritório físico para o digital (como passar o dia inteiro em reuniões por vídeo no Zoom) causa exaustão e queda de produtividade.
O verdadeiro segredo das equipes distribuídas de alta performance é a Comunicação Assíncrona. Isso significa estruturar o fluxo de trabalho de forma que as interações não exijam respostas imediatas.
Ao documentar processos detalhadamente, usar ferramentas de gerência de projetos transparentes e encorajar emails ou mensagens detalhadas no lugar de reuniões de alinhamento recorrentes, os colaboradores ganham blocos de tempo contínuos para focar em trabalho profundo (Deep Work). Como resultado, a produtividade aumenta, as interrupções diárias caem em média 60%, e os funcionários relatam uma melhora expressiva na conciliação entre vida profissional e pessoal.`,
    charCount: 935,
    addedAt: new Date()
  }
];

// Helper to parse complex error messages or JSON structures from Gemini TTS API
const parseQuotaError = (errorMsg: string): string => {
  if (!errorMsg) return "Erro desconhecido de síntese de voz.";
  
  try {
    // Check if error contains a JSON object
    const jsonStart = errorMsg.indexOf("{");
    if (jsonStart !== -1) {
      const jsonStr = errorMsg.substring(jsonStart);
      const parsed = JSON.parse(jsonStr);
      if (parsed?.error?.message) {
        let msg = parsed.error.message;
        
        // Handle rate limit/quota specifically
        if (msg.includes("Quota exceeded") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("limit") || msg.includes("exceeded")) {
          const retryMatch = msg.match(/retry in ([\d.]+)\s*s/i);
          const retrySecs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
          
          let friendly = "A cota diária ou limite de requisições do Gemini TTS foi atingida temporariamente.";
          if (retrySecs) {
            friendly += ` Por favor, aguarde cerca de ${retrySecs} segundos antes de tentar novamente.`;
          } else {
            friendly += " Por favor, aguarde alguns instantes antes de tentar gerar novamente.";
          }
          return friendly;
        }
        return msg;
      }
    }
  } catch (e) {
    // If JSON parsing fails, fall back to regex
  }

  // Regex fallback on the raw string
  const lowerMsg = errorMsg.toLowerCase();
  if (lowerMsg.includes("429") || lowerMsg.includes("quota") || lowerMsg.includes("limit") || lowerMsg.includes("exhausted") || lowerMsg.includes("exceeded")) {
    const retryMatch = errorMsg.match(/retry in ([\d.]+)\s*s/i);
    const retrySecs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
    
    let friendly = "Cota diária ou limite de requisições do Gemini TTS atingido temporariamente.";
    if (retrySecs) {
      friendly += ` Por favor, aguarde ${retrySecs} segundos e tente novamente.`;
    } else {
      friendly += " Por favor, tente novamente em alguns instantes.";
    }
    return friendly;
  }

  return errorMsg;
};

export default function App() {
  // Tab managers
  const [rightPanelTab, setRightPanelTab] = useState<"hosts" | "export">("hosts");

  // Document states
  const [documents, setDocuments] = useState<SourceDocument[]>(INITIAL_DOCUMENTS);

  // Configuration states
  const [host1, setHost1] = useState<HostConfig>({
    name: "Thiago",
    voice: "Fenrir",
    toneDescription: "Curioso, calmo, menos enérgico, menos engraçado, focado em fazer analogias didáticas e simples"
  });

  const [host2, setHost2] = useState<HostConfig>({
    name: "Marina",
    voice: "Kore",
    toneDescription: "Especialista analítica, didática e muito complementar ao parceiro"
  });

  const [tone, setTone] = useState<string>("Descontraído e Bem-humorado");
  const [length, setLength] = useState<GenerationLength>("10_mins");
  const [language, setLanguage] = useState<string>("Português");
  const [hasTtsQuotaError, setHasTtsQuotaError] = useState<boolean>(false);
  const [ttsQuotaErrorDetail, setTtsQuotaErrorDetail] = useState<string>("");

  // Script states
  const [scriptTitle, setScriptTitle] = useState("O Futuro do Aprendizado e do Trabalho");
  const [scriptDescription, setScriptDescription] = useState("Thiago e Marina debatem o impacto revolucionário da inteligência artificial na educação e como a comunicação assíncrona está transformando carreiras remotas.");
  const [script, setScript] = useState<PodcastScriptLine[]>([]);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Loaders
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [isSynthesizingAll, setIsSynthesizingAll] = useState(false);
  const [synthesizeAllProgress, setSynthesizeAllProgress] = useState({ current: 0, total: 0 });

  // Additional Metadata
  const [metadata, setMetadata] = useState<PodcastMetadata | null>(null);

  // Web Audio Context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const activeLineIdRef = useRef<string | null>(null);

  // Sync ref to playing state to avoid stale closure issues in onended listeners
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    activeLineIdRef.current = activeLineId;
  }, [activeLineId]);

  // Document controls
  const handleAddDocument = (newDoc: Omit<SourceDocument, "id" | "addedAt">) => {
    const doc: SourceDocument = {
      ...newDoc,
      id: `doc-${Date.now()}`,
      addedAt: new Date()
    };
    setDocuments((prev) => [...prev, doc]);
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Generate Podcast Script using gemini-3.5-flash server endpoint
  const handleGenerateScript = async () => {
    if (documents.length === 0) return;
    setIsGeneratingScript(true);
    setMetadata(null); // Reset metadata on fresh generation
    stopPlayback();

    try {
      const res = await fetch("/api/podcast/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: documents,
          tone,
          host1,
          host2,
          length,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao gerar o roteiro");
      }

      setScriptTitle(data.title);
      setScriptDescription(data.description);
      
      // Inject unique IDs for speech turns
      const scriptLines: PodcastScriptLine[] = data.script.map((line: any, idx: number) => ({
        id: `line-${idx}-${Date.now()}`,
        speaker: line.speaker,
        text: line.text,
        isSynthesized: false,
        isSynthesizing: false
      }));

      setScript(scriptLines);
      setActiveLineId(scriptLines[0]?.id || null);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Synthesize a single line's audio
  const synthesizeLine = async (lineId: string): Promise<string> => {
    // Find line details
    const lineIndex = script.findIndex((l) => l.id === lineId);
    if (lineIndex === -1) throw new Error("Linha não encontrada");
    const line = script[lineIndex];

    // Mark as synthesizing
    updateLineState(lineId, { isSynthesizing: true, error: undefined });

    const isHost1 = line.speaker.toLowerCase() === host1.name.toLowerCase() || 
                    line.speaker.toLowerCase().includes(host1.name.toLowerCase()) ||
                    line.speaker.toLowerCase() === "host 1";
    
    const voiceName = isHost1 ? host1.voice : host2.voice;
    const toneInstruction = isHost1 ? host1.toneDescription : host2.toneDescription;

    try {
      const res = await fetch("/api/podcast/synthesize-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: line.text,
          voiceName,
          toneInstruction
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro de síntese do Gemini");
      }

      updateLineState(lineId, { 
        isSynthesizing: false, 
        isSynthesized: true, 
        audioBase64: data.audio,
        error: undefined
      });

      return data.audio;
    } catch (err: any) {
      console.error("Synthesis failed:", err);
      const friendlyError = parseQuotaError(err.message || "");
      setHasTtsQuotaError(true);
      setTtsQuotaErrorDetail(friendlyError);
      updateLineState(lineId, { 
        isSynthesizing: false, 
        isSynthesized: false, 
        error: friendlyError
      });
      throw err;
    }
  };

  // Helper to update state of a script line
  const updateLineState = (lineId: string, updates: Partial<PodcastScriptLine>) => {
    setScript((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...updates } : l))
    );
  };

  // Handle playing individual line
  const handlePlayLine = async (lineId: string) => {
    stopPlayback();
    setActiveLineId(lineId);
    setIsPlaying(true);
    try {
      await playAudioSequence(lineId, false); // Play without advancing
    } catch (err) {
      setIsPlaying(false);
    }
  };

  // Core sequential audio playback engine
  const playAudioSequence = async (lineId: string, autoAdvance: boolean) => {
    const currentLine = script.find((l) => l.id === lineId);
    if (!currentLine) return;

    // --- Premium Gemini TTS Path ---
    // 1. Initialize audio context if not loaded
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
    }

    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }

    let base64Audio = currentLine.audioBase64;

    // 2. Synthesize on the fly if needed
    if (!base64Audio) {
      try {
        base64Audio = await synthesizeLine(lineId);
      } catch (err) {
        console.warn("Gemini TTS failure or quota reached:", err);
        setIsPlaying(false);
        return;
      }
    }

    // Double check if user paused during synthesis fetch
    if (!isPlayingRef.current && autoAdvance) {
      return;
    }

    // 3. Render and Play Base64 raw 16-bit PCM (24kHz)
    try {
      const buffer = createAudioBufferFromPcm(base64Audio, audioCtxRef.current, 24000);
      
      // Stop old active source
      if (activeSourceRef.current) {
        activeSourceRef.current.stop();
      }

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtxRef.current.destination);
      activeSourceRef.current = source;

      source.onended = () => {
        activeSourceRef.current = null;
        
        // Auto-advance if sequential is enabled
        if (autoAdvance && isPlayingRef.current) {
          const currentIndex = script.findIndex((l) => l.id === lineId);
          if (currentIndex !== -1 && currentIndex < script.length - 1) {
            const nextLine = script[currentIndex + 1];
            setActiveLineId(nextLine.id);
            // Introduce a short natural conversational breathing gap (450ms)
            setTimeout(() => {
              if (isPlayingRef.current) {
                playAudioSequence(nextLine.id, true);
              }
            }, 450);
          } else {
            // End of podcast
            setIsPlaying(false);
            setActiveLineId(script[0]?.id || null);
          }
        }
      };

      source.start(0);
    } catch (err) {
      console.error("Erro na decodificação de áudio WebAudio:", err);
      setIsPlaying(false);
    }
  };

  // Stop current playing source
  const stopPlayback = () => {
    window.speechSynthesis.cancel();
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (_) {}
      activeSourceRef.current = null;
    }
  };

  // Play / Pause Toggle
  const handlePlayPause = () => {
    if (script.length === 0) return;

    if (isPlaying) {
      stopPlayback();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const targetLineId = activeLineId || script[0].id;
      setActiveLineId(targetLineId);
      
      // Use micro-task timeout to ensure isPlayingRef updates beforehand
      setTimeout(() => {
        playAudioSequence(targetLineId, true);
      }, 50);
    }
  };

  // Next Turn Navigation
  const handleNextLine = () => {
    if (script.length === 0) return;
    const currentIndex = script.findIndex((l) => l.id === activeLineId);
    if (currentIndex !== -1 && currentIndex < script.length - 1) {
      const nextLineId = script[currentIndex + 1].id;
      setActiveLineId(nextLineId);
      if (isPlaying) {
        playAudioSequence(nextLineId, true);
      }
    }
  };

  // Previous Turn Navigation
  const handlePreviousLine = () => {
    if (script.length === 0) return;
    const currentIndex = script.findIndex((l) => l.id === activeLineId);
    if (currentIndex > 0) {
      const prevLineId = script[currentIndex - 1].id;
      setActiveLineId(prevLineId);
      if (isPlaying) {
        playAudioSequence(prevLineId, true);
      }
    }
  };

  // Inline script line text editing
  const handleUpdateLineText = (lineId: string, newText: string) => {
    updateLineState(lineId, { 
      text: newText, 
      isSynthesized: false, // Invalidate old cached speech
      audioBase64: undefined 
    });
  };

  // Bulk background synthesis
  const handleSynthesizeAll = async () => {
    if (script.length === 0 || isSynthesizingAll) return;

    setIsSynthesizingAll(true);

    const unsynthesizedLines = script.filter((l) => !l.isSynthesized);
    setSynthesizeAllProgress({ current: 0, total: unsynthesizedLines.length });

    let count = 0;
    try {
      for (const line of script) {
        if (!line.isSynthesized) {
          await synthesizeLine(line.id);
          count++;
          setSynthesizeAllProgress({ current: count, total: unsynthesizedLines.length });
        }
      }
    } catch (err: any) {
      console.error("Quota exceeded or error in bulk synthesis:", err);
      setHasTtsQuotaError(true);
      setTtsQuotaErrorDetail(parseQuotaError(err.message || ""));
    } finally {
      setIsSynthesizingAll(false);
    }
  };

  // Download entire combined WAV podcast
  const handleDownloadPodcast = () => {
    // Collect all synthesized line base64 audios in correct order
    const synthesizedChunks = script
      .filter((l) => l.isSynthesized && l.audioBase64)
      .map((l) => l.audioBase64!);

    if (synthesizedChunks.length === 0) return;

    try {
      const wavBlob = pcmChunksToWavBlob(synthesizedChunks, 24000);
      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement("a");
      link.href = url;
      
      // Format a clean file name
      const safeTitle = scriptTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30);
      link.download = `podcast-${safeTitle || "episodio"}.wav`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao montar o arquivo WAV consolidado.");
    }
  };

  // Generate show notes/metadata using Gemini
  const handleGenerateMetadata = async () => {
    if (script.length === 0) return;
    setIsGeneratingMetadata(true);

    try {
      const res = await fetch("/api/podcast/generate-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: scriptTitle,
          description: scriptDescription,
          script: script.map((l) => ({ speaker: l.speaker, text: l.text }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao produzir metadados");
      }

      setMetadata(data);
    } catch (err: any) {
      alert(`Falha: ${err.message}`);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-gray-50 flex flex-col font-sans select-none antialiased text-gray-800 lg:overflow-hidden">
      
      {/* Header Bar */}
      <header id="app-header" className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gray-950 text-white rounded-xl shadow-md shadow-black/5 flex items-center justify-center">
            <Mic2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-gray-900">AuraCast - Podcast Studio</h1>
              <span className="px-2 py-0.5 bg-violet-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-sm">
                StratisPlanner 🎯
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[9px] font-bold rounded-full">
                Uso Pessoal & Concursos
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Gere áudio neural didático de alta retenção para plataformas e concursos públicos</p>
          </div>
        </div>

        {/* Top bar indicators */}
        <div className="hidden sm:flex items-center gap-4 text-[11px] font-medium text-gray-400">
          <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-gray-600">Serviço de Áudio Ativo</span>
          </div>
        </div>
      </header>

      {/* Quota Exceeded Friendly System Banner */}
      {hasTtsQuotaError && (
        <div id="tts-quota-warning-banner" className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-medium shrink-0 shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5 sm:mt-0">
              <Sparkles size={14} className="animate-pulse text-amber-600" />
            </div>
            <div>
              <strong className="font-bold text-amber-950 block sm:inline mr-1">Controle de Cota do Gemini TTS Ativo:</strong> 
              <span className="text-amber-800 leading-relaxed">
                {ttsQuotaErrorDetail || "O limite da API do Gemini para síntese de áudio foi temporariamente excedido. Aguarde alguns segundos para restabelecer a cota do modelo."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setHasTtsQuotaError(false)}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all border border-amber-200 shadow-sm"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}

      {/* Main workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 pb-28 md:p-6 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden">
        
        {/* Left column: Sources Pane (Span 4) */}
        <section id="col-sources" className="lg:col-span-3 flex flex-col min-h-0 h-[400px] lg:h-full">
          <DocumentManager
            documents={documents}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
          />
        </section>

        {/* Middle column: Interactive Script Viewer (Span 5) */}
        <section id="col-script" className="lg:col-span-5 flex flex-col min-h-0 h-[500px] lg:h-full">
          <ScriptViewer
            title={scriptTitle}
            description={scriptDescription}
            script={script}
            activeLineId={activeLineId}
            isPlaying={isPlaying}
            isGeneratingScript={isGeneratingScript}
            onUpdateLineText={handleUpdateLineText}
            onSynthesizeLine={synthesizeLine}
            onPlayLine={handlePlayLine}
            onGenerateScript={handleGenerateScript}
            hasDocuments={documents.length > 0}
            host1={host1}
            host2={host2}
          />
        </section>

        {/* Right column: Configurator & Exporters Tab Panel (Span 4) */}
        <section id="col-config" className="lg:col-span-4 flex flex-col min-h-0 h-[450px] lg:h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab Selector */}
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-1.5 gap-1 shrink-0">
            <button
              id="tab-btn-hosts"
              type="button"
              onClick={() => setRightPanelTab("hosts")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                rightPanelTab === "hosts"
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Settings2 size={13} />
              Apresentadores e Vozes
            </button>
            <button
              id="tab-btn-export"
              type="button"
              disabled={script.length === 0}
              onClick={() => setRightPanelTab("export")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                rightPanelTab === "export"
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Share2 size={13} />
              Distribuição e SEO
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 custom-scrollbar">
            {rightPanelTab === "hosts" ? (
              <HostConfigurator
                host1={host1}
                host2={host2}
                tone={tone}
                length={length}
                language={language}
                onUpdateHost1={(updates) => setHost1((prev) => ({ ...prev, ...updates }))}
                onUpdateHost2={(updates) => setHost2((prev) => ({ ...prev, ...updates }))}
                onUpdateTone={setTone}
                onUpdateLength={setLength}
                onUpdateLanguage={setLanguage}
              />
            ) : (
              <ExportDashboard
                title={scriptTitle}
                description={scriptDescription}
                script={script}
                hasAudio={script.some((l) => l.isSynthesized)}
                metadata={metadata}
                onGenerateMetadata={handleGenerateMetadata}
                isGeneratingMetadata={isGeneratingMetadata}
              />
            )}
          </div>
        </section>

      </main>

      {/* Bottom Sticky Player Control Bar */}
      <div className="sticky bottom-0 left-0 right-0 z-50 shrink-0 shadow-2xl">
        <AudioPlayerPanel
          script={script}
          activeLineId={activeLineId}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNextLine={handleNextLine}
          onPreviousLine={handlePreviousLine}
          isSynthesizingAll={isSynthesizingAll}
          synthesizeAllProgress={synthesizeAllProgress}
          onSynthesizeAll={handleSynthesizeAll}
          onDownloadPodcast={handleDownloadPodcast}
        />
      </div>
    </div>
  );
}
