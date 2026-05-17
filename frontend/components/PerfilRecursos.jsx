"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

export default function PerfilRecursos({ recursos_disponibles, perfil_recursos, horizonte }) {
  if (!perfil_recursos || !horizonte) return null;

  // Transformar datos para Recharts
  const data = [];
  for (let t = 0; t < horizonte; t++) {
    const dayData = { day: \`Día \${t + 1}\` };
    Object.keys(perfil_recursos).forEach((r) => {
      dayData[r] = perfil_recursos[r][t];
    });
    data.push(dayData);
  }

  // Paleta monocromática
  const colors = {
    ventilador: "#888888",
    rayos_x: "#aaaaaa",
    monitor: "#555555"
  };

  return (
    <div className="w-full bg-[#111] border border-[#333] rounded-xl p-6 shadow-2xl">
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="day" stroke="#666" tick={{ fill: '#888' }} axisLine={{ stroke: '#333' }} />
            <YAxis stroke="#666" tick={{ fill: '#888' }} axisLine={{ stroke: '#333' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', color: '#fff' }}
              itemStyle={{ color: '#ccc' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {Object.keys(perfil_recursos).map((key) => (
              <Bar 
                key={key} 
                dataKey={key} 
                stackId="a" 
                fill={colors[key] || "#888"} 
                name={key.replace("_", " ").toUpperCase()} 
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
