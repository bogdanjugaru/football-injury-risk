const API_BASE = '/api'

async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  getDashboard: () => fetchApi('/dashboard'),
  getPlayers: (params) => fetchApi(`/players?${new URLSearchParams(params)}`),
  getPlayer: (id) => fetchApi(`/players/${id}`),
  getPlayerShap: (id) => fetchApi(`/players/${id}/shap`),
  predictRisk: (data) => fetchApi('/prediction/risk', { method: 'POST', body: JSON.stringify(data) }),
  searchPlayersForPrediction: (q) => fetchApi(`/players/search?q=${encodeURIComponent(q || '')}`),
  predictPlayer: (id) => fetchApi(`/players/${id}/predict`),
  getPredictionHistory: (params) => fetchApi(`/predictions/history?${new URLSearchParams(params || {})}`),
  getStatistics: () => fetchApi('/statistics'),
  getModelInfo: () => fetchApi('/model/info'),
  getModelComparison: () => fetchApi('/model/comparison'),
  getROCCurves: () => fetchApi('/model/roc-curves'),
  getConfusionMatrices: () => fetchApi('/model/confusion'),
  getGlobalShap: () => fetchApi('/model/shap/global'),
}
