import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import NotebookListPage from './pages/NotebookListPage'
import NotebookDetailPage from './pages/NotebookDetailPage'
import AddExpensePage from './pages/AddExpensePage'
import SettlementPage from './pages/SettlementPage'
import SettingsPage from './pages/SettingsPage'
import JoinNotebookPage from './pages/JoinNotebookPage'
import ProtectedRoute from './components/layout/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join/:code" element={<JoinNotebookPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<NotebookListPage />} />
          <Route path="/notebook/:id" element={<NotebookDetailPage />} />
          <Route path="/notebook/:id/add" element={<AddExpensePage />} />
          <Route path="/notebook/:id/settle" element={<SettlementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
