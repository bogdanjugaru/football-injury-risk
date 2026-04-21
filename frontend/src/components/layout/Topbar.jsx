import { Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function Topbar({ title, modelAccuracy, onMenuClick }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-[60px] bg-bg2 border-b border-border flex items-center px-5 gap-3.5 sticky top-0 z-40 transition-colors duration-200">
      <button
        onClick={onMenuClick}
        className="w-9 h-9 flex items-center justify-center bg-bg3 border border-border text-text-muted rounded-lg hover:bg-border hover:text-text transition-all lg:hidden"
      >
        <Menu size={18} />
      </button>
      <h1 className="text-[15px] font-semibold text-text flex-1">{title}</h1>

      {modelAccuracy != null && (
        <div className="bg-primary/15 text-primary border border-primary/30 rounded-full px-3 py-1 text-xs font-semibold">
          Model Accuracy: {modelAccuracy}%
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Activează modul luminos' : 'Activează modul întunecat'}
        className="w-9 h-9 flex items-center justify-center bg-bg3 border border-border text-text-muted rounded-lg hover:text-text hover:bg-border transition-all"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  )
}
