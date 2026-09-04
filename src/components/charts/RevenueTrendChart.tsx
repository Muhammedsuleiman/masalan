import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DayPoint } from '../../services/reportService'

const AXIS_STYLE = { fontSize: 11, fill: '#95806f' }

export function RevenueTrendChart({ data }: { data: DayPoint[] }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5c3a24" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#5c3a24" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPayments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3ede0" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#e9dfc9' }} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #f3ede0',
            fontSize: 12,
            boxShadow: '0 8px 24px rgba(61,44,34,0.08)',
          }}
          formatter={(value) => `₦${Number(value).toLocaleString('en-NG')}`}
        />
        <Area type="monotone" dataKey="revenue" name="Sales" stroke="#5c3a24" strokeWidth={2} fill="url(#gradRevenue)" />
        <Area type="monotone" dataKey="payments" name="Payments" stroke="#d4af37" strokeWidth={2} fill="url(#gradPayments)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
