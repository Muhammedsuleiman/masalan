import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BusinessComparePoint } from '../../services/reportService'
import { useChartColors } from '../../lib/chartTheme'

export function BusinessComparisonChart({ data }: { data: BusinessComparePoint[] }) {
  const c = useChartColors()
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="name" tick={c.tick} stroke={c.axis} tickLine={false} axisLine={{ stroke: c.axisLine }} />
        <YAxis tick={c.tick} stroke={c.axis} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: c.tooltipBg,
            borderRadius: 12,
            border: `1px solid ${c.tooltipBorder}`,
            fontSize: 12,
            boxShadow: c.tooltipShadow,
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
