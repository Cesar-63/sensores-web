import { useEffect, useState } from "react";
import mqtt from "mqtt";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const SensorApp = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Conexión al broker HiveMQ Cloud (usa wss para navegador)
    const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt"); 

    client.on("connect", () => {
      console.log("Conectado al broker MQTT");
      client.subscribe("cesar/plantacion/temperatura");
    });

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        setData((prev) => [
          ...prev,
          {
            time: new Date(payload.timestamp).toLocaleTimeString(),
            temperatura: payload.temperatura,
            humedad: payload.humedad,
          },
        ]);
      } catch (e) {
        console.error(e);
      }
    });

    return () => client.end();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard Plantación</h1>
      <LineChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="temperatura" stroke="#8884d8" name="Temperatura (°C)" />
        <Line type="monotone" dataKey="humedad" stroke="#82ca9d" name="Humedad (%)" />
      </LineChart>
    </div>
  );
}
