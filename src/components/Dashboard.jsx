import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from "lucide-react";

const API_URL = "https://xkakdskzq0.execute-api.us-east-2.amazonaws.com/data";

export const Dashboard = () => {
  const [allData, setAllData] = useState([]);
  const [sector, setSector] = useState("norte");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [daysRange, setDaysRange] = useState(7);
  const [dataInfo, setDataInfo] = useState({ count: 0, scannedAll: false });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const hasta = new Date();
        const desde = new Date();
        desde.setDate(desde.getDate() - daysRange);
        
        const desdeStr = desde.toISOString().split('.')[0];
        const hastaStr = hasta.toISOString().split('.')[0];
        
        const url = `${API_URL}?sector=${sector}&desde=${desdeStr}&hasta=${hastaStr}&fetchAll=true`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al cargar datos');
        
        const response = await res.json();
        
        const jsonData = response.items || response;
        
        const ordered = jsonData.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        setAllData(ordered);
        setDataInfo({
          count: response.count || ordered.length,
          scannedAll: response.scannedAll !== false
        });
        setSelectedDayIndex(0);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [sector, daysRange]);

  if (loading) return (
    <div className="text-center mt-10">
      <RefreshCw className="animate-spin mx-auto mb-4 text-indigo-600" size={40} />
      <p className="text-lg text-gray-600">Cargando datos del sector {sector}...</p>
      <p className="text-sm text-gray-500 mt-2">Últimos {daysRange} días</p>
    </div>
  );
  
  if (error) return (
    <div className="text-center mt-10">
      <p className="text-red-600 text-lg mb-4">Error: {error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Reintentar
      </button>
    </div>
  );

  if (allData.length === 0) return (
    <div className="text-center mt-10">
      <p className="text-lg mb-4">No hay datos para el sector {sector}</p>
      <button 
        onClick={() => setDaysRange(30)}
        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
      >
        Intentar cargar 30 días
      </button>
    </div>
  );

  const umbralHorasFrio = 7;

  // Agrupar datos por día
  const dataByDay = {};
  allData.forEach(d => {
    if (typeof d.temperatura !== 'number' || !d.timestamp) return;
    // Convertir a fecha local de Chile
    const localDate = new Date(d.timestamp);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate() + 1).padStart(2, '0');
    const fecha = `${year}-${month}-${day}`;
    
    if (!dataByDay[fecha]) {
      dataByDay[fecha] = [];
    }
    dataByDay[fecha].push(d);
  });

  const sortedDays = Object.keys(dataByDay).sort((a, b) => b.localeCompare(a));
  
  if (sortedDays.length === 0) {
    return <p className="text-center mt-10">No hay datos válidos para mostrar</p>;
  }

  // Calcular horas frío por día (usando hora local)
  const horasPorDia = {};
  for (let i = 0; i < allData.length; i++) {
    const d = allData[i];
    if (typeof d.temperatura !== 'number' || !d.timestamp) continue;
    
    // Convertir a fecha local
    const localDate = new Date(d.timestamp);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const fecha = `${year}-${month}-${day}`;
    
    if (d.temperatura <= umbralHorasFrio) {
      let intervaloHoras = 1/6;
      if (i < allData.length - 1) {
        const tiempoActual = new Date(d.timestamp);
        const tiempoSiguiente = new Date(allData[i+1].timestamp);
        intervaloHoras = (tiempoSiguiente - tiempoActual) / (1000 * 60 * 60);
        if (intervaloHoras > 2) intervaloHoras = 1/6;
      }
      horasPorDia[fecha] = (horasPorDia[fecha] || 0) + intervaloHoras;
    }
  }

  const resumenDiario = sortedDays.map(fecha => ({
    fecha,
    fechaCorta: new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
    horasFrio: Number((horasPorDia[fecha] || 0).toFixed(2))
  }));

  const totalHorasFrio = resumenDiario.reduce((acc, d) => acc + d.horasFrio, 0).toFixed(1);

  // Datos del día seleccionado
  const selectedDay = sortedDays[selectedDayIndex];
  const dayData = dataByDay[selectedDay] || [];
  const ultima = allData[allData.length - 1];

  // Estadísticas del día
  const dayTemps = dayData.map(d => d.temperatura);
  const dayHumidity = dayData.map(d => d.humedad);
  const tempMin = Math.min(...dayTemps);
  const tempMax = Math.max(...dayTemps);
  const humMin = Math.min(...dayHumidity);
  const humMax = Math.max(...dayHumidity);
  const tempAvg = (dayTemps.reduce((a, b) => a + b, 0) / dayTemps.length).toFixed(1);
  const humAvg = (dayHumidity.reduce((a, b) => a + b, 0) / dayHumidity.length).toFixed(1);

  const goToPreviousDay = () => {
    if (selectedDayIndex < sortedDays.length - 1) {
      setSelectedDayIndex(selectedDayIndex + 1);
    }
  };

  const goToNextDay = () => {
    if (selectedDayIndex > 0) {
      setSelectedDayIndex(selectedDayIndex - 1);
    }
  };

  const isToday = selectedDayIndex === 0;
  const selectedDate = new Date(selectedDay);
  const formattedSelectedDay = selectedDate.toLocaleDateString('es-CL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">🌿 Panel de Monitoreo</h1>

      <div className="mb-4 text-center">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm">
          <Calendar size={16} />
          {dataInfo.count} registros cargados
          {!dataInfo.scannedAll && " (límite alcanzado)"}
        </span>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-lg font-semibold">Sector:</label>
          <select 
            value={sector} 
            onChange={(e) => setSector(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:border-green-500"
          >
            <option value="norte">Norte</option>
            <option value="sur">Sur</option>
            <option value="este">Este</option>
            <option value="oeste">Oeste</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Período:</label>
          <select 
            value={daysRange} 
            onChange={(e) => setDaysRange(Number(e.target.value))}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            <option value="3">3 días</option>
            <option value="7">7 días</option>
            <option value="14">14 días</option>
            <option value="30">30 días</option>
            <option value="60">60 días</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 text-center shadow-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">🌡️ Temperatura actual</h2>
          <p className="text-4xl font-bold text-red-600">
            {ultima.temperatura.toFixed(1)}°C
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {new Date(ultima.timestamp).toLocaleString('es-CL')}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center shadow-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">💧 Humedad actual</h2>
          <p className="text-4xl font-bold text-blue-600">
            {ultima.humedad.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {new Date(ultima.timestamp).toLocaleString('es-CL')}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 text-center shadow-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">❄️ Total horas frío</h2>
          <p className="text-4xl font-bold text-indigo-700">{totalHorasFrio}h</p>
          <p className="text-sm text-gray-600 mt-2">
            Últimos {daysRange} días (≤ {umbralHorasFrio}°C)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousDay}
            disabled={selectedDayIndex >= sortedDays.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800 capitalize">
              {formattedSelectedDay}
            </p>
            {isToday && (
              <span className="inline-block mt-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Hoy
              </span>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {dayData.length} mediciones · {(dayData.length / 6).toFixed(1)}h de datos
            </p>
          </div>
          
          <button
            onClick={goToNextDay}
            disabled={selectedDayIndex <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <p className="text-xs text-gray-600 mb-1">Temp. Mín</p>
          <p className="text-xl font-bold text-blue-600">{tempMin.toFixed(1)}°C</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <p className="text-xs text-gray-600 mb-1">Temp. Prom</p>
          <p className="text-xl font-bold text-gray-700">{tempAvg}°C</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <p className="text-xs text-gray-600 mb-1">Temp. Máx</p>
          <p className="text-xl font-bold text-red-600">{tempMax.toFixed(1)}°C</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <p className="text-xs text-gray-600 mb-1">Hum. Mín</p>
          <p className="text-xl font-bold text-cyan-600">{humMin.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <p className="text-xs text-gray-600 mb-1">Hum. Prom</p>
          <p className="text-xl font-bold text-gray-700">{humAvg}%</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <p className="text-xs text-gray-600 mb-1">Hum. Máx</p>
          <p className="text-xl font-bold text-blue-800">{humMax.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📈 Temperatura - {new Date(selectedDay).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dayData} margin={{ right: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v) =>
                  new Date(v).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false})
                }
                stroke="#6b7280"
                label={{ value: 'Hora', position: 'insideBottom', offset: -15 }}
                minTickGap={30}
              />
              <YAxis stroke="#6b7280" label={{ value: '°C', position: 'insideLeft' }} />
              <Tooltip 
                labelFormatter={(v) => new Date(v).toLocaleString("es-CL")}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              />
              <Line 
                type="monotone" 
                dataKey="temperatura" 
                stroke="#dc2626" 
                strokeWidth={2}
                dot={false}
                name="Temperatura (°C)" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📊 Humedad - {new Date(selectedDay).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dayData} margin={{ right: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v) =>
                  new Date(v).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false})
                }
                stroke="#6b7280"
                label={{ value: 'Hora', position: 'insideBottom', offset: -15 }}
                minTickGap={30}
              />
              <YAxis stroke="#6b7280" label={{ value: '%', position: 'insideLeft' }}/>
              <Tooltip 
                labelFormatter={(v) => new Date(v).toLocaleString("es-CL")}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              />
              <Line 
                type="monotone" 
                dataKey="humedad" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={false}
                name="Humedad (%)" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          📅 Resumen por día - Últimos {sortedDays.length} días
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
          {sortedDays.map((day, index) => {
            const dayInfo = resumenDiario.find(d => d.fecha === day);
            const isSelected = index === selectedDayIndex;
            const isTodayCard = index === 0;
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDayIndex(index)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {new Date(day).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                </p>
                {isTodayCard && (
                  <span className="inline-block mb-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                    Hoy
                  </span>
                )}
                <p className="text-xs text-gray-500">
                  {dataByDay[day].length} med.
                </p>
                <p className="text-lg font-bold text-indigo-600 mt-2">
                  {dayInfo?.horasFrio || 0}h
                </p>
                <p className="text-xs text-gray-500">frío</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          ❄️ Horas frío por día (≤ {umbralHorasFrio}°C)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={resumenDiario}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="fechaCorta" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              labelFormatter={(v) => {
                const item = resumenDiario.find(d => d.fechaCorta === v);
                return item ? item.fecha : v;
              }}
            />
            <Bar dataKey="horasFrio" fill="#6366f1" name="Horas frío (h)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Datos actualizados: {new Date(ultima.timestamp).toLocaleString('es-CL')}</p>
        <p className="mt-1">Intervalo de medición: 10 minutos · Sector: {sector.toUpperCase()}</p>
      </div>
    </div>
  );
}
