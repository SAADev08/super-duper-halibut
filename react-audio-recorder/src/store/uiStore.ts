// store/uiStore.ts
import { create } from 'zustand';

type Page = 'home' | 'salas' | 'gravar' | 'agentes';

interface UIState {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

export const useUIStore = create<UIState>((set) => ({
    currentPage: 'home',
    setCurrentPage: (page) => set({ currentPage: page }),
}));
