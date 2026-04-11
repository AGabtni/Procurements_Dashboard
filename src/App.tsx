import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import TenderListPage from "./pages/TenderListPage";
import TenderDetailPage from "./pages/TenderDetailPage";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import MatchesPage from "./pages/MatchesPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TenderListPage />} />
          <Route path="/tenders/:id" element={<TenderDetailPage />} />
          <Route path="/profiles" element={<CompanyProfilePage />} />
          <Route path="/matches/:companyId" element={<MatchesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
