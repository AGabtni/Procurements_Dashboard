import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import TenderListPage from "./pages/TenderListPage";
import TenderDetailPage from "./pages/TenderDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TenderListPage />} />
          <Route path="/tenders/:id" element={<TenderDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
