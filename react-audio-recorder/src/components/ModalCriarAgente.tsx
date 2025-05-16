interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ModalCriarAgente({ isOpen, onClose }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                <h2 className="text-lg font-bold mb-4">Criar Agente</h2>{" "}
                <form>
                    <div className="mb-4">
                        <label
                            className="block text-sm font-medium mb-2"
                            htmlFor="nome"
                        >
                            Nome do Agente
                        </label>
                        <input
                            type="text"
                            id="nome"
                            className="border border-gray-300 rounded-lg w-full p-2"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label
                            className="block text-sm font-medium mb-2"
                            htmlFor="descricao"
                        >
                            Descrição do Agente
                        </label>
                        <textarea
                            className="textarea h-auto w-full resize-none outline-none"
                            placeholder="Descrição"
                            rows={2}
                        ></textarea>
                    </div>
                </form>
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
            </div>
        </div>
    );
}
