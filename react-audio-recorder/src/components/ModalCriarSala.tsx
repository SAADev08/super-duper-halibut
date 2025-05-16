// src/Modal.tsx
import React, { useState } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (descricao: string) => void;
}

export default function ModalCriarSala({
    isOpen,
    onClose,
    onSubmit,
}: ModalProps) {
    const [descricao, setDescricao] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(descricao);
        setDescricao("");
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                <h2 className="text-lg font-bold mb-4">Criar Sala</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
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
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
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
