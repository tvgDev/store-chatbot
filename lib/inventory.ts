import inventoryData from "@/data/inventory.json";

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  description: string;
}

export const inventory: Product[] = inventoryData as Product[];

/**
 * Formata o estoque em texto estruturado para ser injetado com precisão no System Prompt da IA.
 */
export function getInventoryPromptSummary(): string {
  return inventory
    .map((item) => {
      const status = item.quantity > 0 ? `${item.quantity} unidades em estoque` : "ESGOTADO (0 unidades)";
      const priceFormatted = item.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      return `- Produto: ${item.name} | Categoria: ${item.category} | Preço: ${priceFormatted} | Estoque: ${status} | Detalhes: ${item.description}`;
    })
    .join("\n");
}

const STOP_WORDS = new Set([
  "tem", "quantos", "quanta", "quantas", "quanto", "quais", "qual",
  "voces", "vocês", "estoque", "disponivel", "disponível", "preco",
  "preço", "valor", "para", "com", "uma", "uns", "loja", "vende",
  "pronta", "entrega", "saber", "gostaria", "estao", "está", "estao",
  "restam", "unidades", "itens", "algo", "sobre"
]);

/**
 * Busca produtos diretamente com pontuação de relevância (usado no simulador de contingência).
 */
export function queryInventoryLocally(query: string): {
  matchedProducts: Product[];
  answer: string;
} {
  const cleanQuery = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // 1. Caso geral / Saudação / Catálogo
  if (
    cleanQuery.includes("o que tem") ||
    cleanQuery.includes("catalogo") ||
    cleanQuery.includes("produtos") ||
    cleanQuery.includes("lista") ||
    cleanQuery === "ola" ||
    cleanQuery === "oi"
  ) {
    const categories = Array.from(new Set(inventory.map((i) => i.category))).join(", ");
    return {
      matchedProducts: inventory.filter((i) => i.quantity > 0).slice(0, 5),
      answer: `Olá! Na TechStore temos produtos nas categorias: **${categories}**.\n\nTemos itens como Samsung Galaxy S24 Ultra, Dell XPS 14, MacBook Air M2, monitores gamer, teclados mecânicos e fones de ouvido. Qual produto ou categoria você deseja consultar?`,
    };
  }

  // 2. Extrai termos relevantes excluindo stopwords
  const queryTerms = cleanQuery
    .split(/[\s,?.!]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  // 3. Pontua os produtos
  const scored = inventory.map((item) => {
    const normName = item.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const normCat = item.category
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const normDesc = item.description
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let score = 0;

    // Correspondência direta do nome completo
    if (cleanQuery.includes(normName)) {
      score += 100;
    }

    // Correspondência por termos individuais
    for (const term of queryTerms) {
      if (normName.includes(term)) {
        score += 25;
      }
      if (normCat.includes(term)) {
        score += 15;
      }
      if (normDesc.includes(term)) {
        score += 5;
      }
    }

    return { item, score };
  });

  const matchingResults = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matchingResults.length === 0) {
    return {
      matchedProducts: [],
      answer: `Não encontrei esse produto em nosso estoque da TechStore no momento. Trabalhamos com smartphones, notebooks, monitores, periféricos e áudio. Gostaria de verificar algum outro item?`,
    };
  }

  // Pega o score mais alto e inclui itens com relevância próxima (ou até 3 produtos mais relevantes)
  const highestScore = matchingResults[0].score;
  const bestMatches = matchingResults
    .filter((m) => m.score >= highestScore * 0.7)
    .slice(0, 3)
    .map((m) => m.item);

  const details = bestMatches
    .map((item) => {
      const price = item.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      if (item.quantity === 0) {
        return `• **${item.name}**: Infelizmente este produto está **ESGOTADO** no momento (0 unidades). Preço de tabela: ${price}.`;
      }
      return `• **${item.name}**: Temos **${item.quantity} unidades** disponíveis em estoque! Valor: ${price}.\n  *${item.description}*`;
    })
    .join("\n\n");

  return {
    matchedProducts: bestMatches,
    answer: `Consultando o estoque da TechStore:\n\n${details}\n\nPosso te ajudar com mais alguma informação ou pedido?`,
  };
}
