import './App.css'
import LoginPage from "./pages/login";
import Dashboard from "./pages/dashboard";
import Missions from "./pages/missions";
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
      </Route>
    </Routes>
  );
}

export default App;
