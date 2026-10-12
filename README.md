# 🛒 TechStore Chatbot

Chatbot de inteligência artificial para atendimento ao cliente da **TechStore**, desenvolvido com **Next.js (App Router)**, **TypeScript**, **Tailwind CSS** e integrado ao **Google Gemini** através do modelo **`gemini-3.5-flash-lite`**.

O objetivo do assistente é atender os clientes em tempo real, respondendo com extrema precisão sobre a **disponibilidade de produtos**, **quantidades em estoque**, **preços oficiais** e **especificações**, utilizando um mock de estoque oficial sem expor códigos técnicos internos.

---

## 🚀 Tecnologias Utilizadas

- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS v4
- **Animações:** Framer Motion
- **Renderização Markdown:** React Markdown
- **Ícones:** Lucide React
- **Integração de IA:** SDK Oficial do Google Gemini (`@google/genai`)
  - **Modelo:** `gemini-3.5-flash-lite`
  - **System Prompt:** Injeção dinâmica do estoque oficial em tempo real com diretrizes estritas de confidencialidade e precisão.

---

## 📦 Estrutura do Projeto

```text
store-chatbot/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts        # Route Handler com System Prompt e integração Gemini
│   │   └── inventory/
│   │       └── route.ts        # Endpoint que serve o catálogo ao modal do front-end
│   ├── globals.css             # Estilos globais e tokens de design (Dark/Cinematic)
│   ├── layout.tsx              # Root Layout e metadados SEO
│   └── page.tsx                # Interface de Chat cinematográfica com catálogo interativo
├── components/
│   └── BrandLogo.tsx           # Logo vetorial e isométrica exclusiva da TechStore
├── data/
│   └── inventory.json          # Mock do estoque (produtos, categorias, estoque e valores)
├── lib/
│   └── inventory.ts            # Tipagens e utilitários de injeção e busca de estoque
├── .env.example                # Exemplo das variáveis de ambiente
├── .env.local                  # Arquivo com a chave de API configurada
└── README.md                   # Documentação completa do projeto
```

---

## 🛠️ Como Instalar e Rodar o Projeto

### 1. Pré-requisitos
- **Node.js** v18+ (recomendado v20 ou v24)
- **npm**, **pnpm** ou **yarn**

### 2. Instalação das Dependências
Clone o repositório ou acesse a pasta do projeto e instale os pacotes:

```bash
npm install
```

### 3. Configuração da Chave de API
O projeto utiliza a API do Google Gemini. Crie ou verifique o arquivo `.env.local` na raiz do projeto:

```env
GEMINI_API_KEY=sua_chave_gemini_aqui
GOOGLE_GENERATIVE_AI_API_KEY=sua_chave_gemini_aqui
```

> **🔑 Onde obter a chave:** Você pode gerar uma chave gratuita diretamente no [Google AI Studio](https://aistudio.google.com/).

### 4. Executando Localmente
Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra seu navegador em: **[http://localhost:3000](http://localhost:3000)**

Para testar o build de produção otimizado:

```bash
npm run build
npm run start
```

---

## 💡 Como Funciona o Chatbot

1. **Injeção de Contexto:** Cada mensagem enviada pelo usuário é processada pelo Route Handler (`/api/chat`), que carrega os dados atuais de `data/inventory.json` e os injeta dinamicamente nas instruções de sistema da IA (`systemInstruction`).
2. **Confidencialidade de Dados:** O System Prompt orienta o modelo a nunca divulgar identificadores técnicos de banco de dados (`PROD-001`, etc.), mantendo a comunicação 100% natural com foco nos nomes comerciais dos produtos.
3. **Precisão de Estoque:** Se um produto tiver quantidade igual a `0`, a IA informa de maneira clara e cordial que o item está **esgotado**, sugerindo alternativas disponíveis da mesma categoria.
4. **Modal de Catálogo:** No canto superior direito, o botão **"Catálogo"** abre uma central com busca em tempo real e filtros de categoria para que o avaliador possa auditar o estoque lado a lado com o chat.

---

## 🧪 Exemplos de Perguntas para Teste

Teste a precisão do assistente com os seguintes cenários:

- **Produto Disponível:**
  > *"Tem o Samsung Galaxy S24 Ultra? Quantos têm em estoque?"*  
  *(A IA confirmará que há 12 unidades disponíveis pelo valor de R$ 6.299,00).*

- **Produto Esgotado:**
  > *"Tem o iPhone 15 Pro Max?"* ou *"Tem cadeira gamer para pronta entrega?"*  
  *(A IA informará com clareza que o item está esgotado no momento).*

- **Consulta por Categoria:**
  > *"Quais modelos de fones de ouvido vocês têm e quais os valores?"*  
  *(A IA listará o Sony WH-1000XM5 e o HyperX Cloud II, mencionando que os AirPods Pro estão esgotados).*

- **Produto Fora de Linha / Inexistente:**
  > *"Vocês vendem geladeira ou aspirador de pó?"*  
  *(A IA informará educadamente que a TechStore é especializada em tecnologia/eletrônicos e não comercializa esses itens).*
