import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import Prediction from './pages/Prediction'
import Statistics from './pages/Statistics'
import ModelComparison from './pages/ModelComparison'
import ModelInfo from './pages/ModelInfo'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/players" element={<Players />} />
        <Route path="/prediction" element={<Prediction />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/model-comparison" element={<ModelComparison />} />
        <Route path="/model" element={<ModelInfo />} />
      </Routes>
    </Layout>
  )
}
