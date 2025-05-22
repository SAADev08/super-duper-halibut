import { useUIStore } from "../store/uiStore";

export function ChatPage() {
    const { setCurrentPage } = useUIStore();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Chat</h1>
            <div className="flex gap-6">
                <button
                    className="bg-red-500 hover:bg-red-600 text-white mb-4 px-4 py-2 rounded transition-colors"
                    onClick={() => setCurrentPage("home")}
                >
                    Voltar
                </button>
            </div>
        </div>
    );
}
