import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Users, Activity, ChevronDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts'
import { api } from '../api/client'
import { riskColor } from '../utils/formatters'
import RiskBadge from '../components/common/RiskBadge'

const POSITIONS_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']

function RiskBar({ score }) {
  const color = riskColor(score)
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{score}%</span>
    </div>
  )
}

export default function Squad() {
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState('Arsenal')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('risk')

  // Load clubs list on mount
  useEffect(() => {
    api.getSquad('Arsenal').then(d => {
      setClubs(d.all_clubs || [])
      setData(d)
    }).catch(() => {})
  }, [])

  const loadClub = async (club) => {
    setSelectedClub(club)
    setLoading(true)
    try {
      const d = await api.getSquad(club)
      setData(d)
    } catch (e) {}
    setLoading(false)
  }

  const players = data?.players || []
  const summary = data?.summary || {}

  const sorted = [...players].sort((a, b) => {
    if (sortBy === 'risk') return b.risk_score - a.risk_score
    if (sortBy === 'fitness') return b.scor_fitness - a.scor_fitness
    if (sortBy === 'injuries') return b.total_injuries - a.total_injuries
    if (sortBy === 'name') return a.nume.localeCompare(b.nume)
    return 0
  })

  // Risk distribution for pie
  const riskDist = [
    { name: 'Scăzut', value: players.filter(p => p.risk_score < 25).length, color: '#10b981' },
    { name: 'Moderat', value: players.filter(p => p.risk_score >= 25 && p.risk_score < 50).length, color: '#f59e0b' },
    { name: 'Ridicat', value: players.filter(p => p.risk_score >= 50 && p.risk_score < 75).length, color: '#ef4444' },
    { name: 'Foarte Ridicat', value: players.filter(p => p.risk_score >= 75).length, color: '#7c3aed' },
  ].filter(d => d.value > 0)

  // Risk by position
  const byPosition = {}
  players.forEach(p => {
    if (!byPosition[p.pozitie]) byPosition[p.pozitie] = []
    byPosition[p.pozitie].push(p.risk_score)
  })
  const positionRisk = Object.entries(byPosition)
    .map(([pos, scores]) => ({ pos, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    .sort((a, b) => {
      const ia = POSITIONS_ORDER.indexOf(a.pos)
      const ib = POSITIONS_ORDER.indexOf(b.pos)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Risc per Echipă</h1>
        <p className="text-[13px] text-text-muted">Profilul de risc al unui club — toți jucătorii clasificați după risc</p>
      </div>

      {/* Club selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={selectedClub}
            onChange={e => loadClub(e.target.value)}
            className="appearance-none bg-bg2 border border-border rounded-xl px-4 py-2.5 pr-9 text-sm font-semibold text-text outline-none focus:border-primary cursor-pointer min-w-[220px]"
          >
            {clubs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
        <div className="text-xs text-text-muted">
          {players.length} jucători în baza de date
        </div>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-text-muted text-sm">Se încarcă datele echipei...</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Jucători', value: summary.total_players, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Risc mediu', value: `${summary.avg_risk}%`, icon: Activity, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Risc ridicat', value: summary.high_risk, icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10' },
              { label: 'Critic', value: summary.critical, icon: Shield, color: 'text-critical', bg: 'bg-critical/10' },
            ].map((kpi, i) => (
              <div key={i} className="bg-bg2 border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <kpi.icon size={18} className={kpi.color} />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-text">{kpi.value}</div>
                  <div className="text-xs text-text-muted">{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Risk distribution pie */}
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-4">Distribuție nivel de risc</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={riskDist} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={75} paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}>
                    {riskDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg3)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Risk by position */}
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-4">Risc mediu per poziție</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={positionRisk} margin={{ left: -20 }}>
                  <XAxis dataKey="pos" tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#8b949e', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg3)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                    formatter={(v) => [`${v}%`, 'Risc mediu']}
                  />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                    {positionRisk.map((d, i) => <Cell key={i} fill={riskColor(d.avg)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Players table */}
          <div className="bg-bg2 border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">Jucători — clasificați după risc</div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="bg-bg3 border border-border rounded-lg px-3 py-1.5 text-xs text-text outline-none focus:border-primary">
                <option value="risk">Sortare: Risc ↓</option>
                <option value="fitness">Sortare: Fitness ↓</option>
                <option value="injuries">Sortare: Accidentări ↓</option>
                <option value="name">Sortare: Nume A-Z</option>
              </select>
            </div>

            <div className="space-y-2">
              {sorted.map((p, i) => (
                <div key={p.player_id}
                  className="flex items-center gap-3 bg-bg3/50 rounded-xl px-4 py-3 hover:bg-bg3 transition-colors">
                  {/* Rank */}
                  <div className="w-6 text-xs text-text-muted font-bold text-center shrink-0">{i + 1}</div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${riskColor(p.risk_score)}, ${riskColor(p.risk_score)}88)` }}>
                    {p.nume.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>

                  {/* Name & info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text truncate">{p.nume}</div>
                    <div className="text-[11px] text-text-muted">{p.pozitie} · {p.varsta} ani · Fitness: {p.scor_fitness}</div>
                  </div>

                  {/* Injuries */}
                  <div className="text-center shrink-0 hidden sm:block">
                    <div className="text-sm font-bold text-text">{p.total_injuries}</div>
                    <div className="text-[10px] text-text-muted">acc.</div>
                  </div>

                  {/* Risk bar */}
                  <div className="w-36 shrink-0 hidden md:block">
                    <RiskBar score={p.risk_score} />
                  </div>

                  {/* Badge */}
                  <div className="shrink-0">
                    <RiskBadge level={p.risk_level} color={p.risk_color} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analysis text */}
          <div className="bg-bg2 border border-border rounded-xl p-5">
            <div className="text-sm font-semibold mb-2">Analiza riscului — {selectedClub}</div>
            <p className="text-[13px] text-text leading-relaxed">
              Echipa <strong>{selectedClub}</strong> are <strong>{summary.total_players}</strong> jucători în baza de date,
              cu un risc mediu de <strong style={{ color: riskColor(summary.avg_risk) }}>{summary.avg_risk}%</strong>.{' '}
              {summary.high_risk > 0 ? (
                <>
                  <strong style={{ color: '#ef4444' }}>{summary.high_risk}</strong> jucători ({Math.round(summary.high_risk / summary.total_players * 100)}%)
                  se află în zona de risc ridicat sau critic, necesitând monitorizare atentă.{' '}
                </>
              ) : 'Niciun jucător nu se află în zona de risc ridicat. '}
              {summary.critical > 0 && (
                <><strong style={{ color: '#7c3aed' }}>{summary.critical}</strong> jucători sunt în zona critică și necesită intervenție imediată.</>
              )}
              {positionRisk.length > 0 && (() => {
                const maxPos = positionRisk.reduce((a, b) => a.avg > b.avg ? a : b)
                return <> Poziția cu cel mai mare risc mediu este <strong>{maxPos.pos}</strong> ({maxPos.avg}%).</>
              })()}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
