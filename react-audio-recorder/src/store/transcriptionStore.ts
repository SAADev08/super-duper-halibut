import { create } from 'zustand';

interface Transcricao {
  id_mensagem: string;
  pergunta: string;
  resposta: string;
  data_hora: string;
}

interface TranscriptionState {
  transcricoes: Transcricao[];
  adicionarTranscricao: (transcricao: Transcricao) => void;
  limparTranscricoes: () => void;
}

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  transcricoes: [],
  adicionarTranscricao: (nova) =>
    set((state) => ({
      transcricoes: [...state.transcricoes, nova],
    })),
  limparTranscricoes: () => set({ transcricoes: [] }),
}));
