import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getInventoryPromptSummary, queryInventoryLocally } from "@/lib/inventory";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Suporta tanto array de mensagens ({ messages: [...] }) quanto mensagem direta ({ message: "..." })
    let messages: ChatMessage[] = [];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      messages = body.messages;
    } else if (typeof body.message === "string" && body.message.trim().length > 0) {
      messages = [{ role: "user", content: body.message.trim() }];
    } else {
      return NextResponse.json(
        { error: "Nenhuma mensagem válida foi fornecida na requisição." },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const inventorySummary = getInventoryPromptSummary();

    const systemPrompt = `Você é o "TechBot", o atendente virtual e especialista oficial da loja "TechStore".
Seu objetivo é atender os clientes de forma ágil, simpática, prestativa e com PRECISÃO ABSOLUTA sobre os produtos da loja.

[ESTOQUE OFICIAL EM TEMPO REAL DA TECHSTORE]:
${inventorySummary}

[DIRETRIZES FUNDAMENTAIS DE ATENDIMENTO]:
1. VERACIDADE E PRECISÃO: Baseie suas respostas ESTRITAMENTE nos dados do estoque acima. Nunca invente produtos, marcas ou quantidades que não existam nessa lista.
2. DISPONIBILIDADE E QUANTIDADE:
   - Se o cliente perguntar se tem determinado produto ou quantas unidades tem em estoque, informe a quantidade exata.
   - Se a quantidade for 0 (zero), avise de forma cordial e empática que o produto está ESGOTADO no momento.
   - Se o cliente perguntar por um item que NÃO consta no catálogo (ex: eletrodomésticos, roupas, etc.), informe educadamente que a TechStore é especializada em eletrônicos/tecnologia e não comercializa esse item, sugerindo produtos correlatos do catálogo se aplicável.
3. PREÇOS: Sempre informe os valores em Reais (R$) com clareza quando o cliente consultar preços ou o produto for mencionado.
4. CONFIDENCIALIDADE DE DADOS INTERNOS: NUNCA mostre códigos de banco de dados, IDs internos ou SKUs (como [PROD-001], PROD-xxx, etc.). Refira-se aos produtos única e exclusivamente pelos seus nomes comerciais e marcas reais de forma limpa.
5. TOM DE ATENDIMENTO: Profissional, bem-humorado e dinâmico, em português do Brasil (pt-BR). Use formatação em Markdown (negritos e bullet points) para deixar a leitura fácil e agradável em chats.
6. OBJETIVIDADE: Mantenha as respostas concisas e diretas ao ponto, sem enrolações.`;

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // Se tiver a chave do Gemini configurada
    if (apiKey && apiKey.trim() !== "" && apiKey !== "sua_chave_gemini_aqui") {
      try {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

        // Monta histórico de mensagens no formato do Google Gemini (role: "user" | "model")
        const contents = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        if (contents.length === 0) {
          contents.push({
            role: "user",
            parts: [{ text: lastUserMessage }],
          });
        }

        // Modelo Gemini 3.5 Flash Lite (mesmo padrão do projeto chatbot-film)
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          },
        });

        const reply =
          response.text ||
          "Desculpe, não consegui formular uma resposta no momento. Pode repetir a sua pergunta?";

        return NextResponse.json({
          reply,
          provider: "Google Gemini",
          model: "gemini-3.5-flash-lite",
        });
      } catch (geminiError: unknown) {
        console.error("Erro na chamada à API do Gemini:", geminiError);
        // Em caso de falha externa de rede da API do Gemini, fallback para o motor local seguro
      }
    }

    // Fallback de demonstração caso a chave não esteja presente ou temporariamente indisponível
    const fallbackAnswer = queryInventoryLocally(lastUserMessage);
    return NextResponse.json({
      reply: fallbackAnswer.answer,
      provider: "Simulador de Estoque Local",
      model: "mock-engine",
      isDemo: true,
    });
  } catch (error: unknown) {
    console.error("Erro interno no Route Handler /api/chat:", error);
    return NextResponse.json(
      {
        error: "Erro interno no servidor ao processar o atendimento.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
