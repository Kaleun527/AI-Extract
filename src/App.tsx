/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Search, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Cpu, 
  Key, 
  Trash2, 
  FileJson,
  Zap,
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

/**
 * AI.Extract - Ein modernes Werkzeug zur automatisierten Datenextraktion.
 * Dieses Projekt nutzt die Google Gemini AI (Multimodal), um Bildinhalte zu verstehen
 * und direkt in ein maschinenlesbares JSON-Format zu transformieren.
 */

// Einfache Komponente für das Syntax-Highlighting von JSON-Code.
// Nutzt reguläre Ausdrücke, um Schlüssel, Strings und Zahlen farblich hervorzuheben.
const SyntaxHighlightedJson = ({ json }: { json: string }) => {
  const highlight = (str: string) => {
    return str
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'json-highlight-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-highlight-key';
          } else {
            cls = 'json-highlight-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-highlight-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-highlight-null';
        }
        return `<span class="${cls}">${match}</span>`;
      });
  };

  return (
    <pre 
      className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"
      dangerouslySetInnerHTML={{ __html: highlight(json) }}
    />
  );
};

export default function App() {
  const [apiKey, setApiKey] = useState(process.env.GEMINI_API_KEY || '');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawResult, setRawResult] = useState<string | null>(null);
  const [editableResult, setEditableResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isRawCopied, setIsRawCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Bitte laden Sie eine Bilddatei hoch.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setRawResult(null);
      setEditableResult('');
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const startAnalysis = async () => {
    if (!apiKey) {
      setError('Bitte geben Sie einen gültigen Gemini API-Key ein.');
      return;
    }
    if (!image) {
      setError('Bitte wählen Sie zuerst ein Bild aus.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.split(',')[1];
      
      // API-Aufruf an das Gemini-Modell. 
      // Wir übergeben sowohl das Bild als auch einen präzisen Prompt für die JSON-Struktur.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            },
            {
              text: "Examine this image and extract all relevant data into a clean, structured JSON format. Return ONLY the JSON object, no conversational text or markdown blocks.",
            },
          ],
        },
      });

      const text = response.text || '';
      // Entfernen von Markdown-Code-Blöcken (z.B. ```json ... ```), 
      // falls das Modell diese trotz Anweisung mitgeliefert hat.
      const sanitized = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(sanitized);
        const formatted = JSON.stringify(parsed, null, 2);
        setRawResult(formatted);
        setEditableResult(formatted);
      } catch (e) {
        setRawResult(sanitized); // Fallback auf Rohtext, falls das JSON ungültig ist
        setEditableResult(sanitized);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Fehler bei der Analyse: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, type: 'raw' | 'editable') => {
    if (text) {
      navigator.clipboard.writeText(text);
      if (type === 'raw') {
        setIsRawCopied(true);
        setTimeout(() => setIsRawCopied(false), 2000);
      } else {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  const reset = () => {
    setImage(null);
    setRawResult(null);
    setEditableResult('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col font-sans">
      {/* Header Navigation */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-slate-800/50 bg-[#09090b]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white tracking-tighter">AI</div>
          <span className="text-xl font-semibold tracking-tight text-white font-display">AI.Extract</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Gemini API Schlüssel</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs px-3 py-2 rounded-md w-64 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600" 
              placeholder="API Key eingeben..." 
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-10 pt-8 pb-4">
        <h1 className="text-4xl font-bold text-white tracking-tight font-display">Bild-zu-JSON Konvertierung</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">Extrahieren Sie strukturierte Daten aus Belegen, Dokumenten oder Tabellen mit modernster KI-Technologie in Millisekunden.</p>
      </section>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 pb-6 overflow-hidden">
        
        {/* Column 1: Upload & Preview (Small) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2 text-slate-400">
            <ImageIcon className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Upload & Vorschau</span>
          </div>
          
          <div 
            className={`
              relative rounded-xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-4 overflow-hidden group min-h-[200px]
              ${image ? 'border-blue-600/30 bg-slate-900/50' : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'}
            `}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <AnimatePresence mode="wait">
              {!image ? (
                <motion.div 
                  key="upload-prompt"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-blue-500 mb-3" />
                  <h3 className="text-sm font-medium text-white mb-1 font-display">Drop oder Klick</h3>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] rounded-full transition-colors border border-slate-700 text-slate-300"
                  >
                    Bild auswählen
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
                </motion.div>
              ) : (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative w-full aspect-square flex items-center justify-center"
                >
                  <img src={image} alt="Preview" className="max-w-full max-h-[180px] rounded-lg shadow-xl object-contain border border-slate-800" />
                  <button 
                    onClick={reset}
                    className="absolute top-0 right-0 p-1.5 bg-slate-900/80 backdrop-blur-md rounded-lg text-white hover:bg-red-500/80 transition-all border border-slate-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            disabled={isAnalyzing || !image}
            onClick={startAnalysis}
            className={`
              w-full py-3 rounded-lg font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98]
              ${isAnalyzing 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : image 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
            `}
          >
            {isAnalyzing ? (
              <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Analyse starten
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-[10px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Column 2: KI-Rohdaten (Read-Only) */}
        <section className="bg-[#0f0f13] border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl min-h-[400px]">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">KI-Rohdaten</span>
            {rawResult && (
              <button 
                onClick={() => copyToClipboard(rawResult, 'raw')}
                className="flex items-center gap-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold uppercase rounded transition-colors text-slate-300"
              >
                {isRawCopied ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                {isRawCopied ? 'Kopiert' : 'Kopieren'}
              </button>
            )}
          </div>
          <div className="p-4 flex-1 overflow-auto relative font-mono text-xs">
            {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <div className="w-10 h-10 border-2 border-blue-500 rounded-full border-t-transparent animate-spin" />
                <p className="text-slate-500 text-[10px]">Lade Daten...</p>
              </div>
            ) : rawResult ? (
              <SyntaxHighlightedJson json={rawResult} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-20">
                <FileJson className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-[10px] text-slate-500">Warte auf Analyse...</p>
              </div>
            )}
          </div>
        </section>

        {/* Column 3: JSON-Editor (Editable) */}
        <section className="bg-[#0f0f13] border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl min-h-[400px]">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">JSON Editor (Anpassbar)</span>
            <button 
              disabled={!editableResult}
              onClick={() => copyToClipboard(editableResult, 'editable')}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-300 text-[9px] font-bold uppercase
                ${!editableResult 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : isCopied 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'}
              `}
            >
              {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {isCopied ? '✅ Kopiert!' : 'Finales JSON kopieren'}
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <textarea
              className="w-full h-full bg-transparent text-xs font-mono text-blue-300 resize-none focus:outline-none placeholder:text-slate-700 selection:bg-blue-600/30 selection:text-white"
              placeholder="Hier können Sie das JSON manuell bearbeiten..."
              value={editableResult}
              onChange={(e) => setEditableResult(e.target.value)}
              spellCheck={false}
            />
          </div>
        </section>
      </main>

      {/* Status Footer */}
      <footer className="px-10 py-3 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between text-[10px] font-medium text-slate-500 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-green-500' : 'bg-red-500'}`}></span>
            AI.Extract {apiKey ? 'Verbunden' : 'Getrennt'}
          </span>
          <span>Modus: Extraktion</span>
        </div>
        <span>Prüfungsabgabe v1.0.4</span>
      </footer>
    </div>
  );
}
