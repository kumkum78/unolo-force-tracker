import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import History from './pages/History';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
    const { user, loading, login, logout } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <Routes>
            <Route 
                path="/login" 
                element={
                    user ? <Navigate to="/dashboard" /> : <Login onLogin={login} />
                } 
            />
            <Route 
                path="/" 
                element={
                    <ProtectedRoute>
                        <Layout user={user} onLogout={logout} />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/dashboard" />} />
                <Route path="dashboard" element={<Dashboard user={user} />} />
                <Route path="checkin" element={<CheckIn user={user} />} />
                <Route path="history" element={<History user={user} />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
