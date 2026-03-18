export default function KPICard({ icon: Icon, iconColor = 'text-primary', value, label, sub }) {
  return (
    <div className="bg-bg2 border border-border rounded-xl px-5 py-4 relative overflow-hidden hover:border-primary hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center text-lg mb-3 ${iconColor} bg-current/15`}>
        <Icon size={20} className="text-current" />
      </div>
      <div className="text-[28px] font-bold leading-none mb-1">{value}</div>
      <div className="text-xs text-text-muted font-medium">{label}</div>
      {sub && <div className="text-[11px] text-text-muted mt-1.5">{sub}</div>}
    </div>
  )
}
