"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltip = {
  contentStyle: { background: "#16213a", border: "1px solid #22304d", borderRadius: 10, fontSize: 12, color: "#e6ebf5" },
  itemStyle: { color: "#e6ebf5" },
  labelStyle: { color: "#8b98b3" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};
const axis = { stroke: "#5d6b88", fontSize: 11, tickLine: false, axisLine: false } as const;

export function StatusDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return <p className="py-16 text-center text-sm text-muted">No tasks yet.</p>;
  return (
    <div className="relative h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="85%" paddingAngle={2} stroke="none">
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip {...tooltip} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#8b98b3" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
        <p className="text-2xl font-semibold">{total}</p>
        <p className="text-xs text-muted">tasks</p>
      </div>
    </div>
  );
}

export function WorkloadBars({ data, series }: { data: Record<string, string | number>[]; series: { key: string; name: string; color: string }[] }) {
  if (!data.length) return <p className="py-16 text-center text-sm text-muted">No employees yet.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -20, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#22304d" />
          <XAxis dataKey="name" {...axis} interval={0} tickFormatter={(v: string) => v.split(" ")[0]} />
          <YAxis {...axis} allowDecimals={false} />
          <Tooltip {...tooltip} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#8b98b3" }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={i === series.length - 1 ? [6, 6, 0, 0] : 0} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompletedArea({ data }: { data: { day: string; count: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#22304d" />
          <XAxis dataKey="day" {...axis} interval={2} />
          <YAxis {...axis} allowDecimals={false} />
          <Tooltip {...tooltip} />
          <Area type="monotone" dataKey="count" name="Completed" stroke="#10b981" strokeWidth={2} fill="url(#g)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
