import { create } from "zustand";

export interface IMensagem {
    id_mensagem: string;
    data_hora: string;
    pergunta: string;
    resposta?: string | null; // Resposta pode ser nula inicialmente
    path_audio?: string | null;
    sala_temp: string;
}

export interface MensagemState {
    mensagens: IMensagem[];
    mensagemSelecionada: IMensagem | null;
    setMensagensCompletas: (mensagens: IMensagem[]) => void;
    setMensagemSelecionada: (mensagem: IMensagem) => void;
}
  
export const useMensagemStore = create<MensagemState>((set) => ({
    mensagens: [],
    mensagemSelecionada: null,
    setMensagensCompletas: (msgs) => set({ mensagens: msgs }),
    setMensagemSelecionada: (mensagem) => set({ mensagemSelecionada: mensagem }),
}));
  