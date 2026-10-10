import { useLayoutEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DirectoryPage } from "./pages/DirectoryPage";
import { ProviderPage } from "./pages/ProviderPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { NewRequestPage } from "./pages/NewRequestPage";
import { ServiceRequestPage } from "./pages/ServiceRequestPage";
import { ConversationPage } from "./pages/ConversationPage";
import { QuoteDetailPage } from "./pages/QuoteDetailPage";
import { ConversationsPage } from "./pages/ConversationsPage";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<DirectoryPage />} />
        <Route path="/prestadores/:id" element={<ProviderPage />} />
        <Route path="/solicitacoes" element={<MyRequestsPage />} />
        <Route path="/conversas" element={<ConversationsPage />} />
        <Route path="/solicitacoes/nova" element={<NewRequestPage />} />
        <Route path="/solicitacoes/:id" element={<ServiceRequestPage />} />
        <Route path="/conversas/:id" element={<ConversationPage />} />
        <Route path="/orcamentos/:id" element={<QuoteDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
