import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { SkeletonChart } from './Skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts'

const COLORS = {
  safety: '#ffc342',
  danger: '#ef4444',
  paper: '#e8e2d8',
  muted: '#8a8580',
  teal: '#2dd4bf',
  graphite: '#6b6660',
}

const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#ffc342',
  Low: '#2dd4bf',
}

const CONDITION_COLORS = {
  Excellent: '#2dd4bf',
  Good: '#22c55e',
  Fair: '#ffc342',
  Poor: '#f97316',
  Unsafe: '#ef4444',
}

export default function DashboardCharts() {
  const [loading, setLoading] = useState(true)
  const [issuesByPriority, setIssuesByPriority] = useState([])
  const [assetCondition, setAssetCondition] = useState([])
  const [issuesOverTime, setIssuesOverTime] = useState([])
  const [technicianWorkload, setTechnicianWorkload] = useState([])

  useEffect(() => {
    loadChartData()
  }, [])

  async function loadChartData() {
    if (!supabase) { setLoading(false); return }

    // Issues by priority
    const { data: issues } = await supabase.from('issues').select('priority, status, created_at')
    const byPriority = (issues || []).reduce((acc, i) => {
      acc[i.priority] = (acc[i.priority] || 0) + 1
      return acc
    }, {})
    setIssuesByPriority(
      Object.entries(byPriority).map(([name, value]) => ({ name, value }))
    )

    // Asset condition
    const { data: assets } = await supabase.from('assets').select('condition')
    const byCondition = (assets || []).reduce((acc, a) => {
      acc[a.condition] = (acc[a.condition] || 0) + 1
      return acc
    }, {})
    setAssetCondition(
      Object.entries(byCondition).map(([name, value]) => ({ name, value }))
    )

    // Issues over time (last 7 days)
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().split('T')[0]
    })
    const byDay = (issues || []).reduce((acc, i) => {
      const day = i.created_at?.split('T')[0]
      if (day && last7.includes(day)) acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})
    setIssuesOverTime(
      last7.map((day) => ({
        day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        count: byDay[day] || 0,
      }))
    )

    // Technician workload
    const { data: profiles } = await supabase.from('profiles').select('id, full_name')
    const openIssues = (issues || []).filter((i) => !['Resolved', 'Closed'].includes(i.status))
    const byTech = openIssues.reduce((acc, i) => {
      if (i.assigned_technician) {
        acc[i.assigned_technician] = (acc[i.assigned_technician] || 0) + 1
      }
      return acc
    }, {})

    // Add technician names
    setTechnicianWorkload(
      (profiles || [])
        .filter((p) => byTech[p.id])
        .map((p) => ({
          name: p.full_name.split(' ')[0],
          open: byTech[p.id],
        }))
        .sort((a, b) => b.open - a.open)
        .slice(0, 8)
    )

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {/* Issues by Priority */}
      <div className="asset-tag p-5">
        <h3 className="font-semibold mb-4">Issues by priority</h3>
        {issuesByPriority.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={issuesByPriority}>
              <XAxis dataKey="name" tick={{ fill: '#8a8580', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#8a8580', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3a3530', borderRadius: 8 }}
                labelStyle={{ color: '#e8e2d8' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {issuesByPriority.map((entry) => (
                  <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || COLORS.muted} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Asset Condition */}
      <div className="asset-tag p-5">
        <h3 className="font-semibold mb-4">Asset condition</h3>
        {assetCondition.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={assetCondition}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {assetCondition.map((entry) => (
                  <Cell key={entry.name} fill={CONDITION_COLORS[entry.name] || COLORS.muted} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3a3530', borderRadius: 8 }}
                labelStyle={{ color: '#e8e2d8' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#8a8580' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Issues Over Time */}
      <div className="asset-tag p-5">
        <h3 className="font-semibold mb-4">Issues reported (last 7 days)</h3>
        {issuesOverTime.every((d) => d.count === 0) ? (
          <p className="py-8 text-center text-sm text-muted">No issues this week.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={issuesOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3530" />
              <XAxis dataKey="day" tick={{ fill: '#8a8580', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#8a8580', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3a3530', borderRadius: 8 }}
                labelStyle={{ color: '#e8e2d8' }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={COLORS.safety}
                strokeWidth={2}
                dot={{ fill: COLORS.safety, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Technician Workload */}
      <div className="asset-tag p-5">
        <h3 className="font-semibold mb-4">Technician workload (open issues)</h3>
        {technicianWorkload.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No assigned issues.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={technicianWorkload} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fill: '#8a8580', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8a8580', fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3a3530', borderRadius: 8 }}
                labelStyle={{ color: '#e8e2d8' }}
              />
              <Bar dataKey="open" radius={[0, 4, 4, 0]} fill={COLORS.teal} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
  )
}
