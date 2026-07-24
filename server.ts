import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "50mb" }));

// Helper to format raw Gemini API and server errors into friendly user messages
function formatFriendlyErrorMessage(err: any): string {
  if (!err) return "Ocorreu um erro inesperado ao processar sua solicitação.";

  const rawMsg = typeof err === "string" ? err : err?.message || JSON.stringify(err);
  const lowerMsg = rawMsg.toLowerCase();

  // Missing or invalid GEMINI_API_KEY
  if (lowerMsg.includes("gemini_api_key") || lowerMsg.includes("chave gemini_api_key não foi configurada")) {
    return "A chave da API de IA não está configurada. Por favor, adicione a variável GEMINI_API_KEY no painel de configurações.";
  }

  // 429 Quota or Rate Limit
  if (
    lowerMsg.includes("429") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("resource_exhausted") ||
    lowerMsg.includes("limit") ||
    lowerMsg.includes("exceeded")
  ) {
    const retryMatch = rawMsg.match(/retry in ([\d.]+)\s*s/i);
    const retrySecs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
    if (retrySecs) {
      return `O limite de requisições da API de IA foi atingido. Por favor, aguarde cerca de ${retrySecs} segundos antes de tentar novamente.`;
    }
    return "O limite temporário de requisições ou cota da API de IA foi atingido. Por favor, aguarde alguns instantes e tente novamente.";
  }

  // Invalid API Key / Unauthorized
  if (
    lowerMsg.includes("api_key_invalid") ||
    lowerMsg.includes("invalid api key") ||
    lowerMsg.includes("unauthorized") ||
    lowerMsg.includes("401") ||
    lowerMsg.includes("403")
  ) {
    return "A chave da API de IA informada é inválida ou não possui permissão. Verifique a chave configurada.";
  }

  // Content Safety Filter
  if (lowerMsg.includes("safety") || lowerMsg.includes("blocked") || lowerMsg.includes("finish_reason_safety")) {
    return "O conteúdo fornecido foi bloqueado pelos filtros de segurança do serviço de IA. Por favor, revise os textos das fontes.";
  }

  // Service Unavailable / Server Overloaded
  if (
    lowerMsg.includes("503") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("overloaded") ||
    lowerMsg.includes("500")
  ) {
    return "Os servidores do serviço de IA estão temporariamente sobrecarregados ou indisponíveis. Por favor, tente novamente em alguns instantes.";
  }

  // URL Fetch Error
  if (lowerMsg.includes("falha ao carregar a página") || lowerMsg.includes("fetch url")) {
    return "Não foi possível acessar o conteúdo da URL informada. Verifique se o endereço está correto e publicamente acessível.";
  }

  // Return original clean string if short and plain text
  if (rawMsg.length < 180 && !rawMsg.includes("{") && !rawMsg.includes("ApiError") && !rawMsg.includes("http")) {
    return rawMsg;
  }

  return "Ocorreu uma falha ao comunicar com o serviço de inteligência artificial. Por favor, tente novamente.";
}

// Helper to lazily initialize the Gemini client with proper header telemetry
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "A chave GEMINI_API_KEY não foi configurada. Por favor, configure-a no painel Settings > Secrets do Google AI Studio."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to fetch web URL content
app.post("/api/fetch-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL é obrigatória" });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Falha ao carregar a página: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Very simple HTML text extractor to avoid heavy dependencies
    // Strips scripts, styles, and html tags
    let text = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit text length to prevent huge response
    if (text.length > 50000) {
      text = text.substring(0, 50000) + "... [Conteúdo truncado para otimização]";
    }

    res.json({ text });
  } catch (err: any) {
    console.error("Fetch URL error:", err);
    res.status(500).json({ error: formatFriendlyErrorMessage(err) });
  }
});

// Generate Podcast Script from sources and custom settings
app.post("/api/podcast/generate-script", async (req, res) => {
  try {
    const { sources, tone, host1, host2, length, language } = req.body;

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({ error: "É necessário fornecer pelo menos uma fonte de documento ou texto." });
    }

    const client = getGeminiClient();

    // Concatenate sources content with Smart Truncation & Token Optimization (1)
    const MAX_DOC_CHARS = 25000;
    const MAX_TOTAL_CHARS = 50000;

    let currentTotalChars = 0;
    const processedSources = sources.map((s, index) => {
      let content = (s.content || "").trim();
      if (content.length > MAX_DOC_CHARS) {
        const startChunk = content.slice(0, Math.floor(MAX_DOC_CHARS * 0.7));
        const endChunk = content.slice(-Math.floor(MAX_DOC_CHARS * 0.3));
        content = `${startChunk}\n\n[...CONTEÚDO INTERMEDIÁRIO RESUMIDO PARA ECONOMIA DE TOKENS...]\n\n${endChunk}`;
      }
      
      if (currentTotalChars + content.length > MAX_TOTAL_CHARS) {
        const remainingBudget = Math.max(1000, MAX_TOTAL_CHARS - currentTotalChars);
        content = content.slice(0, remainingBudget) + "\n\n[...FIM DO DOCUMENTO TRUNCADO PARA RESPEITAR LIMITE DE TOKENS...]";
      }
      currentTotalChars += content.length;

      return `[DOCUMENTO ${index + 1}: ${s.title || "Sem título"}]\n${content}`;
    });

    const sourceContentCombined = processedSources.join("\n\n");

    const getVoiceGender = (voice: string) => {
      return (voice === "Kore" || voice === "Zephyr") ? "Feminina" : "Masculina";
    };

    const lengthDesc = 
      length === "short" ? "curto e ultra-direto (cerca de 5 a 7 turnos de diálogo curtos - ideal para economia extrema de tokens)" :
      length === "long" ? "longo (cerca de 16 a 20 turnos de diálogo)" :
      length === "10_mins" ? "longo e muito aprofundado para simular 10 minutos de áudio (cerca de 30 a 40 turnos de diálogo)" :
      "médio (cerca de 9 a 13 turnos de diálogo)";

    let customTonePrompt = "";
    if (tone && (tone.includes("Concursos") || tone.includes("StratisPlanner"))) {
      customTonePrompt = `
- Como este episódio tem foco em Concursos Públicos, os apresentadores devem focar de forma extremamente didática na fixação de conceitos, regras, prazos, leis ou detalhes técnicos presentes nos documentos fornecidos.
- Devem usar técnicas de memorização ativa, sugerir mnemônicos eficientes, e simular "Pegadinhas de Banca" de concursos para alertar o ouvinte sobre o que é mais cobrado.
- Devem falar como dois concurseiros/professores experientes e focados em gabaritar a matéria.`;
    }

    const systemPrompt = `Você é um roteirista profissional de podcasts focado em criar diálogos extremamente naturais, envolventes e fluidos, idêntico ao estilo "Deep Dive" do NotebookLM.
Sua tarefa é ler todos os documentos fornecidos e criar um roteiro de podcast em formato de diálogo entre dois apresentadores.

ATENÇÃO IMPORTANTE PARA MÚLTIPLAS FONTES:
Se houver mais de uma fonte/documento fornecido (ex: Documento 1, Documento 2, etc.), você DEVE OBRIGATORIAMENTE fazer com que os apresentadores discutam, comparem, debatam e integrem os conceitos de TODAS as fontes fornecidas ao longo da conversa. Não se limite a falar apenas do primeiro documento; crie conexões e pontes lógicas entre todas as matérias e conteúdos fornecidos nas fontes para enriquecer o podcast.

Apresentadores:
1. ${host1.name}: apresentador principal (Voz ${getVoiceGender(host1.voice)}). Estilo/Tom de voz solicitado: ${host1.toneDescription || "Espontâneo, curioso, excelente em fazer analogias cotidianas."}
2. ${host2.name}: co-apresentador (Voz ${getVoiceGender(host2.voice)}). Estilo/Tom de voz solicitado: ${host2.toneDescription || "Especialista, complementar, traz fatos interessantes e aprofundados."}

Tom Geral do Podcast: ${tone || "Informativo e descontraído"}
Idioma do Podcast: ${language || "Português"}
Tamanho desejado: ${lengthDesc}
${customTonePrompt}

Instruções Cruciais de Roteiro:
- O diálogo deve parecer 100% natural. Use marcadores de fala humana: concordâncias curtas ("Hum", "Pois é!", "Exato!"), pequenas interrupções, risadas breves (indicadas no texto, ex: "(risos)"), e transições suaves.
- Eles não devem simplesmente ler o texto; eles devem debater, traduzir termos difíceis para analogias simples do dia a dia, se impressionar com dados e fazer perguntas um para o outro.
- Evite monólogos longos. A conversa deve ir e voltar rapidamente (estilo pingue-pongue).
- Mantenha a fidelidade aos fatos e informações contidos nos documentos fornecidos. Não invente dados falsos, mas sinta-se livre para estruturar a conversa da forma mais didática possível.
- O resultado DEVE ser um objeto JSON estruturado com o título do episódio, uma breve descrição e a lista de falas (script), onde cada fala possui o 'speaker' (exatamente "${host1.name}" ou "${host2.name}") e o 'text' (a fala em si).`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Aqui estão as fontes originais que você deve usar para basear o episódio do podcast:\n\n${sourceContentCombined}\n\nPor favor, crie o roteiro do podcast agora seguindo o plano de apresentadores (${host1.name} e ${host2.name}) e o tom especificado.`
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título criativo e chamativo para o episódio de podcast." },
            description: { type: Type.STRING, description: "Uma descrição atraente do episódio que resume os principais pontos debatidos." },
            script: {
              type: Type.ARRAY,
              description: "Lista ordenada das falas do roteiro do podcast.",
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING, description: `O nome exato de quem fala, obrigatoriamente sendo "${host1.name}" ou "${host2.name}".` },
                  text: { type: Type.STRING, description: "O conteúdo da fala, escrito de forma extremamente humana, oral e natural no idioma selecionado." }
                },
                required: ["speaker", "text"]
              }
            }
          },
          required: ["title", "description", "script"]
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Não foi possível gerar o roteiro a partir do modelo.");
    }

    const parsedJson = JSON.parse(textResponse);
    res.json(parsedJson);
  } catch (err: any) {
    console.error("Generate script error:", err);
    res.status(500).json({ error: formatFriendlyErrorMessage(err) });
  }
});

// Synthesize a single text chunk into audio
app.post("/api/podcast/synthesize-chunk", async (req, res) => {
  try {
    const { text, voiceName, toneInstruction } = req.body;
    if (!text) {
      return res.status(400).json({ error: "O texto é obrigatório para realizar a síntese." });
    }

    const client = getGeminiClient();

    // Prompting Gemini TTS
    // Note: We can convey the tone by formatting the text with expressive instructions if needed,
    // or just let Gemini TTS synthesize the natural speech of the text directly.
    const promptText = toneInstruction 
      ? `[Fale de forma ${toneInstruction}] ${text}` 
      : text;

    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Não foi possível gerar áudio a partir do serviço de voz.");
    }

    // Return the 24kHz raw PCM little-endian base64 audio
    res.json({ audio: base64Audio });
  } catch (err: any) {
    console.error("Synthesis error:", err);
    res.status(500).json({ error: formatFriendlyErrorMessage(err) });
  }
});

// Generate show notes, metadata, and simulated direct export options
app.post("/api/podcast/generate-metadata", async (req, res) => {
  try {
    const { title, description, script } = req.body;

    if (!title || !script) {
      return res.status(400).json({ error: "Dados incompletos para gerar metadados." });
    }

    const client = getGeminiClient();

    const prompt = `Gere os metadados de distribuição e publicação para o seguinte podcast.
Título do Podcast: ${title}
Descrição: ${description}

Precisamos estruturar os seguintes campos em formato JSON:
1. tags: lista de 5 palavras-chave relevantes para SEO e classificação.
2. showNotes: Notas do Show ricas em formato de TEXTO PURO LIMPO (SEM MARKDOWN, NÃO USE ASTERISCOS '**' OU CERQUILHAS '#'). Contendo uma introdução polida, resumo dos principais tópicos abordados em bullet points simples usando o hífen ('-'), e um encerramento padrão convidando os ouvintes a assinarem o canal.
3. chapterMarkers: uma lista de marcadores de capítulos estimados de forma lógica baseados no script fornecido. Cada capítulo deve conter um timestamp de início estimado e um título descritivo curto.
4. topicsUsed: uma lista de 3 a 5 principais temas, tópicos de estudo, leis, matérias ou assuntos discutidos/abordados no episódio.

Script resumido para contexto:\n${JSON.stringify(script.slice(0, 15))}...`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            showNotes: { type: Type.STRING, description: "Show notes polidas contendo resumo e créditos em TEXTO PURO, SEM MARKDOWN (NÃO utilize caracteres como '**', '*' ou '#')." },
            chapterMarkers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING, description: "Timestamp estimado, ex: '00:00', '00:45'." },
                  title: { type: Type.STRING, description: "Título do capítulo." }
                },
                required: ["timestamp", "title"]
              }
            },
            topicsUsed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 3 a 5 tópicos principais abordados na conversa."
            }
          },
          required: ["tags", "showNotes", "chapterMarkers", "topicsUsed"]
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Não foi possível gerar os metadados adicionais.");
    }

    const parsedData = JSON.parse(textResponse);
    if (parsedData.showNotes) {
      parsedData.showNotes = parsedData.showNotes
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/^#+\s+/gm, "")
        .replace(/#+/g, "");
    }

    res.json(parsedData);
  } catch (err: any) {
    console.error("Metadata generation error:", err);
    res.status(500).json({ error: formatFriendlyErrorMessage(err) });
  }
});

// -------------------------------------------------------------
// Vite and Static File Middleware Setup
// -------------------------------------------------------------
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    // In development mode, mount the Vite development server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PODCAST STUDIO SERVER] Running on http://localhost:${PORT}`);
  });
}

bootstrap();
