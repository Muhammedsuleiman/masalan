import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#5c3a24', '#d4af37']

export function PaymentMethodChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  if (total <= 0) return null

  return (
    <div className="flex items-center gap-2">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #f3ede0',
              fontSize: 12,
              boxShadow: '0 8px 24px rgba(61,44,34,0.08)',
            }}
            formatter={(value) => `₦${Number(value).toLocaleString('en-NG')}`}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 pr-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="font-medium text-ink">{d.name}</span>
            <span className="ml-2 font-bold text-brand-950">₦{d.value.toLocaleString('en-NG')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
