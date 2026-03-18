export const fmt = (n, decimals = 0) =>
  n == null ? '—' : Number(n).toLocaleString('ro-RO', { maximumFractionDigits: decimals })

export const riskColor = (score) => {
  if (score < 25) return '#10b981'
  if (score < 50) return '#f59e0b'
  if (score < 75) return '#ef4444'
  return '#7c3aed'
}

export const riskLevel = (score) => {
  if (score < 25) return { level: 'Scazut', color: 'success', css: 'text-success' }
  if (score < 50) return { level: 'Moderat', color: 'warning', css: 'text-warning' }
  if (score < 75) return { level: 'Ridicat', color: 'danger', css: 'text-danger' }
  return { level: 'Foarte Ridicat', color: 'critical', css: 'text-critical' }
}

export const riskBg = (color) => {
  const map = {
    success: 'bg-success/15 text-success border border-success/30',
    warning: 'bg-warning/15 text-warning border border-warning/30',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    critical: 'bg-critical/15 text-critical border border-critical/30',
  }
  return map[color] || map.warning
}

export const MODEL_NAMES = {
  logistic_regression: 'Logistic Regression',
  random_forest: 'Random Forest',
  xgboost: 'XGBoost',
  mlp: 'Rețea Neuronală (MLP)',
}

export const MODEL_COLORS = {
  logistic_regression: '#3b82f6',
  random_forest: '#10b981',
  xgboost: '#f59e0b',
  mlp: '#7c3aed',
}
