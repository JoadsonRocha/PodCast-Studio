import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Settings2, 
  Share2, 
  Volume2, 
  ListMusic, 
  HelpCircle, 
  Mic2,
  FileSpreadsheet,
  AlertCircle,
  X
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
import { getAudioFromCache, saveAudioToCache } from "./utils/audioCache";

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
          
          let friendly = "A cota diária ou limite de requisições de áudio por IA foi atingida temporariamente.";
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
    
    let friendly = "Cota diária ou limite de requisições de áudio por IA atingido temporariamente.";
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
  const [mobileActiveTab, setMobileActiveTab] = useState<"sources" | "config" | "script">("config");

  // Document states
  const [documents, setDocuments] = useState<SourceDocument[]>(() => {
    try {
      const saved = localStorage.getItem("podcast_documents");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((doc: any) => ({
          ...doc,
          addedAt: doc.addedAt ? new Date(doc.addedAt) : new Date()
        }));
      }
    } catch (e) {
      console.error("Error reading documents from localStorage:", e);
    }
    return INITIAL_DOCUMENTS;
  });

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(() => {
    return localStorage.getItem("podcast_selectedSourceId") || null;
  });

  // Configuration states
  const [host1, setHost1] = useState<HostConfig>(() => {
    try {
      const saved = localStorage.getItem("podcast_host1");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: "Thiago",
      voice: "Fenrir",
      toneDescription: "Curioso, calmo, menos enérgico, menos engraçado, focado em fazer analogias didáticas e simples"
    };
  });

  const [host2, setHost2] = useState<HostConfig>(() => {
    try {
      const saved = localStorage.getItem("podcast_host2");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: "Marina",
      voice: "Kore",
      toneDescription: "Especialista analítica, didática e muito complementar ao parceiro"
    };
  });

  const [tone, setTone] = useState<string>(() => {
    return localStorage.getItem("podcast_tone") || "Descontraído e Bem-humorado";
  });
  const [length, setLength] = useState<GenerationLength>(() => {
    return (localStorage.getItem("podcast_length") as GenerationLength) || "10_mins";
  });
  const [language, setLanguage] = useState<string>(() => {
    return localStorage.getItem("podcast_language") || "Português";
  });
  const [hasTtsQuotaError, setHasTtsQuotaError] = useState<boolean>(false);
  const [ttsQuotaErrorDetail, setTtsQuotaErrorDetail] = useState<string>("");
  const [userNotification, setUserNotification] = useState<{
    type: "error" | "warning" | "info";
    title: string;
    message: string;
  } | null>(null);

  // Script states
  const [scriptTitle, setScriptTitle] = useState(() => {
    return localStorage.getItem("podcast_scriptTitle") || "O Futuro do Aprendizado e do Trabalho";
  });
  const [scriptDescription, setScriptDescription] = useState(() => {
    return localStorage.getItem("podcast_scriptDescription") || "Thiago e Marina debatem o impacto revolucionário da inteligência artificial na educação e como a comunicação assíncrona está transformando carreiras remotas.";
  });
  const [script, setScript] = useState<PodcastScriptLine[]>(() => {
    try {
      const saved = localStorage.getItem("podcast_script");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [activeLineId, setActiveLineId] = useState<string | null>(() => {
    return localStorage.getItem("podcast_activeLineId") || null;
  });
  const [isPlaying, setIsPlaying] = useState(false);

  // Loaders
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [isSynthesizingAll, setIsSynthesizingAll] = useState(false);
  const [synthesizeAllProgress, setSynthesizeAllProgress] = useState({ current: 0, total: 0 });

  // Additional Metadata
  const [metadata, setMetadata] = useState<PodcastMetadata | null>(() => {
    try {
      const saved = localStorage.getItem("podcast_metadata");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

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

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("podcast_documents", JSON.stringify(documents));
    } catch (e) {}
  }, [documents]);

  useEffect(() => {
    if (documents.length > 0) {
      const exists = documents.some((d) => d.id === selectedSourceId);
      if (!exists) {
        setSelectedSourceId(documents[0].id);
      }
    } else {
      setSelectedSourceId(null);
    }
  }, [documents, selectedSourceId]);

  useEffect(() => {
    if (selectedSourceId) {
      localStorage.setItem("podcast_selectedSourceId", selectedSourceId);
    } else {
      localStorage.removeItem("podcast_selectedSourceId");
    }
  }, [selectedSourceId]);

  useEffect(() => {
    try {
      localStorage.setItem("podcast_host1", JSON.stringify(host1));
    } catch (e) {}
  }, [host1]);

  useEffect(() => {
    try {
      localStorage.setItem("podcast_host2", JSON.stringify(host2));
    } catch (e) {}
  }, [host2]);

  useEffect(() => {
    localStorage.setItem("podcast_tone", tone);
  }, [tone]);

  useEffect(() => {
    localStorage.setItem("podcast_length", length);
  }, [length]);

  useEffect(() => {
    localStorage.setItem("podcast_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("podcast_scriptTitle", scriptTitle);
  }, [scriptTitle]);

  useEffect(() => {
    localStorage.setItem("podcast_scriptDescription", scriptDescription);
  }, [scriptDescription]);

  useEffect(() => {
    try {
      localStorage.setItem("podcast_script", JSON.stringify(script));
    } catch (e) {}
  }, [script]);

  useEffect(() => {
    if (activeLineId) {
      localStorage.setItem("podcast_activeLineId", activeLineId);
    } else {
      localStorage.removeItem("podcast_activeLineId");
    }
  }, [activeLineId]);

  useEffect(() => {
    try {
      localStorage.setItem("podcast_metadata", metadata ? JSON.stringify(metadata) : "");
    } catch (e) {}
  }, [metadata]);

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
    
    // Find the selected document. If not found, use all documents as a fallback
    const selectedDoc = documents.find((d) => d.id === selectedSourceId);
    const sourcesToGenerate = selectedDoc ? [selectedDoc] : documents;

    setIsGeneratingScript(true);
    setMetadata(null); // Reset metadata on fresh generation
    stopPlayback();

    try {
      const res = await fetch("/api/podcast/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: sourcesToGenerate,
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
      
      // Inject unique IDs for speech turns and check for cached audio
      const scriptLines: PodcastScriptLine[] = await Promise.all(
        data.script.map(async (line: any, idx: number) => {
          const isHost1 = line.speaker.toLowerCase() === host1.name.toLowerCase() || 
                          line.speaker.toLowerCase().includes(host1.name.toLowerCase()) ||
                          line.speaker.toLowerCase() === "host 1";
          const voiceName = isHost1 ? host1.voice : host2.voice;
          const cached = await getAudioFromCache(line.text, voiceName);

          return {
            id: `line-${idx}-${Date.now()}`,
            speaker: line.speaker,
            text: line.text,
            isSynthesized: !!cached,
            isSynthesizing: false,
            audioBase64: cached || undefined
          };
        })
      );

      setScript(scriptLines);
      setActiveLineId(scriptLines[0]?.id || null);
    } catch (err: any) {
      const friendlyMsg = parseQuotaError(err.message || "");
      setUserNotification({
        type: "error",
        title: "Falha ao Gerar o Roteiro",
        message: friendlyMsg || "Não foi possível gerar o roteiro a partir das fontes fornecidas. Verifique a conexão e tente novamente."
      });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Synthesize a single line's audio (with IndexedDB Cache Optimization B)
  const synthesizeLine = async (lineId: string): Promise<string> => {
    // Find line details
    const lineIndex = script.findIndex((l) => l.id === lineId);
    if (lineIndex === -1) throw new Error("Linha não encontrada");
    const line = script[lineIndex];

    const isHost1 = line.speaker.toLowerCase() === host1.name.toLowerCase() || 
                    line.speaker.toLowerCase().includes(host1.name.toLowerCase()) ||
                    line.speaker.toLowerCase() === "host 1";
    
    const voiceName = isHost1 ? host1.voice : host2.voice;
    const toneInstruction = isHost1 ? host1.toneDescription : host2.toneDescription;

    // Check if audio is already present in state
    if (line.audioBase64 && line.isSynthesized) {
      return line.audioBase64;
    }

    // Check IndexedDB local audio cache first (0 tokens, 0 API quota)
    const cachedAudio = await getAudioFromCache(line.text, voiceName);
    if (cachedAudio) {
      updateLineState(lineId, { 
        isSynthesizing: false, 
        isSynthesized: true, 
        audioBase64: cachedAudio,
        error: undefined
      });
      return cachedAudio;
    }

    // Mark as synthesizing
    updateLineState(lineId, { isSynthesizing: true, error: undefined });

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
        throw new Error(data.error || "Erro de síntese de voz.");
      }

      // Save generated audio to IndexedDB cache for future instant reuse
      await saveAudioToCache(line.text, voiceName, data.audio);

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
      setUserNotification({
        type: "error",
        title: "Erro ao Exportar Áudio",
        message: "Ocorreu uma falha ao compilar o arquivo WAV consolidado. Tente novamente."
      });
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
      const friendlyMsg = parseQuotaError(err.message || "");
      setUserNotification({
        type: "error",
        title: "Erro ao Gerar Metadados",
        message: friendlyMsg || "Não foi possível gerar as Notas de Show e SEO do episódio."
      });
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-gray-50 flex flex-col font-sans select-none antialiased text-gray-800 lg:overflow-hidden">
      
      {/* Header Bar */}
      <header id="app-header" className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <div className="p-2 bg-gray-950 text-white rounded-xl shadow-md shadow-black/5 flex items-center justify-center shrink-0">
            <Mic2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-gray-900 truncate">AuraCast - Podcast Studio</h1>
              <span className="px-1.5 py-0.5 bg-violet-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-sm whitespace-nowrap">
                Estudo Inteligente 🎯
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-[9px] font-bold rounded-full whitespace-nowrap">
                Uso Pessoal & Concursos
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate sm:whitespace-normal">Gere áudio neural didático de alta retenção para plataformas e concursos públicos</p>
          </div>
        </div>

        {/* Top bar indicators */}
        <div className="hidden sm:flex items-center gap-4 text-[11px] font-medium text-gray-400 shrink-0">
          <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-gray-600">Serviço de Áudio Ativo</span>
          </div>
        </div>
      </header>

      {/* Mobile Workspace Segmented Navigation (visible on mobile < lg) */}
      <div id="mobile-workspace-nav" className="lg:hidden bg-white border-b border-gray-200/80 px-3 py-2 flex items-center justify-around gap-1 shrink-0 sticky top-0 z-30 shadow-xs">
        <button
          id="mobile-nav-sources"
          type="button"
          onClick={() => setMobileActiveTab("sources")}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileActiveTab === "sources"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FileSpreadsheet size={13} />
          <span>Fontes ({documents.length})</span>
        </button>
        <button
          id="mobile-nav-config"
          type="button"
          onClick={() => setMobileActiveTab("config")}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileActiveTab === "config"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Settings2 size={13} />
          <span>Ajustes</span>
        </button>
        <button
          id="mobile-nav-script"
          type="button"
          onClick={() => setMobileActiveTab("script")}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileActiveTab === "script"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Mic2 size={13} />
          <span>Roteiro ({script.length})</span>
        </button>
      </div>

      {/* User Notification Toast / Banner */}
      {userNotification && (
        <div
          id="user-notification-banner"
          className={`border-b px-6 py-3 flex items-center justify-between gap-3 text-xs font-medium shrink-0 shadow-sm transition-all ${
            userNotification.type === "error"
              ? "bg-red-50 border-red-200 text-red-900"
              : userNotification.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                userNotification.type === "error"
                  ? "bg-red-100 text-red-700"
                  : userNotification.type === "warning"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              <AlertCircle size={15} />
            </div>
            <div>
              <strong className="font-bold mr-1.5">{userNotification.title}:</strong>
              <span className="leading-relaxed">{userNotification.message}</span>
            </div>
          </div>
          <button
            id="btn-dismiss-user-notification"
            type="button"
            onClick={() => setUserNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-gray-500 hover:text-gray-900 transition-colors cursor-pointer shrink-0"
            title="Fechar notificação"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Quota Exceeded Friendly System Banner */}
      {hasTtsQuotaError && (
        <div id="tts-quota-warning-banner" className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-medium shrink-0 shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5 sm:mt-0">
              <Sparkles size={14} className="animate-pulse text-amber-600" />
            </div>
            <div>
              <strong className="font-bold text-amber-950 block sm:inline mr-1">Controle de Cota de Áudio Ativo:</strong> 
              <span className="text-amber-800 leading-relaxed">
                {ttsQuotaErrorDetail || "O limite do serviço para síntese de áudio foi temporariamente excedido. Aguarde alguns segundos para restabelecer a cota do modelo."}
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
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 pb-20 md:p-6 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* Left column: Sources Pane (Span 3) */}
        <section id="col-sources" className={`lg:col-span-3 min-h-0 h-[480px] lg:h-full ${mobileActiveTab === "sources" ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
          <DocumentManager
            documents={documents}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
            selectedSourceId={selectedSourceId}
            onSelectSource={setSelectedSourceId}
          />
        </section>

        {/* Column 2: Configurator & Exporters Tab Panel (Span 4) */}
        <section id="col-config" className={`lg:col-span-4 min-h-0 h-[480px] lg:h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${mobileActiveTab === "config" ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
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

        {/* Column 3: Interactive Script Viewer (Span 5) */}
        <section id="col-script" className={`lg:col-span-5 min-h-0 h-[520px] lg:h-full ${mobileActiveTab === "script" ? "flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
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
            hasTtsQuotaError={hasTtsQuotaError}
            ttsQuotaErrorDetail={ttsQuotaErrorDetail}
            onPlayPause={handlePlayPause}
            onPreviousLine={handlePreviousLine}
            onNextLine={handleNextLine}
          />
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
