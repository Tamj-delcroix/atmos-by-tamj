import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Gauge,
  Map,
  MapPin,
  Search,
  Settings,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  X,
  Star,
} from "lucide-react";
import {
  getWeather,
  searchCities,
  type City,
  type WeatherData,
} from "./services/weather";
import TemperatureChart from "./components/charts/TemperatureChart";
import WeatherMap from "./components/charts/map/WeatherMap";

const navItems = [
  { label: "Dashboard", icon: CloudSun },
  { label: "Weather Map", icon: Map },
  { label: "Compare Cities", icon: Activity },
  { label: "Favorites", icon: Star },
  { label: "Settings", icon: Settings },
];

function weatherIcon(code: number, size = 24) {
  if (code === 0) return <Sun size={size} className="text-amber-400" />;
  if (code <= 2) return <CloudSun size={size} className="text-amber-400" />;
  if (code === 3) return <Cloud size={size} />;
  if (code <= 48) return <CloudFog size={size} />;
  if (code <= 57) return <CloudDrizzle size={size} />;
  if (code <= 67 || (code >= 80 && code <= 82))
    return <CloudRain size={size} />;
  if (code <= 77 || code <= 86) return <CloudSnow size={size} />;
  return <CloudLightning size={size} />;
}

function weatherDescription(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

/* Format API timestamps without applying the laptop's timezone. */
function formatHour(time: string) {
  const match = time.match(/T(\d{2}):\d{2}/);
  if (!match) return time;

  const hour = Number(match[1]);

  return new Date(Date.UTC(2000, 0, 1, hour)).toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    timeZone: "UTC",
  });
}

/* Format sunrise and sunset timestamps in the API's local city time. */
function formatLocalTime(time: string) {
  const match = time.match(/T(\d{2}):(\d{2})/);
  if (!match) return time;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return new Date(Date.UTC(2000, 0, 1, hour, minute)).toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    },
  );
}

/* Find the current hour using the selected city's timezone. */
function getLocalHourKey(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:00`;
}

/* Open-Meteo hourly timestamps use the forecast city's local time. */
function getForecastStartIndex(times: string[], timezone: string) {
  if (times.length === 0) return 0;

  try {
    const currentHour = getLocalHourKey(timezone);
    const found = times.findIndex((time) => time >= currentHour);

    if (found >= 0) return found;
  } catch {
    /* Fall back safely if the supplied timezone is invalid. */
  }

  return Math.max(0, times.length - 24);
}

const defaultCity: City = {
  id: 1,
  name: "Bandung",
  country: "Indonesia",
  latitude: -6.9175,
  longitude: 107.6191,
  timezone: "Asia/Jakarta",
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [city, setCity] = useState<City>(defaultCity);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");

  const [favorites, setFavorites] = useState<City[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("atmos-favorites") || "[]");
    } catch {
      return [];
    }
  });

  const [compareCities, setCompareCities] = useState<City[]>([defaultCity]);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareResults, setCompareResults] = useState<City[]>([]);
  const [compareSearchLoading, setCompareSearchLoading] = useState(false);
  const [compareWeather, setCompareWeather] = useState<
    Record<number, WeatherData>
  >({});
  const [compareLoading, setCompareLoading] = useState(true);
  const [compareError, setCompareError] = useState("");

  /*
   * Weather fetching:
   * loading/error are updated by user actions, while this effect
   * only synchronizes the selected city with the weather API.
   */
  useEffect(() => {
    let cancelled = false;

    getWeather(city.latitude, city.longitude)
      .then((data) => {
        if (!cancelled) {
          setWeather(data);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Weather data could not be loaded. Check your connection and retry.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  /*
   * City search:
   * short queries are cleared by the input's onChange handler,
   * not synchronously inside this effect.
   */
  useEffect(() => {
    if (query.trim().length < 2) return;

    let cancelled = false;

    const timer = window.setTimeout(() => {
      setSearching(true);

      searchCities(query)
        .then((cities) => {
          if (!cancelled) setResults(cities);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  /* Compare-city search follows the same pattern. */
  useEffect(() => {
    if (compareQuery.trim().length < 2) return;

    let cancelled = false;

    const timer = window.setTimeout(() => {
      setCompareSearchLoading(true);

      searchCities(compareQuery)
        .then((cities) => {
          if (!cancelled) setCompareResults(cities);
        })
        .catch(() => {
          if (!cancelled) setCompareResults([]);
        })
        .finally(() => {
          if (!cancelled) setCompareSearchLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [compareQuery]);

  /*
   * Compare weather:
   * an empty selection is handled in removeCompareCity().
   * This effect only fetches data for selected cities.
   */
  useEffect(() => {
    if (compareCities.length === 0) return;

    let cancelled = false;

    Promise.all(
      compareCities.map(async (item) => ({
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        data: await getWeather(item.latitude, item.longitude),
      })),
    )
      .then((items) => {
        if (cancelled) return;

        const next: Record<number, WeatherData> = {};

        items.forEach((item) => {
          next[item.id] = item.data;
        });

        setCompareWeather(next);
        setCompareError("");
      })
      .catch(() => {
        if (!cancelled) {
          setCompareError(
            "Could not load weather for every city. Check your connection and retry.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [compareCities]);

  const current = weather?.current;
  const daily = weather?.daily;

  /*
   * Use one consistent 24-hour forecast starting from the current
   * hour in the selected city's timezone.
   */
  const hourly24 = useMemo(() => {
    if (!weather) return [];

    const start = getForecastStartIndex(
      weather.hourly.time,
      weather.timezone || city.timezone,
    );

    return weather.hourly.time.slice(start, start + 24).map((time, i) => ({
      time,
      temperature: weather.hourly.temperature_2m[start + i],
      code: weather.hourly.weather_code[start + i],
      rain: weather.hourly.precipitation_probability[start + i],
    }));
  }, [weather, city.timezone]);

  const hourly = useMemo(() => hourly24.slice(0, 6), [hourly24]);

  const convert = (value: number) =>
    unit === "C" ? Math.round(value) : Math.round((value * 9) / 5 + 32);

  function chooseCity(selected: City) {
    setLoading(true);
    setError("");
    setCity(selected);
    setQuery("");
    setResults([]);
    setSearching(false);
    setActivePage("Dashboard");
  }

  function toggleFavorite() {
    const exists = favorites.some(
      (item) =>
        item.latitude === city.latitude && item.longitude === city.longitude,
    );

    const next = exists
      ? favorites.filter(
          (item) =>
            !(
              item.latitude === city.latitude &&
              item.longitude === city.longitude
            ),
        )
      : [...favorites, city];

    setFavorites(next);
    localStorage.setItem("atmos-favorites", JSON.stringify(next));
  }

  function addCompareCity(selected: City) {
    const exists = compareCities.some(
      (item) =>
        item.latitude === selected.latitude &&
        item.longitude === selected.longitude,
    );

    if (exists || compareCities.length >= 3) return;

    setCompareLoading(true);
    setCompareError("");
    setCompareCities((previous) => [...previous, selected]);
    setCompareQuery("");
    setCompareResults([]);
    setCompareSearchLoading(false);
  }

  function removeCompareCity(selected: City) {
    const next = compareCities.filter(
      (item) =>
        !(
          item.latitude === selected.latitude &&
          item.longitude === selected.longitude
        ),
    );

    setCompareCities(next);

    if (next.length === 0) {
      setCompareWeather({});
      setCompareLoading(false);
      setCompareError("");
    } else {
      setCompareLoading(true);
      setCompareError("");
    }
  }

  const isFavorite = favorites.some(
    (item) =>
      item.latitude === city.latitude && item.longitude === city.longitude,
  );

  return (
    <div className="min-h-screen bg-[#f3f8ff] text-slate-800 md:flex">
      <aside className="flex w-full flex-col border-r border-blue-100/80 bg-white/90 p-5 md:sticky md:top-0 md:h-screen md:w-[245px] md:shrink-0">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-200">
            <CloudSun size={25} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              atmos<span className="text-sky-500">.</span>
            </h1>
            <p className="text-xs text-slate-400">Weather intelligence</p>
          </div>
        </div>

        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Workspace
        </p>

        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActivePage(label)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                activePage === label
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-100"
                  : "text-slate-500 hover:bg-sky-50 hover:text-sky-700"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 p-4 md:block">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600">
            <MapPin size={19} />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-800">
            Weather, simplified.
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Clear insights for your next move.
          </p>
          <p className="mt-4 text-[10px] text-slate-400">ATMOS · OPEN-METEO</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-sky-600">
              Your personal weather space
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {activePage === "Dashboard" ? "Weather overview" : activePage}
              <span className="text-sky-500">.</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A clearer view of the day ahead.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (results[0]) chooseCity(results[0]);
                }}
                className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm"
              >
                <Search size={18} className="shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => {
                    const value = event.target.value;
                    setQuery(value);

                    if (value.trim().length < 2) {
                      setResults([]);
                      setSearching(false);
                    }
                  }}
                  placeholder="Search a city..."
                  aria-label="Search city"
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                {searching && (
                  <span className="text-xs text-slate-400">...</span>
                )}
              </form>

              {query.trim().length >= 2 && (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-blue-100 bg-white p-2 shadow-xl">
                  {searching && (
                    <p className="p-3 text-sm text-slate-400">
                      Searching cities...
                    </p>
                  )}
                  {!searching && results.length === 0 && (
                    <p className="p-3 text-sm text-slate-500">
                      No cities found.
                    </p>
                  )}
                  {results.map((item) => (
                    <button
                      key={`${item.id}-${item.latitude}-${item.longitude}`}
                      onClick={() => chooseCity(item)}
                      className="w-full rounded-xl p-3 text-left hover:bg-sky-50"
                    >
                      <span className="block text-sm font-semibold text-slate-700">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {"admin1" in item && item.admin1
                          ? `${item.admin1}, `
                          : ""}
                        {item.country}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={toggleFavorite}
              aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
              title={isFavorite ? "Remove favorite" : "Add favorite"}
              className="rounded-2xl border border-blue-100 bg-white p-3 text-slate-500 hover:bg-sky-50"
            >
              <Star
                size={18}
                className={isFavorite ? "fill-amber-300 text-amber-500" : ""}
              />
            </button>
          </div>
        </header>

        {activePage === "Dashboard" && (
          <>
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
                <button
                  className="ml-2 font-bold underline"
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    setCity({ ...city });
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            <section className="relative mb-6 overflow-hidden rounded-[30px] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 p-6 text-white shadow-xl shadow-blue-100 sm:p-9">
              <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="relative grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                    <MapPin size={14} /> {city.name}, {city.country}
                  </div>
                  <p className="text-sm text-blue-50">
                    Current weather · {weather?.timezone ?? city.timezone}
                  </p>
                  <div className="my-2 flex items-start">
                    <span className="text-7xl font-extrabold tracking-tighter sm:text-8xl">
                      {current ? convert(current.temperature_2m) : "—"}°
                    </span>
                    <span className="mt-3 text-2xl font-semibold">{unit}</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {current
                      ? weatherDescription(current.weather_code)
                      : loading
                        ? "Loading weather..."
                        : "Weather unavailable"}
                  </p>
                  <p className="mt-2 text-sm text-blue-50">
                    {current
                      ? `Feels like ${convert(current.apparent_temperature)}° · H: ${daily ? convert(daily.temperature_2m_max[0]) : "—"}° L: ${daily ? convert(daily.temperature_2m_min[0]) : "—"}°`
                      : "Waiting for weather data"}
                  </p>
                  <p className="mt-5 text-xs text-blue-100">
                    {loading
                      ? "Updating weather data..."
                      : "Source: Open-Meteo · Forecast data"}
                  </p>
                </div>

                <div className="flex items-center justify-center py-3">
                  <div className="relative flex h-44 w-44 items-center justify-center sm:h-56 sm:w-56">
                    <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />
                    {weatherIcon(current?.weather_code ?? 2, 132)}
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[
                {
                  label: "Feels like",
                  value: current
                    ? `${convert(current.apparent_temperature)}°${unit}`
                    : "—",
                  note: "Perceived temperature",
                  icon: Thermometer,
                },
                {
                  label: "Humidity",
                  value: current ? `${current.relative_humidity_2m}%` : "—",
                  note: "Relative humidity",
                  icon: Droplets,
                },
                {
                  label: "Wind speed",
                  value: current
                    ? `${Math.round(current.wind_speed_10m * (unit === "C" ? 1 : 0.621371))} ${unit === "C" ? "km/h" : "mph"}`
                    : "—",
                  note: "Current wind",
                  icon: Wind,
                },
                {
                  label: "Air pressure",
                  value: current
                    ? `${Math.round(current.pressure_msl)} hPa`
                    : "—",
                  note: "Mean sea-level pressure",
                  icon: Gauge,
                },
              ].map(({ label, value, note, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-blue-100/80 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Icon size={20} />
                  </div>
                  <p className="text-xs font-medium text-slate-400">{label}</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-800">
                    {value}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{note}</p>
                </div>
              ))}
            </section>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">Temperature units</p>
              <div className="flex rounded-xl border border-blue-100 bg-white p-1">
                {(["C", "F"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setUnit(value)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold ${unit === value ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-sky-50"}`}
                  >
                    °{value}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-2xl border border-blue-100/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800">Hourly forecast</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Next available hours · local city time
                  </p>
                </div>
                {loading && !weather ? (
                  <p className="text-sm text-slate-400">Loading forecast...</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {hourly.map(({ time, temperature, code, rain }) => (
                      <div
                        key={time}
                        className="rounded-2xl bg-slate-50 p-3 text-center"
                      >
                        <p className="text-xs text-slate-400">
                          {formatHour(time)}
                        </p>
                        <div className="my-4 flex justify-center">
                          {weatherIcon(code)}
                        </div>
                        <p className="font-bold">{convert(temperature)}°</p>
                        <p className="mt-1 text-[10px] text-sky-600">
                          {rain}% rain
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-blue-100/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h3 className="font-bold text-slate-800">7-day outlook</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Daily highs and lows
                  </p>
                </div>
                <div className="space-y-3">
                  {daily?.time.map((day, index) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-10 text-sm font-bold text-slate-600">
                        {index === 0
                          ? "Today"
                          : new Date(`${day}T12:00:00Z`).toLocaleDateString(
                              "en-US",
                              { weekday: "short", timeZone: "UTC" },
                            )}
                      </span>
                      {weatherIcon(daily.weather_code[index], 20)}
                      <span className="flex-1 text-xs text-slate-400">
                        {weatherDescription(daily.weather_code[index])}
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {convert(daily.temperature_2m_max[index])}°
                      </span>
                      <span className="w-8 text-right text-sm text-slate-400">
                        {convert(daily.temperature_2m_min[index])}°
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {weather && (
              <section className="mt-6 rounded-2xl border border-blue-100/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h3 className="font-bold text-slate-800">
                    Temperature trend
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    24-hour forecast · Open-Meteo
                  </p>
                </div>
                <TemperatureChart
                  times={hourly24.map((item) => item.time)}
                  temperatures={hourly24.map((item) => item.temperature)}
                  unit={unit}
                />
              </section>
            )}

            {daily && (
              <section className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-white p-5">
                  <div className="mb-2 flex items-center gap-2 text-amber-500">
                    <Sunrise size={20} />
                    <span className="text-sm font-semibold text-slate-600">
                      Sunrise
                    </span>
                  </div>
                  <p className="text-2xl font-extrabold">
                    {formatLocalTime(daily.sunrise[0])}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-5">
                  <div className="mb-2 flex items-center gap-2 text-orange-500">
                    <Sunset size={20} />
                    <span className="text-sm font-semibold text-slate-600">
                      Sunset
                    </span>
                  </div>
                  <p className="text-2xl font-extrabold">
                    {formatLocalTime(daily.sunset[0])}
                  </p>
                </div>
              </section>
            )}
          </>
        )}

        {activePage === "Compare Cities" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Compare cities
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Compare current conditions and the next 24 hours for up to
                  three cities.
                </p>
              </div>

              <div className="relative max-w-lg">
                <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-slate-50 px-3 py-3">
                  <Search size={18} className="text-slate-400" />
                  <input
                    value={compareQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCompareQuery(value);

                      if (value.trim().length < 2) {
                        setCompareResults([]);
                        setCompareSearchLoading(false);
                      }
                    }}
                    disabled={compareCities.length >= 3}
                    placeholder={
                      compareCities.length >= 3
                        ? "Maximum 3 cities added"
                        : "Search a city to compare..."
                    }
                    aria-label="Search city to compare"
                    className="w-full bg-transparent text-sm outline-none disabled:cursor-not-allowed"
                  />
                  {compareSearchLoading && (
                    <span className="text-xs text-slate-400">...</span>
                  )}
                </div>

                {compareQuery.trim().length >= 2 &&
                  compareCities.length < 3 && (
                    <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-blue-100 bg-white p-2 shadow-xl">
                      {!compareSearchLoading && compareResults.length === 0 && (
                        <p className="p-3 text-sm text-slate-500">
                          No cities found.
                        </p>
                      )}
                      {compareResults.map((item) => {
                        const alreadyAdded = compareCities.some(
                          (cityItem) =>
                            cityItem.latitude === item.latitude &&
                            cityItem.longitude === item.longitude,
                        );

                        return (
                          <button
                            key={`${item.id}-${item.latitude}-${item.longitude}`}
                            disabled={alreadyAdded}
                            onClick={() => addCompareCity(item)}
                            className="w-full rounded-lg p-3 text-left hover:bg-sky-50 disabled:opacity-40"
                          >
                            <span className="block text-sm font-semibold">
                              {item.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.country}
                              {alreadyAdded ? " · Already added" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>

              <p className="mt-3 text-xs text-slate-400">
                {compareCities.length} of 3 cities selected
              </p>
            </div>

            {compareError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {compareError}
                <button
                  onClick={() => {
                    if (compareCities.length > 0) {
                      setCompareLoading(true);
                      setCompareError("");
                      setCompareCities([...compareCities]);
                    }
                  }}
                  className="ml-2 font-bold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {compareCities.length === 0 && (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center">
                <CloudSun className="mx-auto mb-3 text-sky-500" size={32} />
                <h3 className="font-bold">Add a city to get started</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Search for one or more cities above.
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {compareCities.map((item) => {
                const data = compareWeather[item.id];
                const now = data?.current;

                return (
                  <article
                    key={`${item.latitude}-${item.longitude}`}
                    className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.country}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCompareCity(item)}
                        aria-label={`Remove ${item.name}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div>
                        <p className="text-4xl font-extrabold text-slate-900">
                          {now ? `${convert(now.temperature_2m)}°` : "—"}
                          <span className="text-lg">{unit}</span>
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {now
                            ? weatherDescription(now.weather_code)
                            : compareLoading
                              ? "Loading weather..."
                              : "Data unavailable"}
                        </p>
                      </div>
                      {weatherIcon(now?.weather_code ?? 2, 44)}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-blue-50 pt-4">
                      <div>
                        <p className="text-xs text-slate-400">Feels like</p>
                        <p className="mt-1 font-bold">
                          {now
                            ? `${convert(now.apparent_temperature)}°${unit}`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Humidity</p>
                        <p className="mt-1 font-bold">
                          {now ? `${now.relative_humidity_2m}%` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Wind</p>
                        <p className="mt-1 font-bold">
                          {now
                            ? `${Math.round(now.wind_speed_10m * (unit === "C" ? 1 : 0.621371))} ${unit === "C" ? "km/h" : "mph"}`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">
                          Today's high / low
                        </p>
                        <p className="mt-1 font-bold">
                          {data
                            ? `${convert(data.daily.temperature_2m_max[0])}° / ${convert(data.daily.temperature_2m_min[0])}°`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {compareCities.length > 0 &&
              compareCities.every((item) => compareWeather[item.id]) && (
                <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <h3 className="font-bold text-slate-800">
                      24-hour temperature comparison
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Hourly forecast for each selected city
                    </p>
                  </div>

                  <div className="space-y-5">
                    {compareCities.map((item, cityIndex) => {
                      const data = compareWeather[item.id];
                      const start = getForecastStartIndex(
                        data.hourly.time,
                        data.timezone || item.timezone,
                      );
                      const times = data.hourly.time.slice(start, start + 24);
                      const temperatures = data.hourly.temperature_2m.slice(
                        start,
                        start + 24,
                      );
                      const max = Math.max(...temperatures, 1);
                      const min = Math.min(...temperatures, 0);
                      const colors = [
                        "bg-sky-500",
                        "bg-violet-500",
                        "bg-emerald-500",
                      ];

                      return (
                        <div key={`${item.latitude}-${item.longitude}`}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">
                              {item.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {convert(temperatures[0] ?? 0)}°{unit} now
                            </span>
                          </div>
                          <div className="flex h-12 items-end gap-1">
                            {temperatures.map((temperature, index) => {
                              const percent =
                                max === min
                                  ? 50
                                  : 18 +
                                    ((temperature - min) / (max - min)) * 82;

                              return (
                                <div
                                  key={index}
                                  title={`${formatHour(times[index])}: ${convert(temperature)}°${unit}`}
                                  className={`flex-1 rounded-t-sm ${colors[cityIndex]} opacity-80 hover:opacity-100`}
                                  style={{ height: `${percent}%` }}
                                />
                              );
                            })}
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                            <span>{times[0] ? formatHour(times[0]) : ""}</span>
                            <span>
                              {times[Math.min(11, times.length - 1)]
                                ? formatHour(
                                    times[Math.min(11, times.length - 1)],
                                  )
                                : ""}
                            </span>
                            <span>
                              {times[times.length - 1]
                                ? formatHour(times[times.length - 1])
                                : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
          </section>
        )}

        {activePage === "Weather Map" &&
          (weather ? (
            <WeatherMap city={city} weather={weather} unit={unit} />
          ) : (
            <section className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-blue-100 bg-white p-8 text-center shadow-sm">
              <Map size={32} className="mb-4 text-sky-500" />
              <h3 className="text-xl font-extrabold">Weather Map</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {loading
                  ? "Loading weather data for the map..."
                  : "Weather data is unavailable. Check your connection and retry from the Dashboard."}
              </p>
            </section>
          ))}

        {activePage === "Favorites" && (
          <section className="rounded-3xl border border-blue-100 bg-white p-6">
            <h3 className="text-xl font-bold">Favorite cities</h3>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Your saved places on this device.
            </p>

            {favorites.length === 0 ? (
              <p className="text-sm text-slate-400">
                No favorites yet. Search a city and press the star button to
                save it.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {favorites.map((item) => (
                  <div
                    key={`${item.latitude}-${item.longitude}`}
                    className="flex items-center justify-between rounded-2xl bg-sky-50 p-4"
                  >
                    <button
                      className="text-left"
                      onClick={() => chooseCity(item)}
                    >
                      <span className="block font-bold">{item.name}</span>
                      <span className="text-xs text-slate-500">
                        {item.country}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        const next = favorites.filter(
                          (favorite) =>
                            !(
                              favorite.latitude === item.latitude &&
                              favorite.longitude === item.longitude
                            ),
                        );
                        setFavorites(next);
                        localStorage.setItem(
                          "atmos-favorites",
                          JSON.stringify(next),
                        );
                      }}
                      className="text-sm text-rose-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activePage === "Settings" && (
          <section className="max-w-2xl rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Settings</h3>
            <p className="mt-1 text-sm text-slate-500">
              Customize your temperature display.
            </p>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Temperature unit</p>
                <p className="mt-1 text-xs text-slate-400">
                  Choose Celsius or Fahrenheit.
                </p>
              </div>
              <div className="flex rounded-xl border border-blue-100 p-1">
                {(["C", "F"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setUnit(value)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold ${unit === value ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-sky-50"}`}
                  >
                    °{value}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-blue-50 pt-5">
              <p className="font-semibold">Weather data</p>
              <p className="mt-1 text-sm text-slate-500">
                Powered by Open-Meteo. City searches do not require device
                location access.
              </p>
            </div>
          </section>
        )}

        <footer className="mt-8 flex flex-col gap-2 border-t border-blue-100 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Atmos Weather Intelligence</p>
          <p>Weather data: Open-Meteo</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
