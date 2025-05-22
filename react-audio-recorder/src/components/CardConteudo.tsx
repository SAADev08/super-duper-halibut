import { PlusCircle, Trash } from "@phosphor-icons/react";
import { ISeçao } from "./BaseDeConhecimento";
import { useEffect } from "react";

interface CardConteudoProps {
    section: ISeçao;
    agenteSelecionado: any;
    agents: any;
    updateSection: (section: any) => void;
    removeSection: (id: string) => void;
    isRemovable: boolean;
}
export default function CardConteudo(props: CardConteudoProps) {
    const {
        section,
        agenteSelecionado,
        agents,
        updateSection,
        removeSection,
        isRemovable,
    } = props;

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSection({
            ...section,
            titulo: e.target.value,
        });
    };

    const handleContentItemChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        itemId: string
    ) => {
        const { name, value } = e.target;
        const updatedItems = section.conteudoItens.map(item =>
            item.id === itemId ? { ...item, [name]: value } : item
        );

        updateSection({
            ...section,
            conteudoItens: updatedItems,
        });
    };

    const addContentItem = () => {
        updateSection({
            ...section,
            conteudoItens: [
                ...section.conteudoItens,
                {
                    id: Date.now().toString(),
                    subtitulo: "",
                    conteudo: "",
                },
            ],
        });
    };

    const removeContentItem = (itemId: string) => {
        if (section.conteudoItens.length === 1) {
            return; // Keep at least one content item
        }

        updateSection({
            ...section,
            conteudoItens: section.conteudoItens.filter(
                item => item.id !== itemId
            ),
        });
    };

    useEffect(() => {
        if (agenteSelecionado && !section.agente) {
            // Inicializa o valor de section.agente com o ID do primeiro agente
            updateSection({
                ...section,
                agente: agenteSelecionado.id_agente,
            });
        }
    }, [agenteSelecionado]); // Executa quando agents for carregado

    return (
        <div className="max-h-[calc(100vh-300px)] w-[calc(50%-20px)] overflow-y-auto card bg-base-100 border border-gray-300 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="card-body ">
                <div className="card-title flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1.5">
                        <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-sky-500 mr-2"></div>
                            <h3 className="font-medium">Seção</h3>
                        </div>
                    </div>
                    {isRemovable && (
                        <button
                            className="btn btn-ghost h-8 w-8 p-0 text-gray-500 hover:text-red-500 hover:bg-red-50"
                            onClick={() => removeSection(section.id)}
                        >
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Remover</span>
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-1">
                        <label
                            htmlFor={`seq-${section.id}`}
                            className="block text-sm font-medium mb-2"
                        >
                            Sequência <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id={`seq-${section.id}`}
                            name="sequencia"
                            value={section.sequencia}
                            onChange={e =>
                                updateSection({
                                    ...section,
                                    sequencia: e.target.value,
                                })
                            }
                            placeholder="nº"
                            className="input border border-gray-300 focus:border-none rounded-lg w-full p-2"
                        />
                    </div>
                    <div className="col-span-2">
                        <label
                            htmlFor={`agent-${section.id}`}
                            className="block text-sm font-medium mb-2"
                        >
                            Agente <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="select select-bordered w-full border-gray-300 focus:border-none rounded-lg"
                            id={`agent-${section.id}`}
                            name="agente"
                            value={section.agente}
                            onChange={e =>
                                updateSection({
                                    ...section,
                                    agente: e.target.value,
                                })
                            }
                        >
                            {agents !== undefined &&
                                agents.dados.map((agent: any) => (
                                    <option
                                        key={agent.id_agente}
                                        value={agent.id_agente}
                                        className="text-sm"
                                    >
                                        {agent.nome}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label
                            htmlFor={`title-${section.id}`}
                            className="block text-sm font-medium mb-2"
                        >
                            Titulo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id={`title-${section.id}`}
                            name="titulo"
                            value={section.titulo}
                            onChange={handleTitleChange}
                            placeholder="Titulo da seção"
                            className="input border border-gray-300 focus:border-none rounded-lg w-full p-2"
                        />
                    </div>
                    {section.conteudoItens.map((item, index) => (
                        <div className="col-span-3" key={item.id}>
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium text-gray-500">
                                    Item {index + 1}
                                </h4>
                                {section.conteudoItens.length > 1 && (
                                    <button
                                        className="btn btn-ghost btn-sm p-0 text-gray-400 hover:text-red-500"
                                        onClick={() =>
                                            removeContentItem(item.id)
                                        }
                                    >
                                        <Trash size={16} />
                                        <span className="sr-only">
                                            Remover item
                                        </span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={addContentItem}
                                    className="btn btn-ghost h-8 w-8 p-0 text-gray-500 hover:text-sky-500 hover:bg-sky-50"
                                >
                                    <PlusCircle size={16} />
                                    <span className="sr-only">
                                        Adicionar item
                                    </span>
                                </button>
                            </div>{" "}
                            <div className="grid grid-cols-3 gap-6 mt-2">
                                <div className="col-span-1">
                                    <label
                                        htmlFor={`seq-${item.id}`}
                                        className="block text-sm font-medium mb-2"
                                    >
                                        Sequência{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id={`seq-${item.id}`}
                                        name="sequencia"
                                        value={item.sequencia}
                                        onChange={e =>
                                            handleContentItemChange(e, item.id)
                                        }
                                        placeholder="nº"
                                        className="input border border-gray-300 focus:border-none rounded-lg w-full p-2"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label
                                        htmlFor={`subtitle-${item.id}`}
                                        className="block text-sm font-medium mb-2"
                                    >
                                        Subtitulo
                                    </label>
                                    <input
                                        type="text"
                                        id={`subtitle-${item.id}`}
                                        name="subtitulo"
                                        value={item.subtitulo}
                                        onChange={e =>
                                            handleContentItemChange(e, item.id)
                                        }
                                        placeholder="Subtitulo da seção"
                                        className="input border border-gray-300 focus:border-none rounded-lg w-full p-2"
                                    />
                                </div>
                            </div>
                            <div className="col-span-6 mt-2">
                                <label
                                    htmlFor={`content-${section.id}`}
                                    className="block text-sm font-medium mb-2"
                                >
                                    Conteudo
                                </label>
                                <textarea
                                    id={`content-${item.id}`}
                                    name="conteudo"
                                    value={item.conteudo}
                                    onChange={e =>
                                        handleContentItemChange(e, item.id)
                                    }
                                    placeholder="Conteudo da seção"
                                    rows={4}
                                    className="textarea h-auto w-full resize-none rounded-lg outline-none pr-16 focus:border-none"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
