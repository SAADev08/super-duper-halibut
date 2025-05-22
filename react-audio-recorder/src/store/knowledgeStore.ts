import { create } from "zustand";

export interface IKnowledgeBaseModule {
    id_base_conhecimento?: string;
    agente_temp: string;
    descricao: string;
    sequencia: number;
}

export interface IKnowledgeBaseState {
    basesConhecimento: IKnowledgeBaseModule[];
    baseConhecimentoSelecionada: IKnowledgeBaseModule | null;
    setBasesConhecimento: (bases: IKnowledgeBaseModule[]) => void;
    setBaseConhecimentoSelecionada: (base: IKnowledgeBaseModule) => void;
    resetBaseConhecimentoSelecionada: () => void;
}

export const useKnowledgeBaseStore = create<IKnowledgeBaseState>((set) => ({
    basesConhecimento: [],
    baseConhecimentoSelecionada: null,
    setBasesConhecimento: (bases) => set({ basesConhecimento: bases }),
    setBaseConhecimentoSelecionada: (base) => set({ baseConhecimentoSelecionada: base }),
    resetBaseConhecimentoSelecionada: () => set({ baseConhecimentoSelecionada: null }),
}));