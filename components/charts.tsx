"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";
import * as d3 from "d3";
import { departmentWinRates, monthlyBidVolume } from "@/lib/data";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 30px rgba(15,23,42,.12)"
};

export function DepartmentWinChart() {
  const data = useMemo(() => {
    const scale = d3.scaleLinear().domain([0, 100]).range([0, 100]);
    return departmentWinRates.map((item) => ({ ...item, normalized: Math.round(scale(item.winRate)) }));
  }, []);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 18 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
        <YAxis type="category" dataKey="department" width={92} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Win rate"]} />
        <Bar dataKey="winRate" fill="#1976d2" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBidChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={monthlyBidVolume} margin={{ left: 4, right: 18 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="bids" name="Bids" fill="#1976d2" radius={[6, 6, 0, 0]} />
        <Bar dataKey="won" name="Won" fill="#1c9a7d" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
