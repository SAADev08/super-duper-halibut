import { useEffect, useState } from "react";
import { useUIStore } from "../store/uiStore";
import { PaginationState } from "@tanstack/react-table";
import { useAgentes } from "../hooks/useAgentes";
import TabelaAgentes from "../components/TabelaAgentes";
import ModalAgente from "../components/ModalAgente";
import { useAgenteStore } from "../store/agentStore";

export function AgentsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const { data: agentes, isLoading, isError } = useAgentes(pagination);
    const agenteSelecionado = useAgenteStore(s => s.agenteSelecionado);
    const { resetAgenteSelecionado } = useAgenteStore.getState();
    const { setCurrentPage } = useUIStore();

    useEffect(() => {
        if (agenteSelecionado) {
            setIsModalOpen(true);
        }
    }, [agenteSelecionado]);

    useEffect(() => {
        console.log("Agentes:", agentes);
    });

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Agentes</h1>
            <div className="flex gap-6">
                <button
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => {
                        setIsModalOpen(true);
                        resetAgenteSelecionado();
                    }}
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
                {agentes && agentes.dados.length > 0 ? (
                    <TabelaAgentes
                        data={agentes}
                        pagination={pagination}
                        setPagination={setPagination}
                        isLoading={isLoading}
                        isError={isError}
                    />
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-gray-500">
                            Nenhum agente cadastrado
                        </p>
                    </div>
                )}
            </div>
            <ModalAgente
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    resetAgenteSelecionado();
                }}
                cont={agenteSelecionado}
            />
        </div>
    );
}
