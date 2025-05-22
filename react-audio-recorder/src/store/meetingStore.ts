import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ISalaModule {
    id_sala?: string;
    data_hora_in: string;
    data_hora_fin?: string;
    descricao: string;
    conta_temp?: string;
    agente_temp?: string;
}
export interface ISala {
    dados: ISalaModule[];
    total_registros: number;
}

interface MeetingState {
    salaAtiva: ISalaModule | null;
    setSalaAtiva: (sala: ISalaModule) => void;
    resetSala: () => void;
}

export const useMeetingStore = create<MeetingState>()(
    persist(
        (set) => ({
            salaAtiva: null,
            setSalaAtiva: (sala) => set({ salaAtiva: sala }),
            resetSala: () => set({ salaAtiva: null }),
        }),
        {
            name: 'sala-storage', // nome no localStorage
        }
    )
);
