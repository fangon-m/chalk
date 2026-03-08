import './App.css'
import LoginPage from "./pages/login";
import Dashboard from "./pages/dashboard";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from './components/ProtectedRoute';

function App() {

   return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={
         <ProtectedRoute>
           <Dashboard />
         </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
