import { create } from "zustand";

export interface PerguntaEResposta {
    id_mensagem: string;
    pergunta: string;
    resposta: string;
    data_hora: string;
}
export interface TextState {
    perguntasERespostas: PerguntaEResposta[];
    adicionarPerguntaEResposta: (perguntaEResposta: PerguntaEResposta) => void;
    limparPerguntasERespostas: () => void;
}
export const useTextStore = create<TextState>((set) => ({
    perguntasERespostas: [],
    adicionarPerguntaEResposta: (nova) =>
        set((state) => ({
            perguntasERespostas: [...state.perguntasERespostas, nova],
        })),
    limparPerguntasERespostas: () => set({ perguntasERespostas: [] }),
}));
