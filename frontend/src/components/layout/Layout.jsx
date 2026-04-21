import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { api } from '../../api/client'

const pageTitles = {
  '/': 'Dashboard',
  '/players': 'Jucatori',
  '/prediction': 'Predictie Risc',
  '/statistics': 'Statistici & Analiza',
  '/compare': 'Comparare Jucatori',
  '/squad': 'Risc per Echipa',
  '/injury-timeline': 'Istoric & Recuperare',
  '/model-comparison': 'Comparare Modele ML',
  '/model': 'Informatii Model ML',
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modelAccuracy, setModelAccuracy] = useState(null)
  const location = useLocation()

  useEffect(() => {
    api.getModelInfo()
      .then(d => setModelAccuracy(d.accuracy))
      .catch(() => {})
  }, [])

  const title = pageTitles[location.pathname] || 'FootballRisk'

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-[250px] flex-1 min-h-screen transition-[margin] duration-300">
        <Topbar
          title={title}
          modelAccuracy={modelAccuracy}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="p-6 min-h-[calc(100vh-60px)]">
          {children}
        </main>
      </div>
    </div>
  )
}
