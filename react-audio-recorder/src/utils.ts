export function truncateMiddle(text: string, startLength = 8, endLength = 8) {
    if (text.length <= startLength + endLength) return text;
    return `${text.slice(0, startLength)}...${text.slice(-endLength)}`;
  }


export const modelosLLM = [
  {
    id: 0, 
    label: "GPT 4.1 mini", 
    value: "gpt-4.1-mini",
    description: "Versão otimizada e leve do GPT-4.1, indicada para tarefas gerais com bom desempenho e menor custo computacional.",

  },
  {
    id: 1, 
    label: "GPT o4 mini", 
    value: "o4-mini",
    description: "Modelo eficiente da série 'o4', balanceando performance e rapidez, ideal para aplicações que exigem respostas rápidas.",

  },
  {
    id: 2, 
    label: "GPT 4o mini", 
    value: "gpt-4o-mini",     
    description: "Versão compacta do GPT-4o (omni), projetada para múltiplos modos (texto, imagem, etc.) com ótima performance em dispositivos leves.",
  },
]