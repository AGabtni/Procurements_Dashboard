import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TenderListPage from "./pages/TenderListPage";
import TenderDetailPage from "./pages/TenderDetailPage";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import MatchesPage from "./pages/MatchesPage";
import type { ReactNode } from "react";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<Layout />}>
            <Route index element={<TenderListPage />} />
            <Route path="/tenders/:id" element={<TenderDetailPage />} />
            <Route
              path="/profiles"
              element={
                <RequireAuth>
                  <CompanyProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/matches/:companyId"
              element={
                <RequireAuth>
                  <MatchesPage />
                </RequireAuth>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
