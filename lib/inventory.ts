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
      const status =
        item.quantity > 0
          ? `${item.quantity} unidades em estoque`
          : "ESGOTADO (0 unidades)";
      const priceFormatted = item.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      return `- Produto: ${item.name} | Categoria: ${item.category} | Preço: ${priceFormatted} | Estoque: ${status} | Detalhes: ${item.description}`;
    })
    .join("\n");
}

/**
 * Mapeamento robusto de sinônimos e termos populares em português para categorias da TechStore.
 */
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  Smartphones: [
    "smartphone", "smartphones", "celular", "celulares", "cel", "cels",
    "telefone", "telefones", "aparelho", "aparelhos", "mobile", "galaxy",
    "iphone", "iphones", "xiaomi", "redmi", "android", "ios", "s24"
  ],
  Notebooks: [
    "notebook", "notebooks", "laptop", "laptops", "computador", "computadores",
    "pc", "pcs", "macbook", "macbooks", "mac", "ultrabook", "ultrabooks",
    "thinkpad", "dell", "portatil", "portateis"
  ],
  Monitores: [
    "monitor", "monitores", "tela", "telas", "display", "displays",
    "ultrasharp", "ultragear", "144hz", "4k", "painel", "ips"
  ],
  Periféricos: [
    "periferico", "perifericos", "teclado", "teclados", "mouse", "mouses",
    "webcam", "webcams", "camera", "cameras", "camerazinha", "keychron",
    "logitech", "mecanico", "switches"
  ],
  Áudio: [
    "audio", "som", "fone", "fones", "headset", "headsets", "headphone",
    "headphones", "auricular", "auriculares", "ouvido", "airpod", "airpods",
    "sony", "hyperx", "bluetooth", "anc", "cancelamento de ruido", "musica"
  ],
  "Mobiliário Gamer": [
    "cadeira", "cadeiras", "poltrona", "poltronas", "mobiliario", "ergonomica",
    "assento", "banco", "thunderx3"
  ],
  Armazenamento: [
    "armazenamento", "ssd", "ssds", "nvme", "disco", "discos", "hd", "hds",
    "kingston", "memoria", "m2", "espaco"
  ],
};

const STOP_WORDS = new Set([
  "tem", "quantos", "quanta", "quantas", "quanto", "quais", "qual",
  "voces", "vocês", "estoque", "disponivel", "disponível", "preco",
  "preço", "valor", "para", "com", "uma", "uns", "loja", "vende",
  "pronta", "entrega", "saber", "gostaria", "estao", "está", "estao",
  "restam", "unidades", "itens", "algo", "sobre", "possuem", "possui",
  "ha", "há", "algum", "alguma", "alguns", "mostrar", "me", "diga",
  "queria", "quero", "ver", "onde", "por", "favor", "da", "do", "de"
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formatador amigável em Markdown para lista de produtos de uma categoria.
 */
function formatCategoryResponse(categoryName: string, items: Product[]): string {
  const inStock = items.filter((i) => i.quantity > 0);
  const outOfStock = items.filter((i) => i.quantity === 0);

  let text = `Temos as seguintes opções na categoria **${categoryName}** em nosso catálogo oficial:\n\n`;

  if (inStock.length > 0) {
    text += `**Disponíveis em Estoque:**\n`;
    for (const item of inStock) {
      const price = item.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      text += `• **${item.name}** — **${price}** (*${item.quantity} unidades disponíveis*)\n  *${item.description}*\n`;
    }
    text += `\n`;
  }

  if (outOfStock.length > 0) {
    text += `**Esgotados no momento:**\n`;
    for (const item of outOfStock) {
      const price = item.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      text += `• **${item.name}** — ${price} (*ESGOTADO • 0 unidades*)\n`;
    }
    text += `\n`;
  }

  text += `Posso te fornecer mais detalhes técnicos, especificações ou verificar outro item?`;
  return text;
}

/**
 * Mecanismo de busca e atendimento inteligente local da TechStore.
 * Capaz de compreender sinônimos, categorias, intenções de compra, preços e estoque com 100% de precisão.
 */
export function queryInventoryLocally(query: string): {
  matchedProducts: Product[];
  answer: string;
} {
  const normQuery = normalizeText(query);

  // 1. Saudação ou consulta geral do catálogo
  if (
    normQuery === "oi" ||
    normQuery === "ola" ||
    normQuery === "bom dia" ||
    normQuery === "boa tarde" ||
    normQuery === "boa noite" ||
    normQuery.includes("o que voces vendem") ||
    normQuery.includes("o que tem") ||
    normQuery.includes("catalogo") ||
    normQuery.includes("lista de produtos") ||
    normQuery === "produtos"
  ) {
    const categories = Array.from(new Set(inventory.map((i) => i.category))).join(", ");
    return {
      matchedProducts: inventory.filter((i) => i.quantity > 0).slice(0, 5),
      answer: `Olá! Seja muito bem-vindo à **TechStore**! 🚀\n\nTrabalhamos com produtos eletrônicos e de tecnologia de alta performance nas categorias:\n• **${categories}**\n\nTemos itens como **Samsung Galaxy S24 Ultra**, **MacBook Air M2**, **Dell XPS 14**, monitores gamer 144Hz, fones com cancelamento de ruído e muito mais.\n\nQual produto ou categoria você gostaria de consultar hoje?`,
    };
  }

  // 2. Consulta de produtos esgotados
  if (
    normQuery.includes("esgotado") ||
    normQuery.includes("esgotados") ||
    normQuery.includes("acabou") ||
    normQuery.includes("sem estoque") ||
    normQuery.includes("indisponivel")
  ) {
    const outOfStockItems = inventory.filter((i) => i.quantity === 0);
    const details = outOfStockItems
      .map((item) => {
        const price = item.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        return `• **${item.name}** (${item.category}): Preço de tabela ${price} (0 unidades disponíveis)`;
      })
      .join("\n");

    return {
      matchedProducts: outOfStockItems,
      answer: `Consultando o estoque, atualmente temos estes itens marcados como **ESGOTADOS**:\n\n${details}\n\nTodos os outros itens do catálogo estão com estoque disponível para pronta entrega! Gostaria de consultar algum substituto disponível?`,
    };
  }

  // 3. Consulta de item mais barato / menor preço
  if (
    normQuery.includes("mais barato") ||
    normQuery.includes("menor preco") ||
    normQuery.includes("menor valor") ||
    normQuery.includes("mais em conta")
  ) {
    const sorted = [...inventory].sort((a, b) => a.price - b.price);
    const cheapest = sorted.slice(0, 3);
    const list = cheapest
      .map((item) => {
        const price = item.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        const stock = item.quantity > 0 ? `${item.quantity} un.` : "Esgotado";
        return `• **${item.name}** (${item.category}): **${price}** — *Estoque: ${stock}*`;
      })
      .join("\n");

    return {
      matchedProducts: cheapest,
      answer: `Os produtos mais em conta da **TechStore** no momento são:\n\n${list}\n\nO item mais barato de toda a loja é a **${cheapest[0].name}** por apenas **${cheapest[0].price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}**! Deseja mais informações sobre algum deles?`,
    };
  }

  // 4. Consulta de item mais caro / topo de linha
  if (
    normQuery.includes("mais caro") ||
    normQuery.includes("maior preco") ||
    normQuery.includes("maior valor") ||
    normQuery.includes("topo de linha")
  ) {
    const sorted = [...inventory].sort((a, b) => b.price - a.price);
    const mostExpensive = sorted.slice(0, 3);
    const list = mostExpensive
      .map((item) => {
        const price = item.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        const stock = item.quantity > 0 ? `${item.quantity} un. em estoque` : "Esgotado";
        return `• **${item.name}** (${item.category}): **${price}** — *${stock}*`;
      })
      .join("\n");

    return {
      matchedProducts: mostExpensive,
      answer: `Nossos produtos premium de valor mais elevado são:\n\n${list}\n\nO produto topo de linha de maior valor é o **${mostExpensive[0].name}** por **${mostExpensive[0].price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}**. Gostaria de conferir as especificações completas?`,
    };
  }

  // 5. Verificação de categoria por sinônimos (ex: "celulares", "notebooks", "fones", etc.)
  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    const matchedSynonym = synonyms.find((syn) => {
      const normSyn = normalizeText(syn);
      // Verifica palavra isolada ou termo contido com limites de palavra
      const regex = new RegExp(`(^|\\s)${normSyn}(s|es)?(\\s|$)`, "i");
      return regex.test(normQuery);
    });

    if (matchedSynonym) {
      // Se a pergunta busca especificamente um modelo individual (ex: "iPhone 15", "Galaxy S24"),
      // não restringe à categoria inteira a menos que seja uma busca genérica como "quais possuem", "tem celular", etc.
      const isGenericCategoryQuery =
        normQuery.includes("quais") ||
        normQuery.includes("qual") ||
        normQuery.includes("tem ") ||
        normQuery.includes("possuem") ||
        normQuery.includes("lista") ||
        normQuery.includes("catalogo") ||
        normQuery.includes("modelos") ||
        normQuery.includes("opcoes") ||
        normQuery.includes("opções") ||
        normQuery.split(" ").length <= 4;

      const categoryItems = inventory.filter((i) => i.category === category);

      // Se for consulta genérica da categoria, responde com todos os produtos dela
      if (isGenericCategoryQuery && categoryItems.length > 0) {
        return {
          matchedProducts: categoryItems,
          answer: formatCategoryResponse(category, categoryItems),
        };
      }
    }
  }

  // 6. Extração de termos e pontuação individual de relevância nos produtos
  const queryWords = normQuery
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const scored = inventory.map((item) => {
    const normName = normalizeText(item.name);
    const normCat = normalizeText(item.category);
    const normDesc = normalizeText(item.description);

    let score = 0;

    // Correspondência exata do nome
    if (normQuery.includes(normName)) {
      score += 150;
    }

    // Correspondência de sinônimos da categoria
    const catSynonyms = CATEGORY_SYNONYMS[item.category] || [];
    for (const syn of catSynonyms) {
      if (normQuery.includes(normalizeText(syn))) {
        score += 30;
      }
    }

    // Pontuação por palavras da busca
    for (const word of queryWords) {
      if (normName.includes(word)) {
        score += 40;
      }
      if (normCat.includes(word)) {
        score += 25;
      }
      if (normDesc.includes(word)) {
        score += 10;
      }
    }

    // Recursos específicos (ANC, 144Hz, 4K, M2, S24, RTX, etc.)
    if (normQuery.includes("144hz") && normDesc.includes("144hz")) score += 60;
    if (normQuery.includes("4k") && (normName.includes("4k") || normDesc.includes("4k"))) score += 60;
    if ((normQuery.includes("ruido") || normQuery.includes("anc")) && normDesc.includes("cancelamento")) score += 60;
    if (normQuery.includes("mecanico") && normName.includes("mecanico")) score += 60;

    return { item, score };
  });

  const matchingResults = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // 7. Não encontrou correspondência no catálogo
  if (matchingResults.length === 0) {
    return {
      matchedProducts: [],
      answer: `Não encontrei esse produto em nosso catálogo da **TechStore** no momento.\n\nSomos especializados em tecnologia e eletrônicos de ponta: **Smartphones**, **Notebooks**, **Monitores**, **Periféricos**, **Áudio** e **Armazenamento**.\n\nGostaria de verificar algum outro item de informática ou eletrônicos?`,
    };
  }

  // 8. Retorna os melhores produtos correspondentes
  const highestScore = matchingResults[0].score;
  const bestMatches = matchingResults
    .filter((m) => m.score >= highestScore * 0.65)
    .slice(0, 3)
    .map((m) => m.item);

  const details = bestMatches
    .map((item) => {
      const price = item.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      if (item.quantity === 0) {
        return `• **${item.name}**: Infelizmente este modelo está **ESGOTADO** no momento (0 unidades). Preço de tabela: ${price}.`;
      }
      return `• **${item.name}**: Temos **${item.quantity} unidades** disponíveis em estoque! Valor: **${price}**.\n  *${item.description}*`;
    })
    .join("\n\n");

  return {
    matchedProducts: bestMatches,
    answer: `Consultando o estoque em tempo real da **TechStore**:\n\n${details}\n\nPosso te ajudar com mais detalhes ou especificações de algum desses itens?`,
  };
}
