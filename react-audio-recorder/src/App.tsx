import AudioRecorder from "./components/AudioRecorder";
import { MeetingPage } from "./pages/MeetingPage";
import { LoginPage } from "./pages/LoginPage";
import { useAuthStore } from "./store/authStore";
import { useUIStore } from "./store/uiStore";
import { HomePage } from "./pages/HomePage";
import { AgentsPage } from "./pages/AgentsPage";
import { ChatPage } from "./pages/ChatPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { BaseDeConhecimento } from "./components/BaseDeConhecimento";
// Se estiver usando Tailwind, importe o CSS aqui ou no main.tsx
// import './index.css';

function App() {
    const token = useAuthStore(state => state.token);
    const logout = useAuthStore(state => state.logout);
    const { currentPage, setCurrentPage } = useUIStore();

    if (!token) return <LoginPage />;

    return (
        <div className="h-screen bg-gray-50 p-2 flex flex-col overflow-hidden">
            {/* <header className="flex justify-between w-full  border-b border-gray-200">
                <h1 className="text-xl font-medium p-2 text-gray-800">
                    IAGO | interface de gravação
                </h1>
                <button
                    className="btn btn-soft btn-error"
                    onClick={() => logout()}
                >
                    Sair
                </button>
            </header> */}
            <div className="navbar bg-base-100 shadow-sm">
                <div className="navbar-start">
                    <h1 className="text-xl font-medium p-2 text-gray-800">
                        Interface de IA
                    </h1>
                </div>

                <div className="navbar-end">
                    <button
                        className="btn btn-soft btn-error"
                        onClick={() => logout()}
                    >
                        Sair
                    </button>
                </div>
            </div>
            <main className="flex-1 overflow-hidden">
                {currentPage === "home" && <HomePage />}
                {currentPage === "salas" && <MeetingPage />}
                {currentPage === "gravar" && <AudioRecorder />}
                {currentPage === "agentes" && <AgentsPage />}
                {currentPage === "chat" && <ChatPage />}
                {currentPage === "base_conhecimento" && <KnowledgeBasePage />}
                {currentPage === "criar_base_conhecimento" && (
                    <BaseDeConhecimento />
                )}
            </main>
        </div>
    );
}

export default App;
