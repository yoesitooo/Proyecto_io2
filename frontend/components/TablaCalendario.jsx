"use client";

import { CheckCircle2, Clock } from "lucide-react";

export default function TablaCalendario({ calendario }) {
  if (!calendario || calendario.length === 0) return null;

  return (
    <div className="w-full bg-[#111] border border-[#333] rounded-xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-[#1a1a1a] text-gray-400 border-b border-[#333]">
            <tr>
              <th className="px-6 py-4 font-medium">Tarea</th>
              <th className="px-6 py-4 font-medium">Hospital</th>
              <th className="px-6 py-4 font-medium">Recurso</th>
              <th className="px-6 py-4 font-medium text-center">Inicio</th>
              <th className="px-6 py-4 font-medium text-center">Fin</th>
              <th className="px-6 py-4 font-medium text-center">Holgura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {calendario.map((row) => (
              <tr 
                key={row.id} 
                className={`hover:bg-[#1a1a1a] transition-colors ${row.critica ? "bg-[#1a1515]" : ""}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${row.critica ? "text-gray-100" : "text-gray-300"}`}>
                      {row.id}
                    </span>
                    {row.critica && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Crítica
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400">{row.hospital_nombre}</td>
                <td className="px-6 py-4">
                  <span className="capitalize">{row.recurso.replace("_", " ")}</span>
                </td>
                <td className="px-6 py-4 text-center">{row.inicio}</td>
                <td className="px-6 py-4 text-center font-medium text-gray-200">{row.fin}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {row.holgura === 0 ? (
                      <Clock className="w-4 h-4 text-red-400/70" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-400/70" />
                    )}
                    <span className={row.holgura === 0 ? "text-red-400/90" : "text-gray-400"}>
                      {row.holgura}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
