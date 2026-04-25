import { Users, Activity, Calendar, Scissors, RefreshCw, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LabelList } from 'recharts'
import { useApi } from '../hooks/useApi'
import { api } from '../api/client'
import KPICard from '../components/common/KPICard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { fmt } from '../utils/formatters'

const SEVERITY_COLORS = {
  'Usoara (1-7 zile)': '#10b981',
  'Moderata (8-28 zile)': '#f59e0b',
  'Severa (29-90 zile)': '#ef4444',
  'Foarte severa (>90 zile)': '#7c3aed',
}
const MONTHS = ['', 'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Culori distincte per sezon (ciclice daca sunt mai multe)
const SEASON_COLORS = [
  '#3b82f6', // albastru
  '#10b981', // verde
  '#f59e0b', // portocaliu
  '#ef4444', // rosu
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // portocaliu intens
  '#ec4899', // roz
  '#84cc16', // galben-verde
  '#6366f1', // indigo
]

const ChartCard = ({ title, description, children, className = '' }) => (
  <div className={`bg-bg2 border border-border rounded-xl p-4 ${className}`}>
    <div className="text-[13px] font-semibold text-text mb-1">{title}</div>
    {description && <p className="text-[11px] text-text-muted mb-2 leading-relaxed">{description}</p>}
    {children}
  </div>
)

const AnalysisBox = ({ children }) => (
  <div className="bg-bg3/50 border border-border/50 rounded-lg px-3 py-2 mt-3">
    <div className="text-[10px] font-semibold text-primary mb-1 uppercase tracking-wide">Analiza</div>
    <div className="text-[11px] text-text-muted leading-relaxed">{children}</div>
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg3 border border-border rounded-lg px-3 py-2 text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-text font-semibold">{p.value}</div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data, loading } = useApi(() => api.getDashboard())

  if (loading || !data) return <LoadingSpinner />

  const { kpis, by_season, severity_distribution, body_part_distribution, top_injured, monthly_trend } = data

  const severityData = Object.entries(severity_distribution).map(([name, value]) => ({
    name: name.split(' (')[0],
    fullName: name,
    value,
    fill: SEVERITY_COLORS[name] || '#3b82f6',
  }))

  const monthlyData = (monthly_trend || []).map(m => ({
    name: MONTHS[m._month || m.month] || m._month || m.month,
    count: m.count,
  }))

  const bodyPartData = Object.entries(body_part_distribution || {}).map(([name, value]) => ({ name, value }))

  // Compute insights
  const totalSeverity = severityData.reduce((s, d) => s + d.value, 0)
  const severePercent = severityData.filter(d => d.name === 'Severa' || d.name === 'Foarte severa').reduce((s, d) => s + d.value, 0)
  const peakMonth = monthlyData.length > 0 ? monthlyData.reduce((a, b) => a.count > b.count ? a : b) : null
  const lowMonth = monthlyData.length > 0 ? monthlyData.reduce((a, b) => a.count < b.count ? a : b) : null
  const topBodyPart = bodyPartData[0]
  const maxSeason = by_season?.length > 0 ? by_season.reduce((a, b) => a.count > b.count ? a : b) : null
  const minSeason = by_season?.length > 0 ? by_season.reduce((a, b) => a.count < b.count ? a : b) : null

  return (
    <div className="fade-in space-y-6">
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Dashboard</h1>
        <p className="text-[13px] text-text-muted">Prezentare generala a datelor si modelului ML - {kpis.total_players} jucatori, {kpis.total_injuries} accidentari analizate</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard icon={Users} value={fmt(kpis.total_players)} label="Jucatori" sub="in baza de date" />
        <KPICard icon={Activity} iconColor="text-danger" value={fmt(kpis.total_injuries)} label="Accidentari" sub="total inregistrate" />
        <KPICard icon={Calendar} iconColor="text-warning" value={fmt(kpis.avg_days_absent, 1)} label="Zile absenta (medie)" sub="per accidentare" />
        <KPICard icon={Scissors} iconColor="text-critical" value={`${kpis.surgery_rate}%`} label="Rata interventii" sub="chirurgicale" />
        <KPICard icon={RefreshCw} iconColor="text-warning" value={`${kpis.recurrence_rate}%`} label="Rata recidiva" sub="accidentari repetate" />
        <KPICard icon={AlertTriangle} iconColor="text-danger" value={fmt(kpis.high_risk_players)} label="Risc ridicat" sub="scor >= 50" />
      </div>

      {/* KPI Analysis */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[10px] font-semibold text-primary mb-1 uppercase tracking-wide">Sumar indicatori</div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Din totalul de <strong className="text-text">{kpis.total_players}</strong> jucatori monitorizati, au fost inregistrate <strong className="text-text">{kpis.total_injuries}</strong> accidentari,
          cu o medie de <strong className="text-text">{kpis.avg_days_absent}</strong> zile de absenta per incident.
          Rata interventiilor chirurgicale este de <strong className="text-text">{kpis.surgery_rate}%</strong>, iar rata de recidiva de <strong className="text-text">{kpis.recurrence_rate}%</strong>.
          In prezent, <strong className="text-text">{kpis.high_risk_players}</strong> jucatori ({(kpis.high_risk_players / kpis.total_players * 100).toFixed(1)}%) sunt clasificati cu risc ridicat de accidentare de catre modelul ML.
        </p>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Accidentari per sezon" description="Evolutia numarului de accidentari de-a lungul sezoanelor competitive." className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={by_season} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="sezon" tick={{ fill: '#8b949e', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {by_season.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SEASON_COLORS[index % SEASON_COLORS.length]} />
                ))}
                <LabelList dataKey="count" position="top" style={{ fill: '#8b949e', fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legenda sezoane */}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {by_season.map((s, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-text-muted">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SEASON_COLORS[i % SEASON_COLORS.length] }} />
                {s.sezon}
              </div>
            ))}
          </div>
          <AnalysisBox>
            {maxSeason && minSeason && <>Sezonul cu cele mai multe accidentari a fost <strong className="text-text">{maxSeason.sezon}</strong> ({maxSeason.count} cazuri), iar cel mai putin afectat a fost <strong className="text-text">{minSeason.sezon}</strong> ({minSeason.count} cazuri). Datele includ sezoanele 2024-25 si 2025-26 cu accidentari documentate din surse externe.</>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Distributie severitate" description="Clasificarea accidentarilor dupa durata de absenta.">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {severityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {severityData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
          <AnalysisBox>
            Accidentarile severe si foarte severe (peste 28 de zile absenta) reprezinta <strong className="text-text">{(severePercent / totalSeverity * 100).toFixed(1)}%</strong> din total ({severePercent} cazuri). Aceste leziuni au cel mai mare impact asupra performantei echipei si necesita programe de recuperare specializate.
          </AnalysisBox>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Top 10 jucatori accidentati" description="Jucatorii cu cel mai mare numar de accidentari inregistrate." className="lg:col-span-1">
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {(top_injured || []).map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-text-muted w-4">{i + 1}.</span>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-d flex items-center justify-center text-[10px] font-bold text-white">
                  {(p.nume || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-text font-medium truncate">{p.nume}</div>
                  <div className="text-text-muted text-[10px]">{p.club} - {p.pozitie}</div>
                </div>
                <span className="text-danger font-bold">{p.count}</span>
              </div>
            ))}
          </div>
          <AnalysisBox>
            {top_injured?.[0] && <>Jucatorul cu cele mai multe accidentari este <strong className="text-text">{top_injured[0].nume}</strong> ({top_injured[0].count} accidentari). Top 10 jucatori cumuleaza {top_injured.reduce((s, p) => s + p.count, 0)} accidentari, reprezentand {(top_injured.reduce((s, p) => s + p.count, 0) / kpis.total_injuries * 100).toFixed(1)}% din totalul inregistrat.</>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Parti ale corpului afectate" description="Distributia accidentarilor pe zone anatomice.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bodyPartData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {topBodyPart && <>Zona anatomica cea mai afectata este <strong className="text-text">{topBodyPart.name}</strong> cu {topBodyPart.value} accidentari ({(topBodyPart.value / kpis.total_injuries * 100).toFixed(1)}% din total). Membrele inferioare concentreaza marea majoritate a leziunilor, specific sporturilor cu solicitare predominant pe alergare.</>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Trend lunar accidentari" description="Distributia accidentarilor pe luni calendaristice.">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {peakMonth && lowMonth && <>Luna cu cele mai multe accidentari este <strong className="text-text">{peakMonth.name}</strong> ({peakMonth.count} cazuri), iar cea mai putina este <strong className="text-text">{lowMonth.name}</strong> ({lowMonth.count} cazuri). Perioadele de varf corespund fazelor intensive ale sezonului competitional si inceputului de pregatire.</>}
          </AnalysisBox>
        </ChartCard>
      </div>

      {/* Model Info Banner */}
      <div className="bg-bg2 border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
          <Activity size={20} />
        </div>
        <div>
          <div className="text-sm font-semibold">Model ML Activ</div>
          <div className="text-xs text-text-muted">
            Accuracy: {data.model_accuracy}% | AUC-ROC: {data.model_auc}% | Toate predictiile de risc sunt generate de modelul cu cea mai buna performanta din cei 4 algoritmi evaluati
          </div>
        </div>
      </div>
    </div>
  )
}
