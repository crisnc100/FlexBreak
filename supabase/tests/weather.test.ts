import { weather, weatherInput } from "../functions/_shared/weather.ts";
import { handler } from "../functions/_shared/handler.ts";
import { equal, MemoryDatabase, rejects } from "./helpers.ts";
Deno.test("weather validates finite numeric coordinates and fixed kind", async () => {
  for (
    const bad of [
      { lat: NaN },
      { lat: 91 },
      { lat: -91 },
      { lat: "40" },
      { lon: Infinity },
      { lon: 181 },
      { lon: -181 },
      { kind: "https://attacker.test" },
    ]
  ) {
    await rejects(
      () => weatherInput({ lat: 40, lon: -74, kind: "current", ...bad }),
      "INVALID_WEATHER_LOCATION",
    );
  }
  equal(weatherInput({ lat: -90, lon: 180, kind: "forecast" }), {
    lat: -90,
    lon: 180,
    kind: "forecast",
  });
});
Deno.test("weather provider request uses fixed HTTPS URL/server key/imperial and preserves payload", async () => {
  const previous = Deno.env.get("OPENWEATHER_API_KEY");
  Deno.env.set("OPENWEATHER_API_KEY", "test-server-key");
  try {
    for (const kind of ["current", "forecast"] as const) {
      const fixture = kind === "current"
        ? { main: { temp: 72 }, weather: [{ main: "Clear" }], dt: 1 }
        : {
          list: [{ main: { temp: 72 }, weather: [{ main: "Clear" }], dt: 1 }],
        };
      const result = await weather(
        weatherInput({ lat: 40.5, lon: -74.2, kind }),
        (url, options, timeout) => {
          const parsed = new URL(url);
          equal(parsed.origin, "https://api.openweathermap.org");
          equal(
            parsed.pathname,
            kind === "current" ? "/data/2.5/weather" : "/data/2.5/forecast",
          );
          equal(parsed.searchParams.get("appid"), "test-server-key");
          equal(parsed.searchParams.get("units"), "imperial");
          equal(parsed.searchParams.get("lat"), "40.5");
          equal(parsed.searchParams.get("lon"), "-74.2");
          equal(options.method, "GET");
          equal(timeout, 10000);
          return Promise.resolve(fixture);
        },
      );
      equal(result, fixture);
    }
  } finally {
    if (previous === undefined) Deno.env.delete("OPENWEATHER_API_KEY");
    else Deno.env.set("OPENWEATHER_API_KEY", previous);
  }
});
Deno.test("weather handler authenticates, rejects bad payload and charges bounded UID/provider quotas", async () => {
  const db = new MemoryDatabase();
  let calls = 0;
  const run = handler("weather-v2", {
    authenticate: () =>
      Promise.resolve({ uid: "firebase-user", emailVerified: false }),
    database: () => db,
    weather: () => {
      calls++;
      return Promise.resolve({
        main: { temp: 70 },
        weather: [{ main: "Clouds" }],
      });
    },
  });
  const request = (lat: number) =>
    new Request("https://example.test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lon: 0,
        kind: "current",
        timeZone: "UTC",
        userId: "spoofed",
      }),
    });
  const invalid = await run(request(100));
  equal(invalid.status, 400);
  equal(calls, 0);
  const response = await run(request(40));
  equal(response.status, 200);
  equal((await response.json()).data.main.temp, 70);
  equal(db.rows.get("backendUsage/weather_firebase-user")?.used, 1);
  equal(db.rows.has("backendUsage/weather_spoofed"), false);
  const denied = await handler("weather-v2")(request(40));
  equal(denied.status, 401);
});
