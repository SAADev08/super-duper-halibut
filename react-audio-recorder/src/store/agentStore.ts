import { create } from "zustand";

export interface IAgenteModule {
    id_agente?: string;
    nome: string;
    comportamento: string;
    modelo: string;
    dados_de_treinamento?: string;
    base_conhecimento_temp?: string;
    conta_temp?: string;
    z_api_id_instancia?: string | null;
    z_api_token?: string | null;
    z_api_client_token?: string | null;
}

export interface IAgente {
    dados: IAgenteModule[];
    total_registros: number;
}

export interface IAgenteState {
    agentes: IAgenteModule[];
    agenteSelecionado: IAgenteModule | null;
    setAgentes: (agentes: IAgenteModule[]) => void;
    setAgenteSelecionado: (agente: IAgenteModule) => void;
    resetAgenteSelecionado: () => void;
}

export const useAgenteStore = create<IAgenteState>((set) => ({
    agentes: [],
    agenteSelecionado: null,
    setAgentes: (agentes) => set({ agentes }),
    setAgenteSelecionado: (agente) => set({ agenteSelecionado: agente }),
    resetAgenteSelecionado: () => set({ agenteSelecionado: null }),
}));