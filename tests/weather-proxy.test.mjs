import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

const sample = {
  main: { temp: 71.6, feels_like: 73.2, humidity: 60 },
  weather: [{ main: 'Clear', description: 'clear sky' }],
  wind: { speed: 5.7 }, sys: { sunrise: 1, sunset: 9999999999 },
  dt: Date.parse('2026-09-09T12:00:00Z') / 1000,
};
function harness(failure = false) {
  const values = new Map();
  const calls = [];
  const load = createLoader({
    externalMocks: { '@react-native-async-storage/async-storage': {
      getItem: async key => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
    } },
    mocks: { 'src/services/security/backendClient': { callBackend: async (route, payload) => {
      calls.push({ route, payload });
      if (failure) throw Error('offline');
      return payload.kind === 'current' ? sample : { list: [sample, { ...sample, main: { ...sample.main, temp: 79 } }] };
    } } },
  });
  return { service: load('src/services/weatherService.ts'), calls, values };
}
test('weather uses authenticated proxy and preserves Fahrenheit, rounding, daylight and local caching', async () => {
  const h = harness();
  const weather = await h.service.getWeatherData(35.8, -78.6);
  assert.equal(weather.temp, 72);
  assert.equal(weather.feelsLike, 73);
  assert.equal(weather.windSpeed, 6);
  assert.equal(weather.isDay, true);
  await h.service.getWeatherData(35.81, -78.61);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].route, 'weather-v2');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].payload)), { lat: 35.8, lon: -78.6, kind: 'current' });
});
test('forecast preserves daily high grouping and avoids repeat provider work from cache', async () => {
  const h = harness();
  const forecast = await h.service.getWeatherForecast(35.8, -78.6);
  assert.equal(forecast.forecasts.length, 1);
  assert.equal(forecast.forecasts[0].weather.temp, 79);
  await h.service.getWeatherForecast(35.8, -78.6);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].payload.kind, 'forecast');
});
test('weather outage keeps optional weather unavailable without fabricating observations', async () => {
  const h = harness(true);
  assert.equal(await h.service.getWeatherData(35.8, -78.6), null);
  assert.equal(await h.service.getWeatherForecast(35.8, -78.6), null);
  assert.equal(h.values.size, 0);
});
