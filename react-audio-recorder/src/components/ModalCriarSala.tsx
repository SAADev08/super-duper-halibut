// src/Modal.tsx
import React, { useEffect, useState } from "react";

interface ModalProps {
    agents: any;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (descricao: string, agente_temp: string) => void;
}

export default function ModalCriarSala({
    agents,
    isOpen,
    onClose,
    onSubmit,
}: ModalProps) {
    const [descricao, setDescricao] = useState("");
    const [agenteTemp, setAgenteTemp] = useState("");

    useEffect(() => {
        if (agents && agents.dados.length > 0) {
            setAgenteTemp(agents.dados[0].id_agente);
        }
    }, [agents]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(descricao, agenteTemp);
        setDescricao("");
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                <h2 className="text-lg font-bold mb-4">Criar Sala</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-6 gap-6">
                        <div className="col-span-6">
                            <label
                                className="block text-sm font-medium mb-2"
                                htmlFor="descricao"
                            >
                                Descrição da Sala
                            </label>
                            <input
                                type="text"
                                id="descricao"
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                className="border border-gray-300 rounded-lg w-full p-2"
                                maxLength={100}
                                required
                            />
                        </div>
                        <div className="col-span-6 mb-6">
                            <label
                                htmlFor="agente_temp"
                                className="block text-sm font-medium mb-2"
                            >
                                Agente <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="select select-bordered w-full border-gray-300 focus:border-none rounded-lg"
                                id="agente_temp"
                                name="agente_temp"
                                value={agenteTemp}
                                onChange={e => setAgenteTemp(e.target.value)}
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
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setDescricao("");
                                setAgenteTemp("");
                                onClose();
                            }}
                            className="mr-2 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Criar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
