import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TemperatureChartProps {
  times: string[];
  temperatures: number[];
  unit: "C" | "F";
}

export default function TemperatureChart({
  times,
  temperatures,
  unit,
}: TemperatureChartProps) {
  const data = times.map((time, index) => ({
    time: new Date(time).toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    }),
    temperature:
      unit === "C"
        ? Math.round(temperatures[index] * 10) / 10
        : Math.round(((temperatures[index] * 9) / 5 + 32) * 10) / 10,
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.32} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="#e8f0fb"
            strokeDasharray="4 4"
            vertical={false}
          />

          <XAxis
            dataKey="time"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />

          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${value}°`}
          />

          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: "1px solid #dbeafe",
              boxShadow: "0 8px 24px rgba(59,130,246,0.10)",
            }}
            formatter={(value) => [`${value}°${unit}`, "Temperature"]}
          />

          <Area
            type="monotone"
            dataKey="temperature"
            stroke="#0ea5e9"
            strokeWidth={3}
            fill="url(#temperatureFill)"
            activeDot={{
              r: 5,
              fill: "#0284c7",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
