import { useTheme } from '../contexts/ThemeContext'

export function useChartColors() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    axis: dark ? '#c9b69c' : '#95806f',
    grid: dark ? '#43342a' : '#f3ede0',
    axisLine: dark ? '#57432f' : '#e9dfc9',
    tooltipBorder: dark ? '#57432f' : '#f3ede0',
    tooltipBg: dark ? '#33241c' : '#ffffff',
    tooltipShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(61,44,34,0.08)',
    tick: { fontSize: 11, fill: dark ? '#c9b69c' : '#95806f' },
  }
}