import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getInventoryPromptSummary, queryInventoryLocally } from "@/lib/inventory";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const CANDIDATE_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
];

const SYSTEM_PROMPT_RULES = `
[DIRETRIZES FUNDAMENTAIS DE ATENDIMENTO]:
1. VERACIDADE E PRECISÃO: Baseie suas respostas ESTRITAMENTE nos dados do estoque da loja. Nunca invente produtos, marcas ou quantidades que não existam nessa lista.
2. SINÔNIMOS E TERMOS POPULARES BRASILEIROS (MUITO IMPORTANTE):
   - "celular", "celulares", "smartphone", "smartphones", "telefone", "aparelho" -> Refere-se à categoria Smartphones. Quando o cliente perguntar "E celulares, quais possuem?" ou "Tem celular?", liste os smartphones da TechStore!
   - "notebook", "notebooks", "laptop", "laptops", "computador", "pc" -> Refere-se à categoria Notebooks.
   - "fone", "fones", "headset", "headphone", "som", "áudio" -> Refere-se à categoria Áudio.
   - "monitor", "monitores", "tela", "display" -> Refere-se à categoria Monitores.
   - "teclado", "mouse", "webcam" -> Refere-se à categoria Periféricos.
   - "ssd", "nvme", "disco", "armazenamento" -> Refere-se à categoria Armazenamento.
   - "cadeira", "cadeira gamer", "poltrona" -> Refere-se a Mobiliário Gamer.
3. DISPONIBILIDADE E STATUS DO ESTOQUE:
   - Ao listar uma categoria, destaque com clareza os modelos disponíveis com suas quantidades e preços, e mencione os que estiverem esgotados (0 unidades).
   - Se o cliente perguntar sobre um produto esgotado (ex: iPhone 15 Pro Max, AirPods Pro, Cadeira ThunderX3), informe cordialmente que o item está ESGOTADO.
4. PRODUTOS FORA DO CATÁLOGO:
   - Se o cliente perguntar por itens não comercializados pela loja (ex: geladeira, roupas, TVs), informe educadamente que a TechStore é especializada em computação, smartphones, áudio e periféricos.
5. PREÇOS: Sempre informe os valores em Reais (R$) com clareza.
6. CONFIDENCIALIDADE: NUNCA mencione códigos internos como [PROD-001] ou referências de banco de dados. Use apenas os nomes reais dos produtos.
7. TOM E FORMATAÇÃO: Profissional, ágil e acolhedor, em português do Brasil (pt-BR). Use formatação rica em Markdown (negritos, bullet points e emojis adequados). Seja objetivo!`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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

    const wantStream = body.stream !== false;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const inventorySummary = getInventoryPromptSummary();

    const systemPrompt = `Você é o "TechBot", o atendente virtual e especialista oficial da loja "TechStore".
Seu objetivo é atender os clientes com agilidade máxima, simpatia e PRECISÃO ABSOLUTA sobre os produtos da loja.

[ESTOQUE OFICIAL EM TEMPO REAL DA TECHSTORE]:
${inventorySummary}
${SYSTEM_PROMPT_RULES}`;

    const apiKey =
      (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)?.trim() || "";

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

    // Se o cliente quer resposta em Streaming (SSE)
    if (wantStream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: Record<string, unknown> | string) => {
            const payload = typeof data === "string" ? data : JSON.stringify(data);
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${payload}\n\n`));
          };

          // Tenta modelos Gemini com failover rápido
          if (apiKey && apiKey !== "sua_chave_gemini_aqui") {
            try {
              const ai = new GoogleGenAI({ apiKey });

              for (const model of CANDIDATE_MODELS) {
                try {
                  // Timeout de 2s para conexão inicial
                  const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout de conexão")), 2000)
                  );

                  const streamPromise = ai.models.generateContentStream({
                    model,
                    contents,
                    config: {
                      systemInstruction: systemPrompt,
                      temperature: 0.2,
                    },
                  });

                  const geminiStream = await Promise.race([streamPromise, timeoutPromise]);

                  sendEvent("meta", {
                    provider: "Google Gemini",
                    model,
                  });

                  for await (const chunk of geminiStream) {
                    const text = chunk.text;
                    if (text) {
                      sendEvent("chunk", { text });
                    }
                  }

                  sendEvent("done", {});
                  controller.close();
                  return;
                } catch (candidateErr) {
                  console.warn(`Tentativa com modelo ${model} falhou:`, candidateErr);
                  // Continua para o próximo modelo candidato
                }
              }
            } catch (geminiError) {
              console.error("Falha geral na API do Gemini:", geminiError);
            }
          }

          // Fallback ultra-rápido para motor inteligente local
          try {
            const fallbackResult = queryInventoryLocally(lastUserMessage);
            sendEvent("meta", {
              provider: "Assistente TechStore (Modo Rápido)",
              model: "motor-inteligente-v2",
              isDemo: true,
            });

            // Envia em blocos suaves para efeito typing natural e agradável
            const words = fallbackResult.answer.split(/(\s+)/);
            for (const word of words) {
              sendEvent("chunk", { text: word });
            }

            sendEvent("done", {});
          } catch (localError) {
            console.error("Erro no motor local:", localError);
            sendEvent("chunk", {
              text: "Desculpe, ocorreu um erro ao consultar o estoque. Por favor, tente novamente.",
            });
            sendEvent("done", {});
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Modo JSON tradicional síncrono (caso stream: false)
    if (apiKey && apiKey !== "sua_chave_gemini_aqui") {
      try {
        const ai = new GoogleGenAI({ apiKey });
        for (const model of CANDIDATE_MODELS) {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 2000)
            );
            const responsePromise = ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.2,
              },
            });

            const response = await Promise.race([responsePromise, timeoutPromise]);
            const reply =
              response.text ||
              "Desculpe, não consegui formular uma resposta no momento. Pode repetir a sua pergunta?";

            return NextResponse.json({
              reply,
              provider: "Google Gemini",
              model,
            });
          } catch {
            // Tenta próximo modelo
          }
        }
      } catch (err) {
        console.error("Erro geral no Gemini síncrono:", err);
      }
    }

    const fallbackAnswer = queryInventoryLocally(lastUserMessage);
    return NextResponse.json({
      reply: fallbackAnswer.answer,
      provider: "Assistente TechStore (Modo Rápido)",
      model: "motor-inteligente-v2",
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
