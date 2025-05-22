import { useState } from "react";
import CardConteudo from "./CardConteudo";
import { PlusCircle } from "@phosphor-icons/react";
import { useUIStore } from "../store/uiStore";
import { useAllAgentes } from "../hooks/useAgentes";
import { useCriarBaseConhecimento } from "../hooks/useBases";
import { useAgenteStore } from "../store/agentStore";

export interface Itens {
    id: string;
    subtitulo: string;
    conteudo: string;
    sequencia: string;
}

export interface ISeçao {
    id: string;
    titulo: string;
    agente: string;
    sequencia: string;
    conteudoItens: Itens[];
}

const itensVazio = (): Itens => ({
    id: Date.now().toString(),
    subtitulo: "",
    conteudo: "",
    sequencia: "",
});
const seçaoVazia = (): ISeçao => ({
    id: Date.now().toString(),
    titulo: "",
    agente: "",
    sequencia: "",
    conteudoItens: [itensVazio()],
});

export function BaseDeConhecimento() {
    const [seçoes, setSeçoes] = useState<ISeçao[]>([seçaoVazia()]);

    const { setCurrentPage } = useUIStore();
    const agenteSelecionado = useAgenteStore(state => state.agenteSelecionado);
    const { data: agentes } = useAllAgentes();
    const { mutateAsync: criarBase } = useCriarBaseConhecimento();

    const addSection = () => {
        setSeçoes([...seçoes, seçaoVazia()]);
    };

    const removeSection = (id: string) => {
        if (seçoes.length === 1) {
            console.log("Cannot remove the last section");
            return;
        }
        setSeçoes(seçoes.filter((section: any) => section.id !== id));
        console.log("Section removed");
    };

    const updateSection = (updatedSection: any) => {
        setSeçoes(
            seçoes.map((section: any) =>
                section.id === updatedSection.id ? updatedSection : section
            )
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        console.log("submit", seçoes);
        e.preventDefault();

        // Validate sections
        const isValid = seçoes.every(
            s =>
                s.titulo.trim() !== "" &&
                s.conteudoItens.every(i => i.conteudo.trim() !== "")
        );

        if (!isValid) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        // Submit
        const data: any = [];
        seçoes.forEach((s: any) => {
            data.push({
                sequencia: s.sequencia,
                descricao: s.titulo,
                agente_temp: s.agente,
            });

            s.conteudoItens.forEach((item: any, i: any) => {
                data.push({
                    sequencia: item.sequencia,
                    descricao: item.subtitulo,
                    agente_temp: s.agente,
                });

                data.push({
                    sequencia: `${item.sequencia}.1`,
                    descricao: item.conteudo,
                    agente_temp: s.agente,
                });
            });
        });

        console.log("data", data);

        try {
            // Envia todos os dados em paralelo
            await Promise.all(data.map((d: any) => criarBase(d)));

            console.log("✅ Todos os dados foram salvos com sucesso!");
            setCurrentPage("base_conhecimento"); // redireciona uma vez, após tudo
        } catch (error) {
            console.error("❌ Erro ao salvar a base de conhecimento", error);
            alert("Erro ao salvar os dados. Tente novamente.");
        }
    };

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            <div className=" p-4">
                <h1 className="text-2xl font-bold mb-4">
                    Cadastrar base de conhecimento
                </h1>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col h-full w-full">
                        <div className="bg-gray-200 rounded-lg p-4 h-[calc(100vh-250px)] flex flex-col">
                            <div className="border rounded p-1 flex-1 overflow-y-auto">
                                <div className="flex flex-row gap-4 overflow-x-hidden flex-wrap">
                                    {seçoes.map((s: any) => (
                                        <CardConteudo
                                            key={s.id}
                                            section={s}
                                            agenteSelecionado={
                                                agenteSelecionado
                                            }
                                            agents={agentes}
                                            updateSection={updateSection}
                                            removeSection={removeSection}
                                            isRemovable={seçoes.length > 1}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-center mt-8">
                            <button
                                type="button"
                                onClick={addSection}
                                className="btn w-full sm:w-auto group hover:bg-sky-50 transition-all"
                            >
                                <PlusCircle
                                    size={16}
                                    className="mr-2 h-4 w-4 group-hover:text-sky-600 transition-colors"
                                />
                                <span className="group-hover:text-sky-600 transition-colors">
                                    Adicionar Seção
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCurrentPage("base_conhecimento");
                                    setSeçoes([seçaoVazia()]);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
