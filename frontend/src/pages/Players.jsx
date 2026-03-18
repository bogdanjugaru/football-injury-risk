import { useState, useEffect } from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { api } from '../api/client'
import { useDebounce } from '../hooks/useApi'
import RiskBadge from '../components/common/RiskBadge'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { fmt, riskColor } from '../utils/formatters'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ positions: [], clubs: [], nationalities: [] })

  const [search, setSearch] = useState('')
  const [pozitie, setPozitie] = useState('')
  const [club, setClub] = useState('')
  const [nationalitate, setNationalitate] = useState('')
  const [sortBy, setSortBy] = useState('risk')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerDetail, setPlayerDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const debouncedSearch = useDebounce(search)

  useEffect(() => {
    setLoading(true)
    const params = { page, per_page: 20, sort_by: sortBy, order }
    if (debouncedSearch) params.search = debouncedSearch
    if (pozitie) params.pozitie = pozitie
    if (club) params.club = club
    if (nationalitate) params.nationalitate = nationalitate

    api.getPlayers(params)
      .then(data => {
        setPlayers(data.players)
        setTotal(data.total)
        setTotalPages(data.total_pages)
        setFilters(data.filters)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [debouncedSearch, pozitie, club, nationalitate, sortBy, order, page])

  const openPlayer = async (playerId) => {
    setSelectedPlayer(playerId)
    setDetailLoading(true)
    try {
      const data = await api.getPlayer(playerId)
      setPlayerDetail(data)
    } catch (e) {
      console.error(e)
    }
    setDetailLoading(false)
  }

  const resetFilters = () => {
    setSearch(''); setPozitie(''); setClub(''); setNationalitate('')
    setSortBy('risk'); setOrder('desc'); setPage(1)
  }

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Jucatori</h1>
        <p className="text-[13px] text-text-muted">{total} jucatori in baza de date</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Cauta jucator..."
            className="w-full pl-9 pr-3 py-2 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none"
          />
        </div>
        <select value={pozitie} onChange={e => { setPozitie(e.target.value); setPage(1) }} className="bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none">
          <option value="">Toate pozitiile</option>
          {filters.positions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={club} onChange={e => { setClub(e.target.value); setPage(1) }} className="bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none">
          <option value="">Toate cluburile</option>
          {filters.clubs.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none">
          <option value="risk">Sortare: Risc</option>
          <option value="injuries">Sortare: Accidentari</option>
          <option value="name">Sortare: Nume</option>
          <option value="age">Sortare: Varsta</option>
          <option value="fitness">Sortare: Fitness</option>
        </select>
        <button onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')} className="bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text hover:border-primary transition-all">
          {order === 'desc' ? 'Desc' : 'Asc'}
        </button>
        <button onClick={resetFilters} className="bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text hover:border-primary transition-all">Reset</button>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-bg2 border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-bg3">
                  {['Jucator', 'Club', 'Pozitie', 'Varsta', 'Accidentari', 'Scor Risc', 'Nivel Risc', 'Fitness'].map(h => (
                    <th key={h} className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted border-b border-border text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.player_id} onClick={() => openPlayer(p.player_id)} className="border-b border-border hover:bg-bg3 cursor-pointer transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-d flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                          {(p.nume || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-text font-medium text-sm">{p.nume}</div>
                          <div className="text-text-muted text-[10px]">{p.nationalitate}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-sm">{p.club}</td>
                    <td className="px-3.5 py-2.5 text-sm">{p.pozitie}</td>
                    <td className="px-3.5 py-2.5 text-sm">{p.varsta}</td>
                    <td className="px-3.5 py-2.5 text-sm font-semibold">{p.n_injuries}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-bg3 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(p.risk_score, 100)}%`, background: riskColor(p.risk_score) }} />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: riskColor(p.risk_score) }}>{p.risk_score}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5"><RiskBadge level={p.risk_level} color={p.risk_color} /></td>
                    <td className="px-3.5 py-2.5 text-sm">{p.scor_fitness ? p.scor_fitness.toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">Pagina {page} din {totalPages} ({total} total)</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2.5 py-1 bg-bg3 border border-border rounded text-sm text-text-muted hover:text-text disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2.5 py-1 bg-bg3 border border-border rounded text-sm text-text-muted hover:text-text disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-10 overflow-y-auto" onClick={() => { setSelectedPlayer(null); setPlayerDetail(null) }}>
          <div className="bg-bg2 border border-border rounded-xl w-full max-w-4xl m-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{playerDetail?.player?.nume || 'Se incarca...'}</h2>
              <button onClick={() => { setSelectedPlayer(null); setPlayerDetail(null) }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg3 border border-border text-text-muted hover:text-text">
                <X size={16} />
              </button>
            </div>

            {detailLoading || !playerDetail ? <LoadingSpinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Player Info + Risk */}
                <div className="space-y-4">
                  <div className="bg-bg3 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-text-muted">Club:</span> {playerDetail.player.club}</div>
                      <div><span className="text-text-muted">Pozitie:</span> {playerDetail.player.pozitie}</div>
                      <div><span className="text-text-muted">Varsta:</span> {playerDetail.player.varsta}</div>
                      <div><span className="text-text-muted">Nationalitate:</span> {playerDetail.player.nationalitate}</div>
                      <div><span className="text-text-muted">Inaltime:</span> {playerDetail.player.inaltime_cm} cm</div>
                      <div><span className="text-text-muted">Greutate:</span> {playerDetail.player.greutate_kg} kg</div>
                      <div><span className="text-text-muted">BMI:</span> {playerDetail.player.bmi?.toFixed(1)}</div>
                      <div><span className="text-text-muted">Fitness:</span> {playerDetail.player.scor_fitness?.toFixed(1)}</div>
                    </div>
                  </div>

                  {/* Risk Gauge */}
                  <div className="flex flex-col items-center gap-2">
                    <ResponsiveContainer width={200} height={120}>
                      <PieChart>
                        <Pie data={[{ value: playerDetail.risk_score }, { value: 100 - playerDetail.risk_score }]}
                          dataKey="value" startAngle={180} endAngle={0} cx="50%" cy="100%" innerRadius={60} outerRadius={90}>
                          <Cell fill={riskColor(playerDetail.risk_score)} />
                          <Cell fill="#21262d" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="text-center -mt-4">
                      <div className="text-4xl font-extrabold" style={{ color: riskColor(playerDetail.risk_score) }}>{playerDetail.risk_score}</div>
                      <RiskBadge level={playerDetail.risk_level} color={playerDetail.risk_color} />
                    </div>
                  </div>

                  {/* Injury Stats Pills */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: playerDetail.injury_stats.total, label: 'Total' },
                      { val: playerDetail.injury_stats.serious, label: 'Severe' },
                      { val: playerDetail.injury_stats.total_days, label: 'Zile' },
                      { val: playerDetail.injury_stats.surgeries, label: 'Operatii' },
                      { val: playerDetail.injury_stats.recurrences, label: 'Recidive' },
                    ].map((s, i) => (
                      <div key={i} className="bg-bg3 border border-border rounded-lg px-3 py-2 text-center">
                        <div className="text-lg font-bold">{s.val}</div>
                        <div className="text-[10px] text-text-muted">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Feature Importance + Timeline */}
                <div className="space-y-4">
                  <div className="bg-bg3 rounded-lg p-4">
                    <div className="text-xs font-semibold text-text-muted uppercase mb-3">Contributie Features (Top 8)</div>
                    <div className="space-y-2">
                      {(playerDetail.feature_contributions || []).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-text-muted w-32 truncate">{f.feature}</span>
                          <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(f.importance, 100)}%` }} />
                          </div>
                          <span className="text-text font-semibold w-10 text-right">{f.importance}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Injury Timeline */}
                  <div className="bg-bg3 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    <div className="text-xs font-semibold text-text-muted uppercase mb-3">Istoric accidentari</div>
                    <div className="relative pl-5 space-y-3">
                      <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-border" />
                      {(playerDetail.injuries || []).slice(0, 10).map((inj, i) => (
                        <div key={i} className="relative pl-4">
                          <div className="absolute -left-[11px] top-1 w-2.5 h-2.5 rounded-full border-2 border-bg3"
                            style={{ background: inj.severitate?.includes('Sever') ? '#ef4444' : inj.severitate?.includes('Moderat') ? '#f59e0b' : '#10b981' }} />
                          <div className="bg-bg border border-border rounded-lg p-2.5 text-xs">
                            <div className="font-semibold text-text">{inj.tip_accidentare}</div>
                            <div className="text-text-muted">{inj.parte_corp} - {inj.zile_absenta} zile</div>
                            <div className="text-text-muted text-[10px]">{inj.data_accidentare} | {inj.sezon}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
