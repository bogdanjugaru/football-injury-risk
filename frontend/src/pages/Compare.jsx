import { useState, useEffect } from 'react'
import { Users, X, Search, Plus } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell,
} from 'recharts'
import { api } from '../api/client'
import { riskColor } from '../utils/formatters'
import RiskBadge from '../components/common/RiskBadge'

const PLAYER_COLORS = ['#3b82f6', '#10b981', '#f59e0b']

// Normalize a value 0-100 relative to max in a set
function norm(val, max) {
  return max > 0 ? Math.round((val / max) * 100) : 0
}

function PlayerSlot({ index, player, onSearch, onRemove }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      const data = await api.searchPlayersForPrediction(query)
      setResults(data)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => { api.searchPlayersForPrediction('').then(setResults) }, [])

  const color = PLAYER_COLORS[index]

  if (player) {
    const hasFullData = player.injury_summary != null

    return (
      <div className="bg-bg2 border-2 rounded-xl p-4 relative" style={{ borderColor: color }}>
        <button onClick={onRemove}
          className="absolute top-3 right-3 text-text-muted hover:text-danger transition-colors">
          <X size={15} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
            {player.nume.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="font-bold text-text text-sm">{player.nume}</div>
            <div className="text-[11px] text-text-muted">{player.club} · {player.pozitie}</div>
          </div>
        </div>

        {!hasFullData ? (
          <div className="flex items-center justify-center py-6 text-text-muted text-xs gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
            Se încarcă datele...
          </div>
        ) : (
          <>
            {/* Risk gauge mini */}
            <div className="flex items-center justify-between bg-bg3 rounded-lg px-3 py-2 mb-3">
              <span className="text-xs text-text-muted">Risc accidentare</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold" style={{ color: riskColor(player.risk_score) }}>
                  {player.risk_score}%
                </span>
                <RiskBadge level={player.risk_level} color={player.risk_color} />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {[
                ['Vârstă', `${player.varsta} ani`],
                ['BMI', player.bmi],
                ['Fitness', player.scor_fitness],
                ['Exp.', `${player.ani_experienta_pro} ani`],
                ['Accidentări', player.injury_summary.total],
                ['Zile absență', player.injury_summary.total_days],
              ].map(([label, val]) => (
                <div key={label} className="bg-bg3/60 rounded px-2 py-1.5 flex justify-between">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-semibold text-text">{val}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="bg-bg2 border-2 border-dashed border-border rounded-xl p-4">
      <div className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        Jucător {index + 1}
      </div>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          <Search size={13} />
        </div>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShow(true) }}
          onFocus={() => setShow(true)}
          placeholder="Caută jucător..."
          className="w-full bg-bg3 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text outline-none focus:border-primary"
        />
        {show && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg3 border border-border rounded-lg max-h-52 overflow-y-auto shadow-xl">
            {results.map(p => (
              <button key={p.player_id}
                onClick={() => { onSearch(p); setShow(false); setQuery('') }}
                className="w-full text-left px-3 py-2 hover:bg-primary/10 flex items-center gap-2 border-b border-border/50 last:border-0 text-sm">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ background: color }}>
                  {p.nume.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="text-text font-medium">{p.nume}</div>
                  <div className="text-[10px] text-text-muted">{p.club} · {p.pozitie}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-6 text-center text-text-muted">
        <Plus size={24} className="mx-auto mb-1 opacity-30" />
        <p className="text-xs">Selectează un jucător</p>
      </div>
    </div>
  )
}

export default function Compare() {
  const [slots, setSlots] = useState([null, null, null])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const selectedIds = slots.filter(Boolean).map(s => s.player_id)

  const selectPlayer = (index, player) => {
    const newSlots = [...slots]
    newSlots[index] = player
    setSlots(newSlots)
  }

  const removePlayer = (index) => {
    const newSlots = [...slots]
    newSlots[index] = null
    setSlots(newSlots)
    setData(null)
  }

  useEffect(() => {
    if (selectedIds.length < 2) { setData(null); return }
    setLoading(true)
    api.comparePlayers(selectedIds)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedIds.join(',')])

  const players = data?.players || []

  // Build radar data
  const radarData = players.length >= 2 ? (() => {
    const maxFitness = Math.max(...players.map(p => p.scor_fitness || 0))
    const maxMinute = Math.max(...players.map(p => p.stats.minute_jucate || 0))
    const maxDist = Math.max(...players.map(p => p.stats.distanta_totala_km || 0))
    const maxSprints = Math.max(...players.map(p => p.stats.sprinturi_totale || 0))
    const maxExp = Math.max(...players.map(p => p.ani_experienta_pro || 0))
    const maxInj = Math.max(...players.map(p => p.injury_summary.total || 1))

    return [
      { subject: 'Fitness', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], norm(p.scor_fitness, maxFitness)])) },
      { subject: 'Minute', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], norm(p.stats.minute_jucate, maxMinute)])) },
      { subject: 'Distanță', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], norm(p.stats.distanta_totala_km, maxDist)])) },
      { subject: 'Sprinturi', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], norm(p.stats.sprinturi_totale, maxSprints)])) },
      { subject: 'Experiență', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], norm(p.ani_experienta_pro, maxExp)])) },
      { subject: 'Accidentări', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], norm(p.injury_summary.total, maxInj)])) },
    ]
  })() : []

  // Risk comparison bar
  const riskBarData = players.map(p => ({
    name: p.nume.split(' ')[0],
    risc: p.risk_score,
    fitness: p.scor_fitness,
  }))

  // Stats bar comparison
  const statsBarData = [
    { metric: 'Meciuri', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], p.stats.meciuri_jucate])) },
    { metric: 'Accidentări', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], p.injury_summary.total])) },
    { metric: 'Zile absență', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], p.injury_summary.total_days])) },
    { metric: 'Severe', ...Object.fromEntries(players.map(p => [p.nume.split(' ')[0], p.injury_summary.serious])) },
  ]

  const playerNames = players.map(p => p.nume.split(' ')[0])

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Comparare Jucători</h1>
        <p className="text-[13px] text-text-muted">Compară profilul de risc și statisticile a 2–3 jucători</p>
      </div>

      {/* Player slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot, i) => (
          <PlayerSlot
            key={i}
            index={i}
            player={slot ? players.find(p => p.player_id === slot.player_id) || slot : null}
            onSearch={p => selectPlayer(i, p)}
            onRemove={() => removePlayer(i)}
          />
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-text-muted">
          <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          Se încarcă comparația...
        </div>
      )}

      {!loading && players.length >= 2 && (
        <>
          {/* Risk + Fitness bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-4">Scor Risc & Fitness</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskBarData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#8b949e', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg3)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--color-text)' }}
                  />
                  <Legend />
                  <Bar dataKey="risc" name="Risc %" radius={[4, 4, 0, 0]}>
                    {riskBarData.map((entry, i) => (
                      <Cell key={i} fill={riskColor(entry.risc)} />
                    ))}
                  </Bar>
                  <Bar dataKey="fitness" name="Fitness" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-4">Statistici performanță (normalizate)</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b949e', fontSize: 11 }} />
                  {playerNames.map((name, i) => (
                    <Radar key={name} name={name} dataKey={name}
                      stroke={PLAYER_COLORS[i]} fill={PLAYER_COLORS[i]} fillOpacity={0.15}
                      strokeWidth={2} />
                  ))}
                  <Legend />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg3)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Injury & stats comparison */}
          <div className="bg-bg2 border border-border rounded-xl p-5">
            <div className="text-sm font-semibold mb-4">Comparație statistici accidentări & joc</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statsBarData} barGap={3}>
                <XAxis dataKey="metric" tick={{ fill: '#8b949e', fontSize: 12 }} />
                <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg3)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--color-text)' }}
                />
                <Legend />
                {playerNames.map((name, i) => (
                  <Bar key={name} dataKey={name} name={name} fill={PLAYER_COLORS[i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed comparison table */}
          <div className="bg-bg2 border border-border rounded-xl p-5">
            <div className="text-sm font-semibold mb-4">Tabel comparativ detaliat</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-text-muted font-medium text-xs">Parametru</th>
                    {players.map((p, i) => (
                      <th key={p.player_id} className="text-center py-2 px-3 text-xs font-semibold"
                        style={{ color: PLAYER_COLORS[i] }}>
                        {p.nume.split(' ').slice(0, 2).join(' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Club', players.map(p => p.club)],
                    ['Poziție', players.map(p => p.pozitie)],
                    ['Vârstă', players.map(p => `${p.varsta} ani`)],
                    ['Înălțime', players.map(p => `${p.inaltime_cm} cm`)],
                    ['Greutate', players.map(p => `${p.greutate_kg} kg`)],
                    ['BMI', players.map(p => p.bmi)],
                    ['Scor Fitness', players.map(p => p.scor_fitness)],
                    ['Experiență', players.map(p => `${p.ani_experienta_pro} ani`)],
                    ['— Sezon —', players.map(() => '—')],
                    ['Meciuri', players.map(p => p.stats.meciuri_jucate)],
                    ['Minute jucate', players.map(p => p.stats.minute_jucate)],
                    ['Distanță (km)', players.map(p => p.stats.distanta_totala_km)],
                    ['Sprinturi', players.map(p => p.stats.sprinturi_totale)],
                    ['Indice încărcare', players.map(p => p.stats.indice_incarcare)],
                    ['— Accidentări —', players.map(() => '—')],
                    ['Total accidentări', players.map(p => p.injury_summary.total)],
                    ['Accidentări severe', players.map(p => p.injury_summary.serious)],
                    ['Total zile absență', players.map(p => p.injury_summary.total_days)],
                    ['Media zile/acc.', players.map(p => p.injury_summary.avg_days)],
                    ['Recidive', players.map(p => p.injury_summary.recurrences)],
                    ['— Risc ML —', players.map(() => '—')],
                    ['Scor Risc', players.map(p => `${p.risk_score}%`)],
                    ['Nivel Risc', players.map(p => p.risk_level)],
                  ].map(([label, values], rowIdx) => {
                    const isSep = String(values[0]) === '—'
                    return (
                      <tr key={rowIdx} className={`border-b border-border/40 ${isSep ? 'bg-bg3/40' : 'hover:bg-bg3/30'} transition-colors`}>
                        <td className={`py-2 pr-4 text-xs ${isSep ? 'font-bold text-text' : 'text-text-muted'}`}>{label}</td>
                        {values.map((val, i) => {
                          const isRisk = label === 'Scor Risc'
                          const isLevel = label === 'Nivel Risc'
                          // Highlight best fitness, lowest risk
                          let highlight = false
                          if (label === 'Scor Fitness') {
                            highlight = Number(val) === Math.max(...players.map(p => p.scor_fitness))
                          }
                          if (label === 'Scor Risc') {
                            highlight = Number(String(val).replace('%', '')) === Math.min(...players.map(p => p.risk_score))
                          }
                          return (
                            <td key={i} className={`py-2 px-3 text-center text-xs font-medium ${isSep ? 'text-text-muted' : ''}`}>
                              {isRisk ? (
                                <span className="font-bold" style={{ color: riskColor(parseFloat(val)) }}>{val}</span>
                              ) : isLevel ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                  style={{ backgroundColor: riskColor(players[i].risk_score) }}>{val}</span>
                              ) : highlight ? (
                                <span className="text-success font-bold">{val} ✓</span>
                              ) : (
                                <span className="text-text">{isSep ? '' : val}</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top injuries per player */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {players.map((p, i) => (
              <div key={p.player_id} className="bg-bg2 border border-border rounded-xl p-4">
                <div className="text-xs font-semibold mb-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLAYER_COLORS[i] }} />
                  {p.nume.split(' ').slice(0, 2).join(' ')} — Top accidentări
                </div>
                {p.injury_summary.top_injuries.length > 0 ? (
                  <div className="space-y-2">
                    {p.injury_summary.top_injuries.map((inj, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <div className="flex-1 text-text-muted truncate">{inj.type}</div>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 rounded-full" style={{
                            width: `${Math.round((inj.count / p.injury_summary.total) * 60)}px`,
                            background: PLAYER_COLORS[i]
                          }} />
                          <span className="font-semibold text-text w-4">{inj.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">Fără date</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && selectedIds.length < 2 && (
        <div className="bg-bg2 border border-border rounded-xl p-12 text-center text-text-muted">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selectează cel puțin 2 jucători pentru a începe comparația</p>
        </div>
      )}
    </div>
  )
}
