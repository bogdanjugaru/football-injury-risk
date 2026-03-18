import { Brain, Database, Layers, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useApi } from '../hooks/useApi'
import { api } from '../api/client'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { MODEL_NAMES } from '../utils/formatters'

export default function ModelInfo() {
  const { data, loading } = useApi(() => api.getModelInfo())

  if (loading || !data) return <LoadingSpinner />

  const importanceData = Object.entries(data.feature_importances || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name: name.length > 25 ? name.slice(0, 22) + '...' : name,
      value: parseFloat(value),
    }))

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Model ML - Informatii</h1>
        <p className="text-[13px] text-text-muted">Detalii tehnice despre modelul de Machine Learning activ</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Target, label: 'Accuracy', value: `${data.accuracy}%`, color: 'text-success' },
          { icon: Brain, label: 'AUC-ROC', value: `${data.auc_roc}%`, color: 'text-primary' },
          { icon: Layers, label: 'Precision', value: `${data.precision}%`, color: 'text-warning' },
          { icon: Database, label: 'F1-Score', value: `${data.f1}%`, color: 'text-critical' },
        ].map((m, i) => (
          <div key={i} className="bg-bg3 border border-border rounded-xl p-4 text-center">
            <m.icon size={20} className={`mx-auto mb-2 ${m.color}`} />
            <div className="text-[32px] font-extrabold leading-none mb-1">{m.value}</div>
            <div className="text-[11px] text-text-muted uppercase tracking-wider">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Training Details */}
        <div className="bg-bg2 border border-border rounded-xl p-5">
          <div className="text-sm font-semibold mb-4">Detalii antrenare</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Algoritm</span>
              <span className="font-semibold">{MODEL_NAMES[data.algorithm] || data.algorithm}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Numar features</span>
              <span className="font-semibold">{data.n_features}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Samples antrenare</span>
              <span className="font-semibold">{data.training_samples}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Samples testare</span>
              <span className="font-semibold">{data.test_samples}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Distributie target</span>
              <span className="font-semibold">
                {data.target_distribution?.class_0 || 0} neg / {data.target_distribution?.class_1 || 0} poz
              </span>
            </div>
            {data.hyperparameters && Object.entries(data.hyperparameters).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">{k}</span>
                <span className="font-semibold">{JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Importances */}
        <div className="bg-bg2 border border-border rounded-xl p-5">
          <div className="text-sm font-semibold mb-4">Feature Importances</div>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={importanceData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 9 }} width={130} />
              <Tooltip contentStyle={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 8, fontSize: 11, color: '#e6edf3' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Available Positions */}
      <div className="bg-bg2 border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-3">Pozitii in model</div>
        <div className="flex flex-wrap gap-2">
          {(data.positions || []).map(p => (
            <span key={p} className="bg-bg3 border border-border rounded-lg px-3 py-1 text-xs font-medium">{p}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
