const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

export interface City {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    uv_index: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
  timezone: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function searchCities(query: string): Promise<City[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) return [];

  const params = new URLSearchParams({
    name: trimmedQuery,
    count: "8",
    language: "en",
    format: "json",
  });

  const data = await fetchJson<{ results?: City[] }>(`${GEO_URL}?${params}`);

  return data.results ?? [];
}

export async function getWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "uv_index",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "weather_code",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
  });

  return fetchJson<WeatherData>(`${WEATHER_URL}?${params}`);
}
