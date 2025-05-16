import { useState } from "react";
import ModalCriarAgente from "../components/ModalCriarAgente";
import { useUIStore } from "../store/uiStore";

export function AgentsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { setCurrentPage } = useUIStore();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Agentes</h1>
            <div className="flex gap-6">
                <button
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => setIsModalOpen(true)}
                >
                    Criar novo agente
                </button>
                <button
                    className="bg-red-500 hover:bg-red-600 text-white mb-4 px-4 py-2 rounded transition-colors"
                    onClick={() => setCurrentPage("home")}
                >
                    Voltar
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg">
                <div className="p-4 text-center">
                    <p className="text-gray-500">Nenhum agente cadastrado</p>
                </div>
            </div>
            <ModalCriarAgente
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
