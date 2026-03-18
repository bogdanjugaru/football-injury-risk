import { useState, useEffect } from 'react'
import { Target, AlertTriangle, CheckCircle, Clock, Activity, Scale, RefreshCw, Calendar, Search, User } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import { api } from '../api/client'
import RiskBadge from '../components/common/RiskBadge'
import { riskColor } from '../utils/formatters'

const ICON_MAP = {
  warning: AlertTriangle, check: CheckCircle, clock: Clock,
  activity: Activity, scale: Scale, refresh: RefreshCw, calendar: Calendar,
}

const defaultForm = {
  varsta: 25, bmi: 23, ani_experienta_pro: 5, scor_fitness: 75,
  pozitie: 'ST', inaltime_cm: 180, greutate_kg: 75,
  minute_jucate: 2000, meciuri_jucate: 25, distanta_totala_km: 300,
  sprinturi_totale: 1500, indice_incarcare: 60, cartonase_galbene: 3,
  total_prev_injuries: 1,
}

const fields = [
  { key: 'varsta', label: 'Varsta', min: 15, max: 45, step: 1 },
  { key: 'inaltime_cm', label: 'Inaltime (cm)', min: 155, max: 205, step: 1 },
  { key: 'greutate_kg', label: 'Greutate (kg)', min: 55, max: 100, step: 1 },
  { key: 'bmi', label: 'IMC (auto)', min: 15, max: 35, step: 0.1, computed: true },
  { key: 'scor_fitness', label: 'Scor Fitness', min: 0, max: 100, step: 1 },
  { key: 'ani_experienta_pro', label: 'Ani Experienta', min: 0, max: 25, step: 1 },
  { key: 'pozitie', label: 'Pozitie', type: 'select', options: ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'] },
  { key: 'meciuri_jucate', label: 'Meciuri jucate', min: 0, max: 60, step: 1 },
  { key: 'minute_jucate', label: 'Minute jucate', min: 0, max: 5000, step: 100 },
  { key: 'distanta_totala_km', label: 'Distanta (km)', min: 0, max: 500, step: 10 },
  { key: 'sprinturi_totale', label: 'Sprinturi totale', min: 0, max: 3000, step: 50 },
  { key: 'indice_incarcare', label: 'Indice incarcare', min: 0, max: 100, step: 1 },
  { key: 'cartonase_galbene', label: 'Cartonase galbene', min: 0, max: 20, step: 1 },
  { key: 'total_prev_injuries', label: 'Accidentari anterioare', min: 0, max: 20, step: 1 },
]

export default function Prediction() {
  const [mode, setMode] = useState('player') // 'player' or 'manual'
  const [form, setForm] = useState({ ...defaultForm })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 1) {
        const data = await api.searchPlayersForPrediction(searchQuery)
        setPlayers(data)
        setShowDropdown(true)
      } else {
        // Load all players when empty
        const data = await api.searchPlayersForPrediction('')
        setPlayers(data)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load initial players list
  useEffect(() => {
    api.searchPlayersForPrediction('').then(setPlayers)
  }, [])

  const selectPlayer = async (player) => {
    setSelectedPlayer(player)
    setSearchQuery(player.nume)
    setShowDropdown(false)
    setLoading(true)
    setResult(null)
    try {
      const data = await api.predictPlayer(player.player_id)
      setResult(data)
      // Also fill form with the data used
      if (data.input_used) {
        setForm(prev => ({ ...prev, ...data.input_used }))
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const updateField = (key, value) => {
    const newForm = { ...form, [key]: value }
    if (key === 'inaltime_cm' || key === 'greutate_kg') {
      const h = key === 'inaltime_cm' ? value : newForm.inaltime_cm
      const w = key === 'greutate_kg' ? value : newForm.greutate_kg
      newForm.bmi = parseFloat((w / ((h / 100) ** 2)).toFixed(1))
    }
    setForm(newForm)
  }

  const submitManual = async () => {
    setLoading(true)
    setSelectedPlayer(null)
    try {
      const data = await api.predictRisk(form)
      setResult(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const shapData = (result?.shap_values || []).slice(0, 12).map(s => ({
    name: s.feature.length > 25 ? s.feature.slice(0, 22) + '...' : s.feature,
    fullName: s.feature,
    value: s.shap_value,
    fill: s.shap_value > 0 ? '#ef4444' : '#10b981',
  }))

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Predictie Risc Accidentare</h1>
        <p className="text-[13px] text-text-muted">Selecteaza un jucator din baza de date sau introdu manual parametrii</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode('player')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${mode === 'player' ? 'bg-primary text-white' : 'bg-bg2 border border-border text-text-muted hover:text-text'}`}>
          <User size={15} /> Jucator din baza de date
        </button>
        <button onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${mode === 'manual' ? 'bg-primary text-white' : 'bg-bg2 border border-border text-text-muted hover:text-text'}`}>
          <Target size={15} /> Introducere manuala
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input */}
        <div className="space-y-4">
          {mode === 'player' ? (
            /* Player Search */
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Search size={16} className="text-primary" /> Cauta jucator
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Cauta dupa nume..."
                  className="w-full bg-bg3 border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
                />
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

              {/* Selected Player Info */}
              {selectedPlayer && result?.player && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 bg-bg3 rounded-lg p-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-d flex items-center justify-center text-base font-bold text-white">
                      {result.player.nume.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-base font-bold text-text">{result.player.nume}</div>
                      <div className="text-xs text-text-muted">{result.player.club} &bull; {result.player.pozitie} &bull; {result.player.nationalitate}</div>
                    </div>
                  </div>

                  {/* Player Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Varsta', value: result.player.varsta },
                      { label: 'Inaltime', value: `${result.player.inaltime_cm} cm` },
                      { label: 'Greutate', value: `${result.player.greutate_kg} kg` },
                      { label: 'BMI', value: result.player.bmi?.toFixed(1) },
                      { label: 'Fitness', value: result.player.scor_fitness },
                      { label: 'Pozitie', value: result.player.pozitie },
                    ].map((item, i) => (
                      <div key={i} className="bg-bg3/60 rounded-lg px-2.5 py-2 text-center">
                        <div className="text-[10px] text-text-muted">{item.label}</div>
                        <div className="text-sm font-bold text-text">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Injury Summary */}
                  {result.injury_summary && (
                    <div className="bg-bg3/60 rounded-lg p-3">
                      <div className="text-xs font-semibold text-text mb-2">Istoric accidentari</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between"><span className="text-text-muted">Total accidentari:</span><span className="font-bold text-danger">{result.injury_summary.total}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Severe:</span><span className="font-bold text-danger">{result.injury_summary.serious}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Zile absenta total:</span><span className="font-bold">{result.injury_summary.total_days}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Medie zile/accidentare:</span><span className="font-bold">{result.injury_summary.avg_days}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Recidive:</span><span className="font-bold text-warning">{result.injury_summary.recurrences}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Data Used for Prediction */}
                  {result.input_used && (
                    <div className="bg-bg3/60 rounded-lg p-3">
                      <div className="text-xs font-semibold text-text mb-2">Date utilizate pentru predictie (ultimul sezon)</div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {[
                          ['Meciuri jucate', result.input_used.meciuri_jucate],
                          ['Minute jucate', result.input_used.minute_jucate],
                          ['Distanta (km)', result.input_used.distanta_totala_km?.toFixed(1)],
                          ['Sprinturi', result.input_used.sprinturi_totale],
                          ['Indice incarcare', result.input_used.indice_incarcare?.toFixed(1)],
                          ['Cartonase galbene', result.input_used.cartonase_galbene],
                          ['Frecventa accidentari', result.input_used.injury_frequency?.toFixed(2)],
                          ['Rata recidiva', (result.input_used.recurrence_rate * 100)?.toFixed(1) + '%'],
                        ].map(([label, val], i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-text-muted">{label}:</span>
                            <span className="font-semibold text-text">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedPlayer && !loading && (
                <div className="mt-4 text-center text-text-muted text-xs py-8">
                  <User size={32} className="mx-auto mb-2 opacity-30" />
                  Selecteaza un jucator din lista pentru a-i calcula riscul de accidentare
                </div>
              )}
              {loading && (
                <div className="mt-4 text-center text-text-muted text-xs py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  Se calculeaza riscul...
                </div>
              )}
            </div>
          ) : (
            /* Manual Form */
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Target size={16} className="text-primary" /> Parametri jucator
              </div>
              <div className="grid grid-cols-2 gap-3">
                {fields.map(f => (
                  <div key={f.key}>
                    <label className="text-[11px] font-semibold text-text-muted block mb-1">{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={form[f.key]} onChange={e => updateField(f.key, e.target.value)}
                        className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary">
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type="number" value={form[f.key]} onChange={e => updateField(f.key, parseFloat(e.target.value) || 0)}
                        min={f.min} max={f.max} step={f.step} disabled={f.computed}
                        className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60" />
                    )}
                  </div>
                ))}
              </div>
              <button onClick={submitManual} disabled={loading}
                className="w-full mt-4 bg-primary hover:bg-primary-d text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50">
                {loading ? 'Se calculeaza...' : 'Calculeaza Riscul'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-4">
          {!result ? (
            <div className="bg-bg2 border border-border rounded-xl p-8 text-center text-text-muted">
              <Target size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">{mode === 'player' ? 'Selecteaza un jucator pentru a vedea predictia' : 'Completeaza formularul si apasa "Calculeaza Riscul"'}</p>
            </div>
          ) : (
            <>
              {/* Risk Gauge */}
              <div className="bg-bg2 border border-border rounded-xl p-5 flex flex-col items-center">
                <ResponsiveContainer width={220} height={130}>
                  <PieChart>
                    <Pie data={[{ value: result.risk_score }, { value: 100 - result.risk_score }]}
                      dataKey="value" startAngle={180} endAngle={0} cx="50%" cy="100%" innerRadius={65} outerRadius={95}>
                      <Cell fill={riskColor(result.risk_score)} />
                      <Cell fill="#21262d" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center -mt-4">
                  <div className="text-5xl font-extrabold" style={{ color: riskColor(result.risk_score) }}>{result.risk_score}</div>
                  <RiskBadge level={result.risk_level} color={result.risk_color} />
                  <div className="text-xs text-text-muted mt-1">Model: {result.model_used} | Confidence: {result.model_confidence}%</div>
                </div>
                {/* Interpretation */}
                <div className="mt-3 text-xs text-text-muted text-center max-w-xs leading-relaxed">
                  {result.risk_score < 25 && 'Riscul de accidentare este scazut. Jucatorul prezinta un profil favorabil cu parametri fizici si de incarcare in limite normale.'}
                  {result.risk_score >= 25 && result.risk_score < 50 && 'Riscul de accidentare este moderat. Se recomanda monitorizare periodica a indicatorilor de incarcare si recuperare adecvata intre meciuri.'}
                  {result.risk_score >= 50 && result.risk_score < 75 && 'Riscul de accidentare este ridicat. Factorii identificati indica o probabilitate crescuta de accidentare. Se recomanda reducerea volumului de antrenament.'}
                  {result.risk_score >= 75 && 'Riscul de accidentare este foarte ridicat. Jucatorul necesita atentie imediata, monitorizare zilnica si un program de preventie individualizat.'}
                </div>
              </div>

              {/* SHAP Waterfall */}
              {shapData.length > 0 && (
                <div className="bg-bg2 border border-border rounded-xl p-5">
                  <div className="text-sm font-semibold mb-1">Contributia fiecarei variabile la predictie (SHAP)</div>
                  <p className="text-[11px] text-text-muted mb-3">
                    Valorile SHAP arata cat de mult influenteaza fiecare factor decizia modelului.
                    <span className="text-danger font-semibold"> Rosu</span> = creste riscul,
                    <span className="text-success font-semibold"> Verde</span> = scade riscul.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={shapData} layout="vertical" margin={{ left: 10 }}>
                      <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 9 }} width={120} />
                      <ReferenceLine x={0} stroke="#30363d" />
                      <Tooltip content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="bg-bg3 border border-border rounded px-3 py-2 text-xs">
                            <div className="text-text-muted">{payload[0].payload.fullName}</div>
                            <div className="font-semibold" style={{ color: payload[0].payload.fill }}>SHAP: {payload[0].value.toFixed(4)}</div>
                            <div className="text-text-muted mt-0.5">{payload[0].value > 0 ? 'Creste riscul de accidentare' : 'Scade riscul de accidentare'}</div>
                          </div>
                        ) : null
                      } />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {shapData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Feature Importance */}
              <div className="bg-bg2 border border-border rounded-xl p-5">
                <div className="text-sm font-semibold mb-1">Top factori de risc</div>
                <p className="text-[11px] text-text-muted mb-3">
                  Importanta fiecarui factor in decizia modelului. Z-score indica cat de departe este valoarea jucatorului de media populatiei.
                </p>
                <div className="space-y-2">
                  {(result.top_features || []).slice(0, 6).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-text-muted w-28 truncate">{f.feature}</span>
                      <div className="flex-1 h-1.5 bg-bg3 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(f.importance, 100)}%` }} />
                      </div>
                      <span className="font-semibold w-10 text-right">{f.importance}%</span>
                      <span className={`text-[10px] w-12 text-right ${f.above_mean ? 'text-danger' : 'text-success'}`}>
                        z:{f.z_score} {f.above_mean ? '↑' : '↓'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-bg2 border border-border rounded-xl p-5">
                <div className="text-sm font-semibold mb-3">Recomandari personalizate</div>
                <div className="space-y-2">
                  {(result.recommendations || []).map((rec, i) => {
                    const IconComp = ICON_MAP[rec.icon] || AlertTriangle
                    return (
                      <div key={i} className="flex gap-2.5 items-start bg-bg3 border border-border rounded-lg px-3 py-2.5 text-[13px]">
                        <IconComp size={16} className="text-warning shrink-0 mt-0.5" />
                        <span>{rec.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
