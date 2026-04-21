import { useState, useEffect } from 'react'
import { Clock, Search, User, AlertTriangle, Activity, Calendar, Heart, Stethoscope } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, ScatterChart, Scatter, ZAxis, CartesianGrid,
} from 'recharts'
import { api } from '../api/client'
import { riskColor } from '../utils/formatters'

const SEVERITY_COLORS = {
  'Ușoară (1–7 zile)': '#10b981',
  'Moderată (8–28 zile)': '#f59e0b',
  'Severă (29–90 zile)': '#ef4444',
  'Foarte severă (>90 zile)': '#7c3aed',
}

const SEVERITY_SHORT = {
  'Ușoară (1–7 zile)': 'Ușoară',
  'Moderată (8–28 zile)': 'Moderată',
  'Severă (29–90 zile)': 'Severă',
  'Foarte severă (>90 zile)': 'F. Severă',
}

// Realistic human body SVG with anatomical detail
function BodyMap({ bodyParts }) {
  if (!bodyParts?.length) return null

  const maxCount = Math.max(...bodyParts.map(b => b.count), 1)

  // Injury hotspot positions mapped to body coordinates
  const BODY_POSITIONS = {
    'Cap':        { x: 150, y: 52, r: 20 },
    'Față':       { x: 150, y: 48, r: 16 },
    'Umăr':       { x: 108, y: 128, r: 16 },
    'Braț':       { x: 88, y: 165, r: 14 },
    'Cot':        { x: 82, y: 190, r: 13 },
    'Mână':       { x: 72, y: 240, r: 11 },
    'Piept':      { x: 150, y: 145, r: 20 },
    'Spate':      { x: 150, y: 165, r: 20 },
    'Abdomen':    { x: 150, y: 195, r: 18 },
    'Coapsă':     { x: 132, y: 280, r: 18 },
    'Genunchi':   { x: 133, y: 330, r: 16 },
    'Tibie':      { x: 134, y: 370, r: 14 },
    'Gleznă':     { x: 133, y: 415, r: 13 },
    'Picior':     { x: 130, y: 442, r: 12 },
    'Gambă':      { x: 167, y: 370, r: 14 },
    'Ligament':   { x: 168, y: 330, r: 16 },
    'Mușchi':     { x: 168, y: 280, r: 18 },
    'Sold':       { x: 122, y: 235, r: 16 },
    'Inghinală':  { x: 150, y: 245, r: 14 },
  }

  return (
    <div className="relative mx-auto" style={{ width: 300, height: 460 }}>
      <svg viewBox="0 0 300 460" className="w-full h-full">
        <defs>
          {/* Body gradient */}
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-text)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-text)" stopOpacity="0.08" />
          </linearGradient>
          {/* Joint gradient */}
          <radialGradient id="jointGrad">
            <stop offset="0%" stopColor="var(--color-text)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-text)" stopOpacity="0.06" />
          </radialGradient>
          {/* Muscle line pattern */}
          <linearGradient id="muscleGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-text)" stopOpacity="0.04" />
            <stop offset="50%" stopColor="var(--color-text)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-text)" stopOpacity="0.04" />
          </linearGradient>
          {/* Hotspot glow */}
          {bodyParts.map((bp, i) => {
            const intensity = bp.count / maxCount
            return (
              <radialGradient key={`hg${i}`} id={`hotspot${i}`}>
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7 * intensity + 0.3} />
                <stop offset="40%" stopColor="#ef4444" stopOpacity={0.35 * intensity + 0.1} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
            )
          })}
        </defs>

        {/* === ANATOMICAL BODY === */}
        {/* Head */}
        <ellipse cx="150" cy="42" rx="24" ry="28" fill="url(#bodyGrad)" stroke="var(--color-text)" strokeOpacity="0.12" strokeWidth="1" />
        {/* Face features */}
        <line x1="142" y1="38" x2="146" y2="38" stroke="var(--color-text)" strokeOpacity="0.1" strokeWidth="1" strokeLinecap="round" />
        <line x1="154" y1="38" x2="158" y2="38" stroke="var(--color-text)" strokeOpacity="0.1" strokeWidth="1" strokeLinecap="round" />

        {/* Neck */}
        <path d="M140,68 Q140,75 138,82 L162,82 Q160,75 160,68" fill="url(#bodyGrad)" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.5" />

        {/* Shoulders + Torso */}
        <path d="M138,82 Q130,85 100,100 Q92,105 90,115 L90,125 Q92,128 100,130
                 L105,135 Q108,170 110,200 Q112,220 118,235
                 L150,242 L182,235
                 Q188,220 190,200 Q192,170 195,135
                 L200,130 Q208,128 210,125 L210,115 Q208,105 200,100
                 Q170,85 162,82 Z"
              fill="url(#bodyGrad)" stroke="var(--color-text)" strokeOpacity="0.1" strokeWidth="1" />

        {/* Chest center line */}
        <line x1="150" y1="95" x2="150" y2="210" stroke="var(--color-text)" strokeOpacity="0.05" strokeWidth="0.5" />
        {/* Pectorals */}
        <path d="M120,110 Q135,125 150,118 Q165,125 180,110" fill="none" stroke="var(--color-text)" strokeOpacity="0.06" strokeWidth="0.8" />
        {/* Abs lines */}
        <line x1="140" y1="155" x2="160" y2="155" stroke="var(--color-text)" strokeOpacity="0.04" strokeWidth="0.5" />
        <line x1="140" y1="170" x2="160" y2="170" stroke="var(--color-text)" strokeOpacity="0.04" strokeWidth="0.5" />
        <line x1="140" y1="185" x2="160" y2="185" stroke="var(--color-text)" strokeOpacity="0.04" strokeWidth="0.5" />

        {/* Left Arm */}
        <path d="M100,100 Q88,108 82,130 Q78,150 76,170 Q74,185 72,195"
              fill="none" stroke="url(#bodyGrad)" strokeWidth="22" strokeLinecap="round" />
        <path d="M100,100 Q88,108 82,130 Q78,150 76,170 Q74,185 72,195"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.1" strokeWidth="1" />
        {/* Left forearm */}
        <path d="M72,195 Q70,210 68,225 Q66,235 65,245"
              fill="none" stroke="url(#bodyGrad)" strokeWidth="16" strokeLinecap="round" />
        <path d="M72,195 Q70,210 68,225 Q66,235 65,245"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.8" />
        {/* Left hand */}
        <ellipse cx="63" cy="252" rx="10" ry="14" fill="url(#bodyGrad)" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.5" />

        {/* Right Arm */}
        <path d="M200,100 Q212,108 218,130 Q222,150 224,170 Q226,185 228,195"
              fill="none" stroke="url(#bodyGrad)" strokeWidth="22" strokeLinecap="round" />
        <path d="M200,100 Q212,108 218,130 Q222,150 224,170 Q226,185 228,195"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.1" strokeWidth="1" />
        {/* Right forearm */}
        <path d="M228,195 Q230,210 232,225 Q234,235 235,245"
              fill="none" stroke="url(#bodyGrad)" strokeWidth="16" strokeLinecap="round" />
        <path d="M228,195 Q230,210 232,225 Q234,235 235,245"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.8" />
        {/* Right hand */}
        <ellipse cx="237" cy="252" rx="10" ry="14" fill="url(#bodyGrad)" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.5" />

        {/* Hip / Pelvis area */}
        <path d="M118,235 Q130,250 150,252 Q170,250 182,235"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.06" strokeWidth="0.8" />

        {/* Left Leg - Upper */}
        <path d="M125,242 Q122,260 123,285 Q124,310 126,325"
              fill="none" stroke="url(#bodyGrad)" strokeWidth="30" strokeLinecap="round" />
        <path d="M125,242 Q122,260 123,285 Q124,310 126,325"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.8" />
        {/* Left knee joint */}
        <circle cx="128" cy="330" r="14" fill="url(#jointGrad)" stroke="var(--color-text)" strokeOpacity="0.06" strokeWidth="0.5" />
        {/* Left Leg - Lower */}
        <path d="M128,340 Q130,365 131,390 Q132,410 132,420"
              fill="none" stroke="url(#bodyGrad)" strokeWidth="22" strokeLinecap="round" />
        <path d="M128,340 Q130,365 131,390 Q132,410 132,420"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.8" />
        {/* Left ankle */}
        <circle cx="132" cy="425" r="8" fill="url(#jointGrad)" />
        {/* Left foot */}
        <path d="M124,430 Q118,438 115,443 Q114,448 120,450 Q130,452 140,448 Q142,444 140,438 Z"
              fill="url(#bodyGrad)" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.5" />

        {/* Right Leg - Upper */}
        <path d="M175,242 Q178,260 177,285 Q176,310 174,325"
              fill="none" stroke="url(#bodyGrad)" strokeWidth="30" strokeLinecap="round" />
        <path d="M175,242 Q178,260 177,285 Q176,310 174,325"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.8" />
        {/* Right knee joint */}
        <circle cx="172" cy="330" r="14" fill="url(#jointGrad)" stroke="var(--color-text)" strokeOpacity="0.06" strokeWidth="0.5" />
        {/* Right Leg - Lower */}
        <path d="M172,340 Q170,365 169,390 Q168,410 168,420"
              fill="none" stroke="url(#bodyGrad)" strokeWidth="22" strokeLinecap="round" />
        <path d="M172,340 Q170,365 169,390 Q168,410 168,420"
              fill="none" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.8" />
        {/* Right ankle */}
        <circle cx="168" cy="425" r="8" fill="url(#jointGrad)" />
        {/* Right foot */}
        <path d="M176,430 Q182,438 185,443 Q186,448 180,450 Q170,452 160,448 Q158,444 160,438 Z"
              fill="url(#bodyGrad)" stroke="var(--color-text)" strokeOpacity="0.08" strokeWidth="0.5" />

        {/* Muscle definition lines */}
        {/* Quads */}
        <path d="M128,255 Q126,280 127,310" fill="none" stroke="url(#muscleGrad)" strokeWidth="0.6" />
        <path d="M172,255 Q174,280 173,310" fill="none" stroke="url(#muscleGrad)" strokeWidth="0.6" />
        {/* Calves */}
        <path d="M130,350 Q131,370 132,395" fill="none" stroke="url(#muscleGrad)" strokeWidth="0.5" />
        <path d="M170,350 Q169,370 168,395" fill="none" stroke="url(#muscleGrad)" strokeWidth="0.5" />

        {/* === INJURY HOTSPOTS (SVG-native for crisp rendering) === */}
        {bodyParts.map((bp, i) => {
          const pos = BODY_POSITIONS[bp.parte]
          if (!pos) return null
          const intensity = bp.count / maxCount
          const r = pos.r * (0.7 + intensity * 0.5)
          return (
            <g key={i} className="injury-hotspot" style={{ cursor: 'pointer' }}>
              {/* Outer glow */}
              <circle cx={pos.x} cy={pos.y} r={r * 1.6} fill={`url(#hotspot${i})`}>
                <animate attributeName="r" values={`${r * 1.4};${r * 1.8};${r * 1.4}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Core dot */}
              <circle cx={pos.x} cy={pos.y} r={r * 0.4} fill="#ef4444" fillOpacity={0.6 + intensity * 0.4}
                stroke="#fff" strokeWidth="1" strokeOpacity="0.3" />
              {/* Count label */}
              <text x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize="9" fontWeight="bold"
                fill="#fff" fillOpacity="0.9">{bp.count}x</text>
            </g>
          )
        })}
      </svg>

      {/* Hover tooltips (HTML overlay for better styling) */}
      {bodyParts.map((bp, i) => {
        const pos = BODY_POSITIONS[bp.parte]
        if (!pos) return null
        const intensity = bp.count / maxCount
        const r = pos.r * (0.7 + intensity * 0.5)
        // Scale factor: SVG viewBox 300x460 mapped to div 300x460
        return (
          <div key={`tip${i}`} className="absolute group" style={{
            left: pos.x - r * 1.6,
            top: pos.y - r * 1.6,
            width: r * 3.2,
            height: r * 3.2,
          }}>
            <div className="w-full h-full" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-bg2 border border-border rounded-xl px-3 py-2 text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none shadow-lg shadow-black/30">
              <div className="font-bold text-text text-xs">{bp.parte}</div>
              <div className="text-text-muted">{bp.count} accidentări · {bp.total_days} zile absente</div>
              <div className="w-full h-1 bg-bg3 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-danger" style={{ width: `${intensity * 100}%` }} />
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-bg2 border-r border-b border-border rotate-45 -mt-1" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RecoveryPredictor({ playerData }) {
  const [injury, setInjury] = useState({
    parte_corp: 'Genunchi',
    severitate: 'Moderată (8–28 zile)',
    mecanism: 'non-contact',
    context: 'meci',
    recidiva: 'Nu',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const predict = async () => {
    setLoading(true)
    try {
      const payload = {
        varsta: playerData?.varsta || 25,
        bmi: playerData?.bmi || 23,
        scor_fitness: playerData?.scor_fitness || 75,
        pozitie: playerData?.pozitie || 'CM',
        total_prev_injuries: playerData?.total_injuries || 0,
        ...injury,
      }
      const res = await api.predictRecovery(payload)
      setResult(res)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const severityColor = SEVERITY_COLORS[injury.severitate] || '#8b949e'

  return (
    <div className="bg-bg2 border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Stethoscope size={15} className="text-primary" />
        <span className="text-sm font-semibold">Predictor Timp Recuperare</span>
      </div>
      <p className="text-[11px] text-text-muted mb-4">
        Simulează o accidentare și estimează timpul de recuperare pe baza profilului jucătorului.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-semibold text-text-muted block mb-1">Parte corp</label>
          <select value={injury.parte_corp} onChange={e => setInjury(p => ({ ...p, parte_corp: e.target.value }))}
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary">
            {['Cap', 'Umăr', 'Spate', 'Coapsă', 'Genunchi', 'Gleznă', 'Gambă', 'Sold', 'Inghinală', 'Picior', 'Tibie', 'Abdomen'].map(p =>
              <option key={p} value={p}>{p}</option>
            )}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-muted block mb-1">Severitate</label>
          <select value={injury.severitate} onChange={e => setInjury(p => ({ ...p, severitate: e.target.value }))}
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary">
            {Object.keys(SEVERITY_COLORS).map(s =>
              <option key={s} value={s}>{SEVERITY_SHORT[s] || s}</option>
            )}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-muted block mb-1">Mecanism</label>
          <select value={injury.mecanism} onChange={e => setInjury(p => ({ ...p, mecanism: e.target.value }))}
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary">
            <option value="contact">Contact</option>
            <option value="non-contact">Non-contact</option>
            <option value="suprasolicitare">Suprasolicitare</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-muted block mb-1">Context</label>
          <select value={injury.context} onChange={e => setInjury(p => ({ ...p, context: e.target.value }))}
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary">
            <option value="meci">Meci</option>
            <option value="antrenament">Antrenament</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-muted block mb-1">Recidivă?</label>
          <select value={injury.recidiva} onChange={e => setInjury(p => ({ ...p, recidiva: e.target.value }))}
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary">
            <option value="Nu">Nu</option>
            <option value="Da">Da</option>
          </select>
        </div>
      </div>

      <button onClick={predict} disabled={loading}
        className="w-full bg-primary hover:bg-primary-d text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 text-sm">
        {loading ? 'Se calculează...' : 'Estimează Recuperarea'}
      </button>

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4 bg-bg3 rounded-xl px-4 py-4">
            <div className="text-center flex-1">
              <div className="text-[10px] text-text-muted mb-1">Estimare recuperare</div>
              <div className="text-3xl font-extrabold text-primary">{result.predicted_days}</div>
              <div className="text-xs text-text-muted">zile</div>
            </div>
            <div className="text-center flex-1 border-l border-border pl-4">
              <div className="text-[10px] text-text-muted mb-1">Interval încredere</div>
              <div className="text-lg font-bold text-text">{result.confidence_interval?.low} — {result.confidence_interval?.high}</div>
              <div className="text-xs text-text-muted">zile</div>
            </div>
            {result.similar_injuries_avg != null && (
              <div className="text-center flex-1 border-l border-border pl-4">
                <div className="text-[10px] text-text-muted mb-1">Media similare</div>
                <div className="text-lg font-bold text-warning">{result.similar_injuries_avg}</div>
                <div className="text-xs text-text-muted">zile</div>
              </div>
            )}
          </div>
          <div className="text-xs text-text-muted leading-relaxed bg-bg3/50 rounded-lg px-4 py-3">
            {result.predicted_days <= 7 && 'Accidentare minoră — jucătorul ar trebui să revină rapid pe teren cu monitorizare adecvată.'}
            {result.predicted_days > 7 && result.predicted_days <= 28 && 'Accidentare moderată — necesită program de recuperare controlat cu revenire progresivă.'}
            {result.predicted_days > 28 && result.predicted_days <= 90 && 'Accidentare severă — recuperare de durată cu risc de recidivă. Se recomandă protocol complet de reabilitare.'}
            {result.predicted_days > 90 && 'Accidentare foarte severă — recuperare de lungă durată. Necesită monitorizare medicală continuă și revenire treptată.'}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InjuryTimeline() {
  const [searchQuery, setSearchQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.searchPlayersForPrediction('').then(setPlayers)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 1) {
        const data = await api.searchPlayersForPrediction(searchQuery)
        setPlayers(data)
        setShowDropdown(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const selectPlayer = async (player) => {
    setSelectedPlayer(player)
    setSearchQuery(player.nume)
    setShowDropdown(false)
    setLoading(true)
    try {
      const d = await api.getPlayerTimeline(player.player_id)
      setData(d)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const summary = data?.summary || {}
  const injuries = data?.injuries || []

  // Group injuries by season for chart
  const bySeason = {}
  injuries.forEach(inj => {
    const s = inj.sezon || 'Necunoscut'
    if (!bySeason[s]) bySeason[s] = { sezon: s, count: 0, days: 0 }
    bySeason[s].count++
    bySeason[s].days += inj.zile_absenta || 0
  })
  const seasonChart = Object.values(bySeason).sort((a, b) => a.sezon.localeCompare(b.sezon))

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Istoric Accidentări & Recuperare</h1>
        <p className="text-[13px] text-text-muted">Timeline cronologic al accidentărilor și predictor timp recuperare</p>
      </div>

      {/* Player Search */}
      <div className="bg-bg2 border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Search size={16} className="text-primary" /> Selectează jucător
        </div>
        <div className="relative">
          <input type="text" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Caută după nume..."
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-primary" />
          {showDropdown && players.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg3 border border-border rounded-lg max-h-64 overflow-y-auto shadow-xl">
              {players.map(p => (
                <button key={p.player_id} onClick={() => selectPlayer(p)}
                  className="w-full text-left px-3 py-2.5 hover:bg-primary/10 flex items-center gap-3 border-b border-border/50 last:border-0 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-d flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {p.nume.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm text-text font-medium">{p.nume}</div>
                    <div className="text-[11px] text-text-muted">{p.club} &bull; {p.pozitie} &bull; {p.varsta} ani</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-text-muted text-sm">Se încarcă istoricul...</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Accidentări', value: summary.total, icon: AlertTriangle, color: 'text-danger' },
              { label: 'Zile Absente', value: summary.total_days, icon: Calendar, color: 'text-warning' },
              { label: 'Media Recuperare', value: `${summary.avg_recovery} zile`, icon: Clock, color: 'text-primary' },
              { label: 'Rată Recidivă', value: `${summary.recurrence_rate}%`, icon: Activity, color: 'text-critical' },
              { label: 'Zona Frecventă', value: summary.most_common_body_part?.parte, icon: Heart, color: 'text-danger' },
            ].map((kpi, i) => (
              <div key={i} className="bg-bg2 border border-border rounded-xl p-3 flex items-center gap-2.5">
                <kpi.icon size={18} className={kpi.color} />
                <div>
                  <div className="text-base font-extrabold text-text">{kpi.value || '—'}</div>
                  <div className="text-[10px] text-text-muted">{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Body Map */}
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-3">Hartă corporală accidentări</div>
              <BodyMap bodyParts={summary.by_body_part} />
              {/* Legend */}
              {summary.by_body_part?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {summary.by_body_part.slice(0, 6).map((bp, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2">
                      <span className="text-text-muted">{bp.parte}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text">{bp.count}x</span>
                        <span className="text-text-muted">({bp.total_days} zile)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Injuries by season chart */}
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-3">Accidentări pe sezon</div>
              {seasonChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={seasonChart} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="sezon" tick={{ fill: '#8b949e', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--color-bg3)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                    <Bar dataKey="count" name="Accidentări" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="days" name="Zile absente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-text-muted text-xs text-center py-8">Nicio accidentare înregistrată</p>}

              {/* Severity breakdown */}
              {summary.by_severity && Object.keys(summary.by_severity).length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-text-muted mb-2">Distribuție severitate</div>
                  <div className="space-y-1.5">
                    {Object.entries(summary.by_severity).map(([sev, info]) => (
                      <div key={sev} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[sev] || '#8b949e' }} />
                        <span className="text-text-muted flex-1">{SEVERITY_SHORT[sev] || sev}</span>
                        <span className="font-bold text-text">{info.count}x</span>
                        <span className="text-text-muted">~{info.avg_days}z</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chronological Timeline */}
          <div className="bg-bg2 border border-border rounded-xl p-5">
            <div className="text-sm font-semibold mb-4">Timeline cronologic</div>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-3">
                {injuries.map((inj, i) => {
                  const sevColor = SEVERITY_COLORS[inj.severitate] || '#8b949e'
                  return (
                    <div key={i} className="flex gap-4 relative">
                      {/* Dot */}
                      <div className="w-10 shrink-0 flex items-start justify-center pt-3 relative z-10">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-bg2" style={{ backgroundColor: sevColor }} />
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-bg3/50 border border-border/50 rounded-xl px-4 py-3 hover:bg-bg3 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-text">{inj.tip_accidentare}</div>
                            <div className="text-[11px] text-text-muted mt-0.5">
                              {inj.parte_corp} · {inj.mecanism} · {inj.context}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: sevColor }}>
                            {SEVERITY_SHORT[inj.severitate] || inj.severitate}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-text-muted">
                          <span>{inj.data_accidentare} → {inj.data_revenire || '?'}</span>
                          <span className="font-bold text-text">{inj.zile_absenta} zile</span>
                          <span>Sezon {inj.sezon}</span>
                          {inj.recidiva === 'Da' && (
                            <span className="text-danger font-bold">RECIDIVĂ</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recovery Predictor */}
          <RecoveryPredictor playerData={{
            varsta: selectedPlayer?.varsta,
            bmi: selectedPlayer?.bmi,
            scor_fitness: selectedPlayer?.scor_fitness,
            pozitie: selectedPlayer?.pozitie,
            total_injuries: summary.total,
          }} />
        </>
      )}

      {!loading && !data && !selectedPlayer && (
        <div className="bg-bg2 border border-border rounded-xl p-12 text-center">
          <Clock size={48} className="mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-text-muted text-sm">Selectează un jucător pentru a vedea istoricul accidentărilor</p>
        </div>
      )}
    </div>
  )
}
