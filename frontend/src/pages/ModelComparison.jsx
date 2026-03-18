import { useState } from 'react'
import { Trophy, CheckCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'
import { useApi } from '../hooks/useApi'
import { api } from '../api/client'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { MODEL_NAMES, MODEL_COLORS } from '../utils/formatters'

const METRICS = [
  { key: 'accuracy', label: 'Accuracy (%)' },
  { key: 'auc_roc', label: 'AUC-ROC (%)' },
  { key: 'precision', label: 'Precision (%)' },
  { key: 'recall', label: 'Recall (%)' },
  { key: 'f1', label: 'F1-Score (%)' },
]

const ConfusionMatrix = ({ matrix, name, color }) => {
  if (!matrix || matrix.length < 2) return null
  const [[tn, fp], [fn, tp]] = matrix
  const cells = [
    { val: tn, label: 'TN', bg: 'bg-success/20 text-success' },
    { val: fp, label: 'FP', bg: 'bg-danger/20 text-danger' },
    { val: fn, label: 'FN', bg: 'bg-danger/20 text-danger' },
    { val: tp, label: 'TP', bg: 'bg-success/20 text-success' },
  ]

  return (
    <div className="bg-bg2 border border-border rounded-xl p-4">
      <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        {MODEL_NAMES[name] || name}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {cells.map((c, i) => (
          <div key={i} className={`${c.bg} rounded-lg p-3 text-center`}>
            <div className="text-xl font-bold">{c.val}</div>
            <div className="text-[10px] opacity-70">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-text-muted mt-1 px-1">
        <span>Pred: 0 / 1</span>
        <span>Actual: 0 / 1</span>
      </div>
    </div>
  )
}

export default function ModelComparison() {
  const { data: compData, loading: l1 } = useApi(() => api.getModelComparison())
  const { data: rocData, loading: l2 } = useApi(() => api.getROCCurves())
  const { data: cmData, loading: l3 } = useApi(() => api.getConfusionMatrices())
  const { data: shapData, loading: l4 } = useApi(() => api.getGlobalShap())

  if (l1 || l2 || l3 || l4) return <LoadingSpinner />

  const models = compData?.models || []
  const bestModel = models.find(m => m.is_best)

  // Build ROC curve data
  const rocChartData = []
  if (rocData) {
    const allFpr = new Set([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1])
    Object.entries(rocData).forEach(([name, curve]) => {
      if (curve?.fpr) curve.fpr.forEach(v => allFpr.add(Math.round(v * 100) / 100))
    })

    const sortedFpr = [...allFpr].sort((a, b) => a - b)
    sortedFpr.forEach(fpr => {
      const point = { fpr: Math.round(fpr * 100) / 100 }
      Object.entries(rocData).forEach(([name, curve]) => {
        if (!curve?.fpr) return
        let bestTpr = 0
        for (let i = 0; i < curve.fpr.length; i++) {
          if (curve.fpr[i] <= fpr) bestTpr = curve.tpr[i]
        }
        point[name] = Math.round(bestTpr * 100) / 100
      })
      rocChartData.push(point)
    })
  }

  // Feature importance comparison data
  const featureImportanceData = []
  if (models.length > 0) {
    const allFeatures = new Set()
    models.forEach(m => Object.keys(m.feature_importances || {}).forEach(f => allFeatures.add(f)))
    allFeatures.forEach(f => {
      const entry = { name: f.length > 20 ? f.slice(0, 17) + '...' : f }
      models.forEach(m => { entry[m.name] = m.feature_importances?.[f] || 0 })
      featureImportanceData.push(entry)
    })
    featureImportanceData.sort((a, b) => {
      const maxA = Math.max(...models.map(m => a[m.name] || 0))
      const maxB = Math.max(...models.map(m => b[m.name] || 0))
      return maxB - maxA
    })
  }

  // SHAP data
  const shapChartData = shapData?.shap_values
    ? Object.entries(shapData.shap_values)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 12)
        .map(([name, val]) => ({ name: name.length > 22 ? name.slice(0, 19) + '...' : name, value: val }))
    : []

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-text m-0 mb-1">Comparare Modele ML</h1>
        <p className="text-[13px] text-text-muted">
          Analiza comparativa a {models.length} algoritmi de Machine Learning
        </p>
      </div>

      {/* Best Model Banner */}
      {bestModel && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3">
          <Trophy size={20} className="text-primary" />
          <div>
            <span className="text-sm font-semibold">Cel mai bun model: </span>
            <span className="text-primary font-bold">{MODEL_NAMES[bestModel.name] || bestModel.name}</span>
            <span className="text-text-muted text-sm ml-2">AUC-ROC: {bestModel.auc_roc}% | F1: {bestModel.f1}%</span>
          </div>
        </div>
      )}

      {/* Metrics Table */}
      <div className="bg-bg2 border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="text-sm font-semibold">Tabel comparativ metrici</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg3">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-text-muted">Metrica</th>
                {models.map(m => (
                  <th key={m.name} className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase text-text-muted">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: MODEL_COLORS[m.name] }} />
                      {MODEL_NAMES[m.name] || m.name}
                      {m.is_best && <Trophy size={12} className="text-primary" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(metric => {
                const best = Math.max(...models.map(m => m[metric.key] || 0))
                return (
                  <tr key={metric.key} className="border-b border-border">
                    <td className="px-4 py-3 text-sm font-medium">{metric.label}</td>
                    {models.map(m => {
                      const val = m[metric.key] || 0
                      const isBest = val === best
                      return (
                        <td key={m.name} className="px-4 py-3 text-center">
                          <span className={`text-sm font-semibold ${isBest ? 'text-success' : 'text-text'}`}>
                            {val.toFixed(1)}%
                          </span>
                          {isBest && <CheckCircle size={12} className="inline ml-1 text-success" />}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* CV Scores */}
              <tr className="border-b border-border bg-bg3/50">
                <td className="px-4 py-3 text-sm font-medium">CV AUC-ROC (5-fold)</td>
                {models.map(m => (
                  <td key={m.name} className="px-4 py-3 text-center text-sm">
                    {m.cv_scores?.mean?.toFixed(1)}% <span className="text-text-muted">(+/-{m.cv_scores?.std?.toFixed(1)}%)</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ROC Curves */}
      <div className="bg-bg2 border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-4">Curbe ROC (Receiver Operating Characteristic)</div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={rocChartData}>
            <XAxis dataKey="fpr" tick={{ fill: '#8b949e', fontSize: 10 }} label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5, fill: '#8b949e', fontSize: 11 }} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 8, fontSize: 11, color: '#e6edf3' }} />
            <Legend />
            {/* Diagonal */}
            <Line dataKey="fpr" name="Random (AUC=0.5)" stroke="#30363d" strokeDasharray="5 5" dot={false} />
            {models.map(m => (
              <Line key={m.name} dataKey={m.name}
                name={`${MODEL_NAMES[m.name]} (AUC=${(m.auc_roc / 100).toFixed(2)})`}
                stroke={MODEL_COLORS[m.name]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Confusion Matrices */}
      <div>
        <div className="text-sm font-semibold mb-4">Matrici de Confuzie</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cmData && Object.entries(cmData).map(([name, matrix]) => (
            <ConfusionMatrix key={name} matrix={matrix} name={name} color={MODEL_COLORS[name]} />
          ))}
        </div>
      </div>

      {/* Feature Importance Comparison */}
      <div className="bg-bg2 border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-4">Importanta Features - Comparatie</div>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={featureImportanceData.slice(0, 15)} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 9 }} width={120} />
            <Tooltip contentStyle={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 8, fontSize: 11, color: '#e6edf3' }} />
            <Legend />
            {models.map(m => (
              <Bar key={m.name} dataKey={m.name} name={MODEL_NAMES[m.name]} fill={MODEL_COLORS[m.name]} radius={[0, 2, 2, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SHAP Global */}
      {shapChartData.length > 0 && (
        <div className="bg-bg2 border border-border rounded-xl p-5">
          <div className="text-sm font-semibold mb-1">SHAP - Importanta Globala (Best Model)</div>
          <div className="text-xs text-text-muted mb-4">Mean |SHAP value| - contributia medie a fiecarei variabile la predictie</div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={shapChartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 9 }} width={120} />
              <Tooltip contentStyle={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 8, fontSize: 11, color: '#e6edf3' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Methodology */}
      <div className="bg-bg2 border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-3">Metodologie</div>
        <div className="text-xs text-text-muted space-y-2 leading-relaxed">
          <p><strong className="text-text">Date:</strong> {models[0]?.training_samples + models[0]?.test_samples || 0} observatii (80% antrenare, 20% testare). Target binar: accidentare severa (29+ zile) in sezonul curent.</p>
          <p><strong className="text-text">Feature Engineering:</strong> 24 features derivate din date demografice, performanta sportiva, istoric accidentari si metrici de incarcare fizica.</p>
          <p><strong className="text-text">Evaluare:</strong> Stratified 5-Fold Cross-Validation cu AUC-ROC ca metrica principala (robusta la dezechilibrul claselor).</p>
          <p><strong className="text-text">Modele:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Logistic Regression</strong> - Model liniar cu regularizare L2. Baseline robust si interpretabil.</li>
            <li><strong>Random Forest</strong> - Ansamblu de 300 arbori de decizie cu bagging. Rezistent la overfitting.</li>
            <li><strong>XGBoost</strong> - Gradient boosting optimizat. Performant pe date tabulare.</li>
            <li><strong>MLP (Neural Network)</strong> - Retea neuronala cu 2 straturi ascunse (64, 32 neuroni). Capteaza relatii neliniare complexe.</li>
          </ul>
          <p><strong className="text-text">Explainability:</strong> SHAP (SHapley Additive exPlanations) pentru interpretarea contributiei fiecarei variabile la predictia modelului.</p>
        </div>
      </div>
    </div>
  )
}
