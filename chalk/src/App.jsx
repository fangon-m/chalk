import './App.css'
import LoginPage from "./pages/login";
import Dashboard from "./pages/dashboard";
import Missions from "./pages/missions";
import Streaks from "./pages/streaks";
import Journals from "./pages/journals";
import Stats from "./pages/stats";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout';

function App() {

   return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/streaks" element={<Streaks />} />
        <Route path="/journals" element={<Journals />} />
        <Route path="/stats" element={<Stats />} />
      </Route>
    </Routes>
  );
}

export default App;
