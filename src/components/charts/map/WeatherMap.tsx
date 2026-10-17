import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { MapPin, Thermometer, Wind } from "lucide-react";
import type { City, WeatherData } from "../../../services/weather";

type WeatherMapProps = {
  city: City;
  weather: WeatherData;
  unit: "C" | "F";
};

function RecenterMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], 10, {
      duration: 1.2,
    });
  }, [map, latitude, longitude]);

  return null;
}

function getWeatherLabel(code: number): string {
  if (code === 0) return "Cerah";
  if (code <= 3) return "Berawan";
  if (code <= 48) return "Berkabut";
  if (code <= 57) return "Gerimis";
  if (code <= 67) return "Hujan";
  if (code <= 77) return "Salju";
  if (code <= 82) return "Hujan";
  if (code <= 86) return "Hujan salju";
  if (code <= 99) return "Badai petir";
  return "Cuaca tidak diketahui";
}

export default function WeatherMap({ city, weather, unit }: WeatherMapProps) {
  const temperature =
    unit === "F"
      ? (weather.current.temperature_2m * 9) / 5 + 32
      : weather.current.temperature_2m;

  const weatherLabel = getWeatherLabel(weather.current.weather_code);

  const windSpeed = weather.current.wind_speed_10m;

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-600">
            ATMOS / WEATHER MAP
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800">
            Peta Cuaca
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Lokasi dan kondisi cuaca kota yang sedang kamu pilih.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          OpenStreetMap
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white p-2 shadow-sm">
          <div className="relative h-[420px] overflow-hidden rounded-2xl sm:h-[520px]">
            <MapContainer
              center={[city.latitude, city.longitude]}
              zoom={10}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <RecenterMap
                latitude={city.latitude}
                longitude={city.longitude}
              />

              <CircleMarker
                center={[city.latitude, city.longitude]}
                radius={12}
                pathOptions={{
                  color: "#0284c7",
                  fillColor: "#38bdf8",
                  fillOpacity: 0.85,
                  weight: 4,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <strong>
                      {city.name}, {city.country}
                    </strong>
                    <br />
                    {temperature.toFixed(1)}°{unit}
                    <br />
                    {weatherLabel}
                  </div>
                </Popup>
              </CircleMarker>
            </MapContainer>

            <div className="pointer-events-none absolute left-4 top-4 z-[400] rounded-xl border border-white/70 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
              <p className="text-xs font-semibold text-slate-400">
                SELECTED LOCATION
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <MapPin size={14} className="text-sky-500" />
                {city.name}
              </p>
            </div>
          </div>

          <p className="px-2 pb-1 pt-3 text-xs leading-5 text-slate-400">
            Geser peta untuk menjelajahi area. Gunakan scroll atau kontrol peta
            untuk memperbesar dan memperkecil.
          </p>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 p-5 text-white shadow-lg shadow-sky-100">
            <p className="text-sm font-medium text-sky-100">Kondisi saat ini</p>
            <h3 className="mt-2 text-xl font-extrabold">{city.name}</h3>
            <p className="text-sm text-sky-100">{city.country}</p>

            <div className="mt-6 flex items-center gap-3">
              <Thermometer size={35} strokeWidth={1.8} />
              <div>
                <p className="text-4xl font-extrabold tracking-tight">
                  {temperature.toFixed(1)}°
                  <span className="text-xl">{unit}</span>
                </p>
                <p className="mt-1 text-sm text-sky-100">{weatherLabel}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
                <Wind size={21} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Kecepatan angin</p>
                <p className="text-xl font-extrabold text-slate-800">
                  {windSpeed.toFixed(1)}{" "}
                  <span className="text-sm font-semibold text-slate-500">
                    km/h
                  </span>
                </p>
              </div>
            </div>

            <div className="my-5 border-t border-slate-100" />

            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Koordinat lokasi
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between gap-3">
                <span>Latitude</span>
                <span className="font-semibold tabular-nums">
                  {city.latitude.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Longitude</span>
                <span className="font-semibold tabular-nums">
                  {city.longitude.toFixed(4)}°
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-800">
              Tentang layer cuaca
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              Peta menampilkan lokasi kota dan data cuaca saat ini. Overlay
              suhu, hujan, dan angin belum diaktifkan.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
