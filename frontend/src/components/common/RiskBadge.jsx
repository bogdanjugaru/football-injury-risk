import { riskBg } from '../../utils/formatters'

export default function RiskBadge({ level, color }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${riskBg(color)}`}>
      {level}
    </span>
  )
}
