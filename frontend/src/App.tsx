import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./features/auth/hooks/useAuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./core/data/queryClient";
import { Toaster } from "./components/ui/sonner";
import LoginPage from "./pages/login.page";
import RegisterPage from "./pages/register.page";
import HomePage from "./pages/home.page";

function App() {
  return (
    <div className="overflow-hidden">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
