"use client";
import { useState } from "react";
import { Upload, Send, FileText, Loader2, Bot, User } from "lucide-react";

export default function NotebookLM() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);

  // Function to handle PDF Ingestion [cite: 7, 11]
  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: data });
      if (res.ok) {
        setChat([{ role: "assistant", content: "Document indexed successfully! You can now ask questions grounded in its content." }]);
      }
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Function to handle Retrieval & Generation [cite: 12, 13]
  const handleChat = async () => {
    if (!query) return;
    const newChat = [...chat, { role: "user", content: query }];
    setChat(newChat);
    setQuery("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      setChat([...newChat, { role: "assistant", content: data.answer }]);
    } catch (error) {
      console.error("Chat failed", error);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans">
      {/* Sidebar for Document Ingestion [cite: 10, 17] */}
      <div className="w-80 bg-[#1e293b] p-6 border-r border-slate-700 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Bot size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Notebook AI</h1>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Upload Source (PDF)</label>
            <input 
              type="file" 
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer"
            />
          </div>

          <button 
            onClick={handleUpload}
            disabled={isUploading || !file}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 p-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all shadow-lg shadow-blue-900/20"
          >
            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            Process Document
          </button>
        </div>

        <div className="mt-auto p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-xs text-slate-500 leading-relaxed">
            Answers are grounded strictly in the uploaded document to prevent hallucinations. [cite: 14, 21]
          </p>
        </div>
      </div>

      {/* Main Conversation Area [cite: 6, 12] */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-700 flex items-center px-8 bg-[#0f172a]/80 backdrop-blur-md">
          <p className="text-sm text-slate-400">Grounded Q&A Pipeline Active</p>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {chat.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <FileText size={48} strokeWidth={1} />
              <p>Upload a document to start the conversation</p>
            </div>
          )}
          {chat.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[70%] p-4 rounded-2xl leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#1e293b] border border-slate-700 rounded-tl-none'}`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar [cite: 12] */}
        <div className="p-8 pt-0">
          <div className="max-w-4xl mx-auto relative group">
            <input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              className="w-full bg-[#1e293b] border border-slate-700 rounded-2xl p-5 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
              placeholder="Ask a natural language question about the content..."
            />
            <button 
              onClick={handleChat} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300 transition-colors p-2"
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}