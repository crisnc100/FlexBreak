import { body } from "../functions/_shared/http.ts";
import { chat, chatInput } from "../functions/_shared/chat.ts";
import { speechInput } from "../functions/_shared/speech.ts";
import { qualification } from "../functions/_shared/email.ts";
import { handler } from "../functions/_shared/handler.ts";
import { equal, MemoryDatabase, rejects } from "./helpers.ts";
const request = (text: string) =>
  new Request("https://example.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text,
  });
Deno.test("bounded body rejects malformed and huge bodies without trusting Content-Length", async () => {
  await rejects(() => body(request("{")), "INVALID_JSON");
  await rejects(() => body(request("[]")), "INVALID_OBJECT");
  await rejects(
    () => body(request(JSON.stringify({ text: "x".repeat(1000) })), 32),
    "BODY_TOO_LARGE",
  );
  const response = await handler("ai-chat-v2")(
    new Request("https://example.test", { method: "GET" }),
  );
  equal(response.status, 405);
});
Deno.test("chat rejects arbitrary models, huge messages and unsafe option ranges", async () => {
  const valid = { messages: [{ role: "user", content: "Help me relax" }] };
  await rejects(
    () =>
      chatInput({ ...valid, options: { model: "expensive-unbounded-model" } }),
    "MODEL_NOT_ALLOWED",
  );
  await rejects(
    () => chatInput({ ...valid, options: { maxTokens: 100000 } }),
    "INVALID_OPTIONS",
  );
  await rejects(
    () =>
      chatInput({
        ...valid,
        messages: [{ role: "user", content: "x".repeat(2001) }],
      }),
    "INVALID_MESSAGE",
  );
  await rejects(
    () => chatInput({ ...valid, messages: [{ role: "tool", content: "x" }] }),
    "INVALID_ROLE",
  );
});
Deno.test("chat falls back and makes only one bounded continuation even when cutoff repeats", async () => {
  const calls: { name: string; tokens: number }[] = [];
  const answer = await chat(
    chatInput({ messages: [{ role: "user", content: "Relax" }] }),
    (name, _messages, tokens) => {
      calls.push({ name, tokens });
      if (name === "openrouter") throw new Error("upstream down");
      return Promise.resolve({
        text: calls.length === 2 ? "Breathe" : "slowly.",
        limited: true,
      });
    },
  );
  equal(answer, "Breathe slowly.");
  equal(calls, [{ name: "openrouter", tokens: 300 }, {
    name: "groq",
    tokens: 300,
  }, { name: "groq", tokens: 200 }]);
  await rejects(() =>
    chat(
      chatInput({ messages: [{ role: "user", content: "Relax" }] }),
      () => {
        throw new Error("down");
      },
    )
  );
});
Deno.test("WAV accepts actual mono PCM16 16k header and rejects mislabeled/malformed audio", async () => {
  const wav = new Uint8Array(364);
  const view = new DataView(wav.buffer);
  const write = (offset: number, value: string) =>
    wav.set(new TextEncoder().encode(value), offset);
  write(0, "RIFF");
  view.setUint32(4, 356, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, 320, true);
  const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  const input = {
    audioContent: encode(wav),
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    languageCode: "en-US",
  };
  equal(speechInput(input).config.encoding, "LINEAR16");
  await rejects(
    () => speechInput({ ...input, audioContent: btoa("caffxxxxxxxxxxx") }),
    "WAV_HEADER_REQUIRED",
  );
  view.setUint16(22, 2, true);
  await rejects(
    () => speechInput({ ...input, audioContent: encode(wav) }),
    "WAV_MUST_BE_MONO_PCM16_16KHZ",
  );
  await rejects(
    () => speechInput({ ...input, sampleRateHertz: 48000 }),
    "UNSUPPORTED_AUDIO_FORMAT",
  );
});
Deno.test("AMR-WB accepts real frame storage layout, rejects truncated payload", async () => {
  const bytes = new Uint8Array(27);
  bytes.set(new TextEncoder().encode("#!AMR-WB\n"));
  bytes[9] = 4;
  const input = {
    audioContent: btoa(String.fromCharCode(...bytes)),
    encoding: "AMR_WB",
    sampleRateHertz: 16000,
  };
  equal(speechInput(input).config.encoding, "AMR_WB");
  await rejects(
    () =>
      speechInput({
        ...input,
        audioContent: btoa(String.fromCharCode(...bytes.slice(0, 26))),
      }),
    "INVALID_AMR_FRAME",
  );
});
Deno.test("email accepts verified catch-all policy but never personal/disposable/outage guesses", () => {
  equal(
    qualification("person@work.com", {
      status: "catch-all",
      free_email: false,
    }),
    true,
  );
  equal(
    qualification("person@gmail.com", { status: "valid", free_email: false }),
    false,
  );
  equal(
    qualification("person@work.com", {
      status: "valid",
      sub_status: "role_based",
      free_email: false,
    }),
    false,
  );
  equal(qualification("person@work.com", {}), false);
});
Deno.test("endpoint rejects malformed payload and returns private errors without stack/data", async () => {
  const run = handler("ai-chat-v2", {
    authenticate: () => Promise.resolve({ uid: "one", emailVerified: false }),
    database: () => new MemoryDatabase(),
  });
  const response = await run(
    request(JSON.stringify({ timeZone: "UTC", messages: [] })),
  );
  equal(response.status, 400);
  equal(await response.json(), {
    success: false,
    code: "INVALID_MESSAGES",
    error: "INVALID_MESSAGES",
  });
});
