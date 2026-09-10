import { env, fetchJSON, HttpError } from "./http.ts";
export interface WeatherInput {
  lat: number;
  lon: number;
  kind: "current" | "forecast";
}
export function weatherInput(input: Record<string, unknown>): WeatherInput {
  if (
    typeof input.lat !== "number" || !Number.isFinite(input.lat) ||
    input.lat < -90 || input.lat > 90 || typeof input.lon !== "number" ||
    !Number.isFinite(input.lon) || input.lon < -180 || input.lon > 180 ||
    (input.kind !== "current" && input.kind !== "forecast")
  ) throw new HttpError(400, "INVALID_WEATHER_LOCATION");
  return { lat: input.lat, lon: input.lon, kind: input.kind };
}
export async function weather(
  input: WeatherInput,
  request: typeof fetchJSON = fetchJSON,
) {
  const url = new URL(
    input.kind === "current"
      ? "https://api.openweathermap.org/data/2.5/weather"
      : "https://api.openweathermap.org/data/2.5/forecast",
  );
  url.searchParams.set("lat", String(input.lat));
  url.searchParams.set("lon", String(input.lon));
  url.searchParams.set("units", "imperial");
  url.searchParams.set("appid", env("OPENWEATHER_API_KEY"));
  // Coordinates/key are never logged or accepted as arbitrary URLs.
  const result = await request(url.toString(), { method: "GET" }, 10000);
  if (input.kind === "forecast") {
    if (!Array.isArray(result.list) || result.list.length > 40) {
      throw new HttpError(502, "INVALID_WEATHER_RESPONSE");
    }
  } else if (
    !result.main || !Array.isArray(result.weather) || !result.weather.length
  ) throw new HttpError(502, "INVALID_WEATHER_RESPONSE");
  return result;
}
