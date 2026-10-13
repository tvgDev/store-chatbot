"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Search,
  ArrowRight,
  Sparkles,
  Loader2,
  Package,
  RotateCcw,
  X,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Laptop,
  Headphones,
  Monitor,
  Keyboard,
  HardDrive,
  Flame,
  ChevronRight,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  description: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Smartphones: <Smartphone className="w-3.5 h-3.5" />,
  Notebooks: <Laptop className="w-3.5 h-3.5" />,
  Áudio: <Headphones className="w-3.5 h-3.5" />,
  Monitores: <Monitor className="w-3.5 h-3.5" />,
  Periféricos: <Keyboard className="w-3.5 h-3.5" />,
  Armazenamento: <HardDrive className="w-3.5 h-3.5" />,
  "Mobiliário Gamer": <Flame className="w-3.5 h-3.5" />,
};

const SUGGESTIONS = [
  "Tem o iPhone 15 Pro Max?",
  "Quantos Galaxy S24 Ultra vocês têm em estoque?",
  "Qual o valor do MacBook Air M2?",
  "Quais fones com cancelamento de ruído vocês têm?",
  "Tem monitor gamer 144Hz para pronta entrega?",
  "Qual o item mais barato da loja?",
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [inventoryList, setInventoryList] = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega produtos do estoque
  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        if (data.products) setInventoryList(data.products);
      })
      .catch((err) => console.error("Falha ao carregar estoque:", err));
  }, []);

  // Rola automaticamente para o fim da conversa
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    let hasCreatedAssistantMessage = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha na resposta da API`);
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedContent = "";
        let providerName = "Google Gemini";
        let modelName = "gemini-3.5-flash";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            let event = "message";
            let dataStr = "";

            const eventMatch = trimmed.match(/^event:\s*(.+)$/m);
            if (eventMatch) event = eventMatch[1].trim();

            const dataMatch = trimmed.match(/^data:\s*(.+)$/m);
            if (dataMatch) dataStr = dataMatch[1].trim();

            if (event === "meta") {
              try {
                const meta = JSON.parse(dataStr);
                if (meta.provider) providerName = meta.provider;
                if (meta.model) modelName = meta.model;
              } catch {}
            } else if (event === "chunk") {
              try {
                const chunkData = JSON.parse(dataStr);
                const chunkText = chunkData.text || "";
                accumulatedContent += chunkText;

                if (!hasCreatedAssistantMessage) {
                  hasCreatedAssistantMessage = true;
                  setIsLoading(false);
                  const newMsg: Message = {
                    id: assistantId,
                    role: "assistant",
                    content: accumulatedContent,
                    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                    provider: providerName,
                    model: modelName,
                  };
                  setMessages((prev) => [...prev, newMsg]);
                } else {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, content: accumulatedContent, provider: providerName, model: modelName }
                        : msg
                    )
                  );
                }
              } catch {}
            }
          }
        }
      } else {
        const data = await response.json();
        const assistantMessage: Message = {
          id: assistantId,
          role: "assistant",
          content: data.reply || "Não consegui obter uma resposta para essa pergunta no momento.",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          provider: data.provider || "Google Gemini",
          model: data.model || "gemini-3.5-flash",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: unknown) {
      console.error("Erro na comunicação:", err);
      if (!hasCreatedAssistantMessage) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "⚠️ Ocorreu uma instabilidade na comunicação com o servidor de IA. Por favor, tente novamente.",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          provider: "Sistema",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setInput("");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Categorias únicas
  const categories = useMemo(() => {
    const list = Array.from(new Set(inventoryList.map((p) => p.category)));
    return ["Todos", ...list];
  }, [inventoryList]);

  // Produtos filtrados no modal
  const filteredProducts = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    return inventoryList.filter((item) => {
      const matchCat = selectedCategory === "Todos" || item.category === selectedCategory;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [inventoryList, selectedCategory, catalogSearch]);

  return (
    <div className="flex flex-col h-[100dvh] bg-black selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Cinematic Background Glows (Estilo Chatbot-Film) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-600/15 blur-[140px]" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute top-[40%] right-[25%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      {/* Header Fixo Transparente com Gradiente */}
      <header className="fixed top-0 w-full z-40 bg-gradient-to-b from-black via-black/80 to-transparent pt-6 pb-12 px-6 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <BrandLogo size={42} />
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase drop-shadow-md">
              Tech<span className="text-indigo-400">Store</span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Atendimento Oficial • Estoque em Tempo Real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botão de Ver Catálogo */}
          <button
            onClick={() => setIsCatalogOpen(true)}
            id="btn-open-catalog"
            className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold text-zinc-200 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <Package className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Catálogo</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
              {inventoryList.length}
            </span>
          </button>

          {/* Botão de Limpar Conversa */}
          {messages.length > 0 && (
            <button
              onClick={handleResetChat}
              id="btn-reset-chat"
              title="Nova conversa"
              className="p-2 rounded-full text-zinc-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 backdrop-blur-md transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Área Principal de Mensagens */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-28 pb-40 px-4 md:px-8 scrollbar-hide">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Hero / Empty State Central (Estilo Chatbot-Film) */}
          {messages.length === 0 && (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center relative z-10 px-4">
              {/* Marquee Sutil em Fundo com Máscara Radial */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.06] flex flex-col gap-3 justify-center items-center overflow-hidden"
                style={{
                  WebkitMaskImage: "radial-gradient(circle, black 35%, transparent 75%)",
                  maskImage: "radial-gradient(circle, black 35%, transparent 75%)",
                }}
              >
                {[
                  "Samsung Galaxy S24 Ultra • Apple iPhone 15 Pro Max • Dell XPS 14",
                  "Sony WH-1000XM5 • LG UltraGear 27\" 144Hz • Keychron K2 RGB",
                  "Apple MacBook Air M2 • Logitech MX Master 3S • HyperX Cloud II",
                ].map((row, i) => (
                  <motion.div
                    key={i}
                    className="text-xs md:text-sm font-mono tracking-widest text-white whitespace-nowrap"
                    initial={{ x: i % 2 === 0 ? "0%" : "-30%" }}
                    animate={{ x: i % 2 === 0 ? "-30%" : "0%" }}
                    transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
                  >
                    {Array(4).fill(row).join("  •  ")}
                  </motion.div>
                ))}
              </div>

              {/* Conteúdo Central Hero */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="z-10 flex flex-col items-center justify-center max-w-xl mx-auto"
              >
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-600 tracking-tighter drop-shadow-2xl mb-4">
                  Tech<span className="text-indigo-500">Store</span>
                </h2>
                <p className="text-zinc-400 text-sm md:text-base font-medium leading-relaxed drop-shadow-md mb-8 max-w-md">
                  Pergunte sobre disponibilidade em estoque, especificações ou valores oficiais de qualquer produto da loja.
                </p>

                {/* Sugestões Rápidas em Pílulas */}
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                  {SUGGESTIONS.map((item, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleSendMessage(item)}
                      className="px-4 py-2 rounded-full text-xs font-medium text-zinc-300 bg-zinc-900/80 hover:bg-indigo-600/20 hover:text-indigo-200 border border-white/10 hover:border-indigo-500/40 backdrop-blur-md transition-all shadow-md"
                    >
                      {item}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {/* Lista de Mensagens do Chat */}
          <AnimatePresence>
            {messages.map((m) => {
              const isUser = m.role === "user";

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`w-full ${isUser ? "flex justify-end" : "flex justify-start"}`}>
                    {/* Mensagem do Usuário (Pílula Glass Estilo Chatbot-Film) */}
                    {isUser ? (
                      <div className="bg-white/10 backdrop-blur-md text-white px-6 py-3.5 rounded-full text-[15px] font-medium border border-white/10 shadow-lg shadow-black/40 max-w-[85%] break-words">
                        {m.content}
                      </div>
                    ) : (
                      /* Mensagem do Assistente (Tipografia Limpa e Elegante) */
                      <div className="w-full text-zinc-300 space-y-3">
                        <div className="prose prose-invert max-w-none text-[15px] leading-relaxed whitespace-pre-wrap">
                          <ReactMarkdown
                            components={{
                              strong: ({ ...props }) => (
                                <strong className="text-white font-semibold" {...props} />
                              ),
                              ul: ({ ...props }) => (
                                <ul className="list-disc pl-5 space-y-1.5 my-2.5" {...props} />
                              ),
                              li: ({ ...props }) => <li className="text-zinc-200" {...props} />,
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>

                        {/* Rodapé da Resposta */}
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1">
                          <span>{m.timestamp}</span>

                          {m.provider && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5 font-mono">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                              {m.provider} {m.model ? `• ${m.model}` : ""}
                            </span>
                          )}

                          <button
                            onClick={() => copyToClipboard(m.content, m.id)}
                            className="hover:text-zinc-300 transition-colors ml-auto p-1 rounded"
                            title="Copiar resposta"
                          >
                            {copiedId === m.id ? (
                              <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                                <Check className="w-3 h-3" /> Copiado
                              </span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading do Assistente */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-zinc-400 text-sm py-2"
            >
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span className="text-xs font-medium text-zinc-400">
                Consultando estoque oficial da TechStore...
              </span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Flutuante no Rodapé (Exatamente como Chatbot-Film) */}
      <div className="fixed bottom-0 w-full bg-gradient-to-t from-black via-black/85 to-transparent pb-8 pt-24 px-4 pointer-events-none z-40">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-indigo-950/30 focus-within:border-indigo-500/50 focus-within:shadow-indigo-950/50 transition-all duration-300 overflow-hidden"
          >
            <div className="pl-6 text-zinc-400">
              <Search className="w-5 h-5" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="O que você procura hoje? (Ex: Tem iPhone 15 Pro Max? Quantos tem?)"
              className="w-full bg-transparent text-white px-4 py-4.5 outline-none placeholder:text-zinc-500 text-[15px]"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="mr-2 p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </form>

          <p className="text-center text-[10px] uppercase tracking-widest text-zinc-600 mt-4 font-semibold">
            TechStore • Atendimento Virtual e Consulta de Estoque
          </p>
        </div>
      </div>

      {/* Modal / Gaveta do Catálogo de Produtos */}
      <AnimatePresence>
        {isCatalogOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setIsCatalogOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl h-[85vh] bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header do Modal */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-3.5">
                  <BrandLogo size={40} />
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Estoque Oficial TechStore
                    </h2>
                    <p className="text-xs text-zinc-400">
                      {inventoryList.length} produtos disponíveis no catálogo
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCatalogOpen(false)}
                  className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Busca Full-Width e Categorias */}
              <div className="p-5 border-b border-white/10 bg-black/40 space-y-3.5">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar no estoque por produto, marca ou categoria..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-inner"
                  />
                  {catalogSearch && (
                    <button
                      onClick={() => setCatalogSearch("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar pt-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40"
                          : "bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Produtos em Cards */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((item) => {
                  const isAvail = item.quantity > 0;
                  const priceFormatted = item.price.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  });

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-indigo-500/40 hover:bg-zinc-900 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                            {item.category}
                          </span>

                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              isAvail
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {isAvail ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> {item.quantity} em estoque
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" /> Esgotado
                              </>
                            )}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors mt-0.5">
                          {item.name}
                        </h3>

                        <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/5">
                        <span className="text-sm font-extrabold text-white">{priceFormatted}</span>

                        <button
                          onClick={() => {
                            setIsCatalogOpen(false);
                            handleSendMessage(`Tem o produto "${item.name}" em estoque? Quantas unidades?`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all flex items-center gap-1"
                        >
                          Perguntar ao Bot <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-20 text-center text-zinc-500 text-sm">
                    Nenhum produto encontrado no estoque com o termo buscado.
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 bg-zinc-950 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500 px-6">
                <span>{filteredProducts.length} produtos listados</span>
                <span>TechStore • Mock Sincronizado</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
