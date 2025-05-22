import { useEffect, useState } from "react";
import { useUIStore } from "../store/uiStore";
import { useAllAgentes } from "../hooks/useAgentes";
import { useBasesConhecimento } from "../hooks/useBases";
import TabelaBase from "../components/TabelaBase";
import { getAgente } from "../api/agentesService";
import { useAgenteStore } from "../store/agentStore";

export function KnowledgeBasePage() {
    const [idAgente, setIdAgente] = useState<string>("");

    const { data: agentes } = useAllAgentes();
    const agenteSelecionado = useAgenteStore(state => state.agenteSelecionado);
    const { resetAgenteSelecionado } = useAgenteStore.getState();
    const { data: bases, isLoading, isError } = useBasesConhecimento(idAgente);
    const { setCurrentPage } = useUIStore();

    function handleAgenteSelecionado(id: any) {
        async function fetchAgente() {
            const agente = await getAgente(id);
            console.log("agente", agente);
            useAgenteStore.getState().setAgenteSelecionado(agente);
        }

        fetchAgente();
    }

    useEffect(() => {
        if (agenteSelecionado?.id_agente) {
            console.log("Agente selecionado:", agenteSelecionado);
            setIdAgente(agenteSelecionado.id_agente);
        }
    }, [agenteSelecionado]);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Base de Conhecimento</h1>
            <div className="flex gap-6">
                <button
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => setCurrentPage("criar_base_conhecimento")}
                >
                    Criar nova base de conhecimento
                </button>
                <button
                    className="bg-red-500 hover:bg-red-600 text-white mb-4 px-4 py-2 rounded transition-colors"
                    onClick={() => {
                        setCurrentPage("home");
                        resetAgenteSelecionado();
                    }}
                >
                    Voltar
                </button>
            </div>
            <div>
                <label htmlFor="agente" className="block mb-2">
                    Selecione um agente:
                </label>
                <select
                    id="agente"
                    value={idAgente}
                    onChange={e => {
                        setIdAgente(e.target.value);
                        handleAgenteSelecionado(e.target.value);
                    }}
                    className="border rounded p-2 mb-4"
                >
                    <option value="">Selecione um agente</option>
                    {agentes?.dados.map((agente: any) => (
                        <option key={agente.id_agente} value={agente.id_agente}>
                            {agente.nome}
                        </option>
                    ))}
                </select>

                <div className="bg-white shadow-md rounded-lg">
                    {bases && bases.length > 0 ? (
                        <TabelaBase
                            data={bases}
                            isError={isError}
                            isLoading={isLoading}
                        />
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-gray-500">
                                {idAgente !== ""
                                    ? "Nenhuma base de conhecimento cadastrada para                                 este agente"
                                    : "Selecione um agente para ver as bases de conhecimento"}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
