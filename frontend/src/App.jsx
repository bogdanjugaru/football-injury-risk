import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import Prediction from './pages/Prediction'
import Statistics from './pages/Statistics'
import ModelComparison from './pages/ModelComparison'
import ModelInfo from './pages/ModelInfo'
import Compare from './pages/Compare'
import Squad from './pages/Squad'
import InjuryTimeline from './pages/InjuryTimeline'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/players" element={<Players />} />
        <Route path="/prediction" element={<Prediction />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/squad" element={<Squad />} />
        <Route path="/injury-timeline" element={<InjuryTimeline />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/model-comparison" element={<ModelComparison />} />
        <Route path="/model" element={<ModelInfo />} />
      </Routes>
    </Layout>
  )
}
