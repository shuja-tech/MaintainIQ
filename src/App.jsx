import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetNew from './pages/AssetNew'
import AssetDetails from './pages/AssetDetails'
import PublicAssetPage from './pages/PublicAssetPage'
import Issues from './pages/Issues'
import IssueDetails from './pages/IssueDetails'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/asset/:code" element={<PublicAssetPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
        <Route path="/assets/new" element={<ProtectedRoute adminOnly><AssetNew /></ProtectedRoute>} />
        <Route path="/assets/:code" element={<ProtectedRoute><AssetDetails /></ProtectedRoute>} />
        <Route path="/issues" element={<ProtectedRoute><Issues /></ProtectedRoute>} />
        <Route path="/issues/:id" element={<ProtectedRoute><IssueDetails /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}
