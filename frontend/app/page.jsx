"use client";

import { useEffect, useState } from "react";
import TablaCalendario from "@/components/TablaCalendario";
import PerfilRecursos from "@/components/PerfilRecursos";
import ChatAgente from "@/components/ChatAgente";
import { Activity, Clock, Box } from "lucide-react";

export default function Dashboard() {
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/resultados.json")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar los resultados. Asegúrate de haber corrido el modelo en Python primero.");
        return res.json();
      })
      .then((data) => {
        setResultados(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400 flex items-center gap-2">
          <Activity className="w-5 h-5 animate-pulse" /> Cargando dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#111] border border-red-500/20 p-6 rounded-xl max-w-md text-center">
          <h2 className="text-red-400 font-semibold mb-2">Error</h2>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-gray-200 font-sans p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <header className="border-b border-[#222] pb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            Distribución de Recursos Hospitalarios
          </h1>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-[#111] border border-[#333] px-5 py-3 rounded-lg flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Makespan Óptimo</p>
                <p className="text-xl font-semibold">{resultados?.meta?.makespan_milp} días</p>
              </div>
            </div>

            <div className="bg-[#111] border border-[#333] px-5 py-3 rounded-lg flex items-center gap-3">
              <Box className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Estado MILP</p>
                <p className="text-xl font-semibold text-green-400/90">{resultados?.meta?.status_milp}</p>
              </div>
            </div>

            <div className="bg-[#111] border border-[#333] px-5 py-3 rounded-lg flex items-center gap-3">
              <Activity className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Ruta Crítica</p>
                <p className="text-sm font-semibold max-w-[200px] truncate" title={resultados?.ruta_critica?.join(" -> ")}>
                  {resultados?.ruta_critica?.join(" -> ")}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                Calendario de Asignaciones
              </h2>
              <TablaCalendario calendario={resultados?.calendario} />
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Perfil de Uso de Recursos</h2>
              <PerfilRecursos 
                horizonte={resultados?.meta?.horizonte} 
                perfil_recursos={resultados?.perfil_recursos} 
                recursos_disponibles={resultados?.recursos_disponibles}
              />
            </section>
          </div>

          {/* Sidebar - Agent (1/3 width on desktop) */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-white mb-4">Asistente IA</h2>
            <div className="sticky top-6">
              <ChatAgente resultados={resultados} />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
