import {
    BookBookmark,
    ChatText,
    Robot,
    VideoConference,
} from "@phosphor-icons/react";
import { useUIStore } from "../store/uiStore";

export function HomePage() {
    const { setCurrentPage } = useUIStore();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Bem-vindo</h1>
            <div className=" grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                <div
                    className="btn bg-gray-200 shadow-sm hover:bg-gray-300 rounded transition-colors"
                    onClick={() => setCurrentPage("agentes")}
                >
                    <div className="flex items-center gap-2">
                        <Robot size={24} />
                        <h2 className="text-lg">Agentes</h2>
                    </div>
                </div>
                <div
                    className="btn bg-gray-200 shadow-sm hover:bg-gray-300 rounded transition-colors"
                    onClick={() => setCurrentPage("salas")}
                >
                    <div className="flex items-center gap-2">
                        <VideoConference size={24} />
                        <h2 className="text-lg">Salas</h2>
                    </div>
                </div>
                <div
                    className="btn bg-gray-200 shadow-sm hover:bg-gray-300 rounded transition-colors"
                    onClick={() => setCurrentPage("base_conhecimento")}
                >
                    <div className="flex items-center gap-2">
                        <BookBookmark size={24} />
                        <h2 className="text-lg">Base de conhecimento</h2>
                    </div>
                </div>
                <div
                    className="btn bg-gray-200 shadow-sm hover:bg-gray-300 rounded transition-colors"
                    onClick={() => setCurrentPage("chat")}
                >
                    <div className="flex items-center gap-2">
                        <ChatText size={24} />
                        <h2 className="text-lg">Chat</h2>
                    </div>
                </div>
            </div>
        </div>
    );
}
