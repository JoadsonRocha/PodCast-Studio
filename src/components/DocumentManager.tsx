import React, { useState, useRef } from "react";
import { 
  FileText, 
  Link as LinkIcon, 
  Upload, 
  Trash2, 
  Plus, 
  Loader2, 
  CheckCircle2,
  FileDown,
  AlertCircle
} from "lucide-react";
import { SourceDocument } from "../types";

// Dynamic loader for PDF.js to support client-side PDF parsing
const loadPdfJs = async (): Promise<any> => {
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = (err) => reject(new Error("Falha ao carregar a biblioteca de processamento de PDFs (PDF.js)."));
    document.head.appendChild(script);
  });
};

const extractTextFromPdf = async (file: File): Promise<string> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
};

interface DocumentManagerProps {
  documents: SourceDocument[];
  onAddDocument: (doc: Omit<SourceDocument, "id" | "addedAt">) => void;
  onRemoveDocument: (id: string) => void;
  selectedSourceId: string | null;
  onSelectSource: (id: string) => void;
}

export default function DocumentManager({
  documents,
  onAddDocument,
  onRemoveDocument,
  selectedSourceId,
  onSelectSource,
}: DocumentManagerProps) {
  const [activeTab, setActiveTab] = useState<"text" | "url" | "file">("text");
  
  // Custom text states
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  // URL states
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");

  // Add custom text
  const handleAddText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) return;
    
    onAddDocument({
      type: "text",
      title: textTitle.trim() || `Nota de Texto (${new Date().toLocaleTimeString()})`,
      content: textContent,
      charCount: textContent.length,
    });

    setTextTitle("");
    setTextContent("");
  };

  // Import from URL
  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUrlLoading(true);
    setUrlError("");

    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao extrair dados do site.");
      }

      // Extract hostname for title
      let domain = "Link Web";
      try {
        domain = new URL(urlInput).hostname;
      } catch (_) {}

      onAddDocument({
        type: "url",
        title: `Artigo: ${domain}`,
        content: data.text,
        url: urlInput.trim(),
        charCount: data.text.length,
      });

      setUrlInput("");
    } catch (err: any) {
      setUrlError(err.message || "Erro ao carregar link.");
    } finally {
      setUrlLoading(false);
    }
  };

  // Handle local file read
  const processFile = async (file: File) => {
    setFileLoading(true);
    setFileError("");

    // Security/User Error check: size limit of 10MB to prevent crashes
    if (file.size > 10 * 1024 * 1024) {
      setFileError("O arquivo é muito grande. O limite máximo permitido para importação é de 10 MB.");
      setFileLoading(false);
      return;
    }

    if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
      try {
        const text = await extractTextFromPdf(file);
        if (!text || !text.trim()) {
          throw new Error("O PDF está em branco ou possui apenas imagens escaneadas sem texto extraível.");
        }

        onAddDocument({
          type: "text",
          title: file.name,
          content: text.trim(),
          charCount: text.length,
        });
      } catch (err: any) {
        setFileError(err.message || "Erro ao ler ou processar o arquivo PDF. Verifique se o arquivo não está corrompido.");
      } finally {
        setFileLoading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content || !content.trim()) {
          setFileError("O arquivo enviado está vazio.");
          setFileLoading(false);
          return;
        }

        onAddDocument({
          type: "text",
          title: file.name,
          content: content.trim(),
          charCount: content.length,
        });
        setFileLoading(false);
      };
      reader.onerror = () => {
        setFileError("Erro ao ler o arquivo de texto.");
        setFileLoading(false);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input value to allow uploading the same file again
    if (e.target) {
      e.target.value = "";
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="document-manager" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Tab Selectors */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 p-1 gap-1">
        <button
          id="tab-btn-text"
          type="button"
          onClick={() => { setActiveTab("text"); setUrlError(""); setFileError(""); }}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "text"
              ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <FileText size={14} />
          Escrever Texto
        </button>
        <button
          id="tab-btn-url"
          type="button"
          onClick={() => { setActiveTab("url"); setUrlError(""); setFileError(""); }}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "url"
              ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <LinkIcon size={14} />
          Importar URL
        </button>
        <button
          id="tab-btn-file"
          type="button"
          onClick={() => { setActiveTab("file"); setUrlError(""); setFileError(""); }}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "file"
              ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Upload size={14} />
          Enviar Arquivo
        </button>
      </div>

      {/* Forms and Inputs */}
      <div className="p-4 border-b border-gray-100">
        {activeTab === "text" && (
          <form id="form-add-text" onSubmit={handleAddText} className="space-y-3">
            <div>
              <input
                id="input-text-title"
                type="text"
                placeholder="Título do Documento (opcional)"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <textarea
                id="textarea-text-content"
                rows={3}
                required
                placeholder="Cole as informações, notas de palestras, matérias de estudo ou resumos aqui para usar de fonte..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400 font-sans resize-none"
              />
            </div>
            <button
              id="btn-submit-text"
              type="submit"
              disabled={!textContent.trim()}
              className="w-full py-2 text-xs font-semibold bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              Adicionar Fonte
            </button>
          </form>
        )}

        {activeTab === "url" && (
          <form id="form-import-url" onSubmit={handleImportUrl} className="space-y-3">
            <div>
              <input
                id="input-url"
                type="url"
                required
                placeholder="https://exemplo.com/artigo-interessante"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
              />
            </div>
            {urlError && (
              <p id="url-error-msg" className="text-xs text-red-500 bg-red-50 p-2 rounded-md font-medium">
                {urlError}
              </p>
            )}
            <button
              id="btn-submit-url"
              type="submit"
              disabled={urlLoading || !urlInput.trim()}
              className="w-full py-2 text-xs font-semibold bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {urlLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Rastreando e Extraindo...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Importar Conteúdo do Link
                </>
              )}
            </button>
          </form>
        )}

        {activeTab === "file" && (
          <div className="space-y-3">
            <div
              id="file-drop-zone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-gray-900 bg-gray-50/50"
                  : "border-gray-200 hover:border-gray-400 hover:bg-gray-50/20"
              }`}
            >
              <input
                id="file-picker"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.md,.json,.html,.pdf"
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-2.5 bg-gray-50 rounded-lg text-gray-400">
                  {fileLoading ? (
                    <Loader2 size={20} className="animate-spin text-gray-900" />
                  ) : (
                    <FileDown size={20} />
                  )}
                </div>
                <div className="text-xs font-semibold text-gray-700">
                  {fileLoading ? "Processando e extraindo texto..." : "Arraste ou clique para enviar"}
                </div>
                <p className="text-[10px] text-gray-400">
                  Suporta arquivos de texto (.txt, .md, .html) e Documentos PDF (.pdf) até 10MB
                </p>
              </div>
            </div>

            {fileError && (
              <div id="file-error-msg" className="text-xs text-red-600 bg-red-50 p-3 rounded-lg font-medium flex items-start gap-2 border border-red-100">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sources list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
        <h3 id="sources-title" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
          Fontes Adicionadas ({documents.length})
        </h3>
        {documents.length > 1 && (
          <p className="text-[10px] text-gray-400 mb-3 leading-tight">
            Selecione qual fonte usar para gerar o roteiro clicando nela:
          </p>
        )}
        {documents.length === 1 && (
          <p className="text-[10px] text-gray-400 mb-3 leading-tight">
            Esta fonte ativa será usada para gerar o roteiro:
          </p>
        )}

        {documents.length === 0 ? (
          <div id="sources-empty-state" className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 mt-2">
            <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
              Adicione textos, links ou artigos para servir de base para os apresentadores.
            </p>
          </div>
        ) : (
          <div id="sources-list" className="space-y-2 flex-1 mt-1">
            {documents.map((doc) => {
              const isSelected = doc.id === selectedSourceId;
              return (
                <div
                  id={`source-${doc.id}`}
                  key={doc.id}
                  onClick={() => onSelectSource(doc.id)}
                  className={`group flex items-start justify-between p-3 border rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? "border-violet-600 bg-violet-50/30 shadow-sm ring-1 ring-violet-600/20"
                      : "border-gray-100 hover:border-gray-300 bg-white hover:shadow-sm"
                  }`}
                >
                  <div className="flex gap-2.5 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 flex items-center justify-center ${
                      isSelected ? "bg-violet-100 text-violet-600" : "bg-gray-50 text-gray-500"
                    }`}>
                      {doc.type === "url" ? <LinkIcon size={14} /> : <FileText size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-semibold truncate ${
                          isSelected ? "text-violet-900" : "text-gray-900"
                        }`} title={doc.title}>
                          {doc.title}
                        </p>
                        {isSelected && (
                          <span className="shrink-0 flex items-center justify-center text-violet-600">
                            <CheckCircle2 size={12} className="fill-violet-50" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium flex items-center gap-1.5">
                        <span>{(doc.charCount / 1000).toFixed(1)}k caracteres</span>
                        <span>•</span>
                        <span className="capitalize">{doc.type}</span>
                        {isSelected && (
                          <>
                            <span>•</span>
                            <span className="text-violet-600 font-bold uppercase tracking-wider text-[8px]">Ativa</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    id={`btn-remove-source-${doc.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveDocument(doc.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all self-center cursor-pointer shrink-0 ml-1"
                    title="Remover fonte"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
