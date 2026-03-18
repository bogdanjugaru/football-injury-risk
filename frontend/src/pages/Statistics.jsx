import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApi } from '../hooks/useApi'
import { api } from '../api/client'
import LoadingSpinner from '../components/common/LoadingSpinner'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

const ChartCard = ({ title, description, children, className = '' }) => (
  <div className={`bg-bg2 border border-border rounded-xl p-4 ${className}`}>
    <div className="text-[13px] font-semibold text-text mb-1">{title}</div>
    {description && <p className="text-[11px] text-text-muted mb-3 leading-relaxed">{description}</p>}
    {children}
  </div>
)

const AnalysisBox = ({ children }) => (
  <div className="bg-bg3/50 border border-border/50 rounded-lg px-3 py-2.5 mt-3">
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
        <div key={i} className="text-text font-semibold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</div>
      ))}
    </div>
  )
}

export default function Statistics() {
  const { data, loading } = useApi(() => api.getStatistics())

  if (loading || !data) return <LoadingSpinner />

  const injTypeData = Object.entries(data.injury_types || {}).map(([name, value]) => ({ name, value }))
  const mechanismData = Object.entries(data.mechanism || {}).map(([name, value]) => ({ name, value }))
  const contextData = Object.entries(data.context || {}).map(([name, value]) => ({ name, value }))
  const surfaceData = Object.entries(data.surface || {}).map(([name, value]) => ({ name, value }))
  const weatherData = Object.entries(data.weather || {}).map(([name, value]) => ({ name, value }))
  const avgDaysData = Object.entries(data.avg_days_by_type || {}).map(([name, value]) => ({ name, value }))
  const posRiskData = Object.entries(data.position_risk || {}).map(([name, value]) => ({ name, value }))

  // Compute analysis insights
  const topInjType = injTypeData[0]
  const totalInjuries = injTypeData.reduce((s, d) => s + d.value, 0)
  const topMechanism = mechanismData.length > 0 ? mechanismData.reduce((a, b) => a.value > b.value ? a : b) : null
  const topContext = contextData.length > 0 ? contextData.reduce((a, b) => a.value > b.value ? a : b) : null
  const topSurface = surfaceData.length > 0 ? surfaceData.reduce((a, b) => a.value > b.value ? a : b) : null
  const longestAbsence = avgDaysData.length > 0 ? avgDaysData.reduce((a, b) => a.value > b.value ? a : b) : null
  const topWeather = weatherData.length > 0 ? weatherData.reduce((a, b) => a.value > b.value ? a : b) : null
  const highestRiskPos = posRiskData.length > 0 ? posRiskData.reduce((a, b) => a.value > b.value ? a : b) : null
  const byPosition = data.by_position || []
  const topPosition = byPosition.length > 0 ? byPosition.reduce((a, b) => a.n > b.n ? a : b) : null
  const byAge = data.by_age || []
  const topAge = byAge.length > 0 ? byAge.reduce((a, b) => a.n > b.n ? a : b) : null

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Statistici & Analiza Detaliata</h1>
        <p className="text-[13px] text-text-muted">Analiza aprofundata a accidentarilor si factorilor de risc pe baza a {totalInjuries} accidentari inregistrate</p>
      </div>

      {/* Row 1: Injury Types + Avg Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tipuri de accidentari (Top 15)"
          description="Distributia accidentarilor pe categorii diagnostice. Identificarea tipurilor predominante permite orientarea programelor de preventie.">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={injTypeData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {topInjType && <>Cel mai frecvent tip de accidentare este <strong className="text-text">{topInjType.name}</strong> cu {topInjType.value} cazuri ({(topInjType.value / totalInjuries * 100).toFixed(1)}% din total). Primele 3 tipuri reprezinta {((injTypeData.slice(0, 3).reduce((s, d) => s + d.value, 0) / totalInjuries) * 100).toFixed(1)}% din toate accidentarile, ceea ce indica o concentrare semnificativa pe anumite tipologii de leziuni.</>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Durata medie absenta per tip accidentare"
          description="Numarul mediu de zile de absenta asociat fiecarui tip de accidentare. Acest indicator reflecta severitatea si impactul real al fiecarui tip.">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={avgDaysData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {longestAbsence && <>Accidentarea cu cea mai lunga durata medie de absenta este <strong className="text-text">{longestAbsence.name}</strong> cu o medie de <strong className="text-text">{longestAbsence.value.toFixed(1)} zile</strong>. Aceste leziuni au un impact semnificativ asupra disponibilitatii jucatorilor si necesita protocoale de recuperare extinse.</>}
          </AnalysisBox>
        </ChartCard>
      </div>

      {/* Row 2: Mechanism + Context + Surface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Mecanism accidentare"
          description="Modul in care s-a produs accidentarea: contact direct, sprint, schimbare directie etc.">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={mechanismData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                {mechanismData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-1">
            {mechanismData.map((d, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-text-muted">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}
              </div>
            ))}
          </div>
          <AnalysisBox>
            {topMechanism && <>Mecanismul predominant este <strong className="text-text">{topMechanism.name}</strong> ({topMechanism.value} cazuri). Aceasta informatie este esentiala pentru designul exercitiilor de preventie si protocoalele de incalzire.</>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Context accidentare"
          description="Situatia in care s-a produs accidentarea: meci oficial, antrenament sau alt context.">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={contextData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                {contextData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-1">
            {contextData.map((d, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-text-muted">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[(i + 2) % COLORS.length] }} />{d.name}: {d.value}
              </div>
            ))}
          </div>
          <AnalysisBox>
            {topContext && <>Cele mai multe accidentari ({topContext.value}) au loc in contextul <strong className="text-text">{topContext.name}</strong>. Raportul meci/antrenament este un indicator important pentru managementul incarcarii.</>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Suprafata teren"
          description="Tipul suprafetei de joc pe care s-au produs accidentarile.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={surfaceData}>
              <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 9 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {topSurface && <>Suprafata <strong className="text-text">{topSurface.name}</strong> inregistreaza cele mai multe accidentari ({topSurface.value}). Tipul terenului influenteaza forta de impact si tractiunea, factori ce contribuie la riscul de leziuni musculare si articulare.</>}
          </AnalysisBox>
        </ChartCard>
      </div>

      {/* Row 3: Position + Age Group + Position Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Accidentari per pozitie"
          description="Numarul total de accidentari grupate pe pozitia pe teren a jucatorului.">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byPosition}>
              <XAxis dataKey="pozitie" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="n" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Accidentari" />
            </BarChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {topPosition && <>Pozitia <strong className="text-text">{topPosition.pozitie}</strong> inregistreaza cele mai multe accidentari ({topPosition.n}). Aceasta distributie reflecta atat numarul de jucatori pe fiecare pozitie cat si solicitarile fizice specifice rolului tactic.</>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Accidentari per grupa de varsta"
          description="Distributia accidentarilor pe intervale de varsta de 3 ani.">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byAge}>
              <XAxis dataKey="age_group" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="n" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Accidentari" />
            </BarChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {topAge && <>Grupa de varsta <strong className="text-text">{topAge.age_group}</strong> concentreaza cele mai multe accidentari ({topAge.n}). Literatura de specialitate confirma ca riscul creste semnificativ dupa 30 de ani datorita degradarii naturale a tesuturilor musculo-tendinoase.</>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Risc ML per pozitie"
          description="Scorul mediu de risc calculat de modelul de Machine Learning pentru fiecare pozitie.">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={posRiskData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {highestRiskPos && <>Conform modelului ML, pozitia cu cel mai mare risc mediu este <strong className="text-text">{highestRiskPos.name}</strong> (scor {highestRiskPos.value.toFixed(1)}). Acest scor integreaza toti factorii de risc analizati, nu doar frecventa accidentarilor.</>}
          </AnalysisBox>
        </ChartCard>
      </div>

      {/* Row 4: Surgery Rate + Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Rata interventii chirurgicale per tip"
          description="Procentul accidentarilor care au necesitat interventie chirurgicala, grupat pe tipul de accidentare.">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.surgery_rate_by_type || []} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="tip_accidentare" tick={{ fill: '#8b949e', fontSize: 10 }} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <AnalysisBox>
            {(data.surgery_rate_by_type || []).length > 0 && <>
              Tipul de accidentare cu cea mai mare rata de interventii chirurgicale este <strong className="text-text">{data.surgery_rate_by_type[0].tip_accidentare}</strong> ({data.surgery_rate_by_type[0].rate.toFixed(1)}%). Accidentarile care necesita interventie chirurgicala implica perioade de recuperare semnificativ mai lungi si un risc crescut de recidiva.
            </>}
          </AnalysisBox>
        </ChartCard>

        <ChartCard title="Conditii meteo"
          description="Distributia accidentarilor in functie de conditiile meteorologice la momentul producerii.">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={weatherData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2}>
                {weatherData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {weatherData.map((d, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px] text-text-muted">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}
              </div>
            ))}
          </div>
          <AnalysisBox>
            {topWeather && <>Cele mai multe accidentari ({topWeather.value}) s-au produs in conditii de <strong className="text-text">{topWeather.name}</strong>. Conditiile meteorologice afecteaza starea terenului, aderenta si capacitatea de termoregulare a organismului.</>}
          </AnalysisBox>
        </ChartCard>
      </div>
    </div>
  )
}
