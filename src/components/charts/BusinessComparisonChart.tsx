import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BusinessComparePoint } from '../../services/reportService'

const AXIS_STYLE = { fontSize: 11, fill: '#95806f' }

export function BusinessComparisonChart({ data }: { data: BusinessComparePoint[] }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3ede0" vertical={false} />
        <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#e9dfc9' }} />
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
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Sales" fill="#5c3a24" radius={[6, 6, 0, 0]} />
        <Bar dataKey="payments" name="Payments" fill="#d4af37" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#c84b31" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
