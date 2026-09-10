import { env, fetchJSON, HttpError, object, text } from "./http.ts";
export function speechInput(input: Record<string, unknown>) {
  const audio = text(input.audioContent ?? input.audioBase64, 1400000, "AUDIO");
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      audio,
    )
  ) throw new HttpError(400, "INVALID_BASE64");
  const bytes = Uint8Array.from(atob(audio), (value) => value.charCodeAt(0));
  const encoding = input.encoding;
  const rate = input.sampleRateHertz ?? input.sampleRate;
  if ((encoding !== "LINEAR16" && encoding !== "AMR_WB") || rate !== 16000) {
    throw new HttpError(400, "UNSUPPORTED_AUDIO_FORMAT");
  }
  if (bytes.length < 12 || bytes.length > 1048576) {
    throw new HttpError(400, "AUDIO_SIZE");
  }
  const header = new TextDecoder().decode(bytes.slice(0, 12));
  if (encoding === "AMR_WB" && !header.startsWith("#!AMR-WB\n")) {
    throw new HttpError(400, "AMR_HEADER_REQUIRED");
  }
  if (encoding === "LINEAR16") {
    if (!header.startsWith("RIFF") || header.slice(8) !== "WAVE") {
      throw new HttpError(400, "WAV_HEADER_REQUIRED");
    }
    const view = new DataView(bytes.buffer);
    if (view.getUint32(4, true) + 8 !== bytes.length) {
      throw new HttpError(400, "TRUNCATED_WAV");
    }
    let offset = 12;
    let format = false;
    let duration = 0;
    while (offset + 8 <= bytes.length) {
      const name = new TextDecoder().decode(bytes.slice(offset, offset + 4));
      const size = view.getUint32(offset + 4, true);
      if (offset + 8 + size > bytes.length) {
        throw new HttpError(400, "TRUNCATED_WAV");
      }
      if (name === "fmt ") {
        if (
          size < 16 || view.getUint16(offset + 8, true) !== 1 ||
          view.getUint16(offset + 10, true) !== 1 ||
          view.getUint32(offset + 12, true) !== 16000 ||
          view.getUint16(offset + 22, true) !== 16
        ) throw new HttpError(400, "WAV_MUST_BE_MONO_PCM16_16KHZ");
        format = true;
      }
      if (name === "data") duration += size / 32000;
      offset += 8 + size + size % 2;
    }
    if (!format || duration <= 0 || duration > 30) {
      throw new HttpError(400, "AUDIO_DURATION");
    }
  } else {
    // AMR-WB frames are 20 ms; validate storage format and cap at 30 seconds.
    const frameBytes: Record<number, number> = {
      0: 17,
      1: 23,
      2: 32,
      3: 36,
      4: 40,
      5: 46,
      6: 50,
      7: 58,
      8: 60,
      9: 5,
      14: 0,
      15: 0,
    };
    let offset = 9;
    let frames = 0;
    while (offset < bytes.length) {
      const type = (bytes[offset] >> 3) & 15;
      const size = frameBytes[type];
      if (
        size === undefined || (bytes[offset] & 0x83) !== 0 ||
        offset + size + 1 > bytes.length
      ) throw new HttpError(400, "INVALID_AMR_FRAME");
      offset += size + 1;
      if (++frames > 1500) throw new HttpError(400, "AUDIO_DURATION");
    }
    if (!frames) throw new HttpError(400, "EMPTY_AUDIO");
  }
  const language = input.languageCode ?? "en-US";
  if (
    !["en-US", "en-GB", "es-ES", "es-US", "zh-CN", "zh-TW"].includes(
      String(language),
    )
  ) throw new HttpError(400, "UNSUPPORTED_LANGUAGE");
  return {
    audio: { content: audio },
    config: {
      encoding,
      sampleRateHertz: 16000,
      languageCode: language,
      alternativeLanguageCodes: ["es-ES", "zh-CN"].filter((value) =>
        value !== language
      ),
      model: "latest_short",
      enableAutomaticPunctuation: false,
      enableWordTimeOffsets: false,
    },
  };
}
export function legacySpeechInput(input: Record<string, unknown>) {
  const encoding = input.encoding ?? "WEBM_OPUS";
  if (encoding !== "WEBM_OPUS") return speechInput(input);
  const rate = input.sampleRate ?? input.sampleRateHertz ?? 48000;
  if (rate !== 48000) throw new HttpError(400, "UNSUPPORTED_AUDIO_FORMAT");
  const audio = text(input.audioBase64 ?? input.audioContent, 280000, "AUDIO");
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      audio,
    )
  ) throw new HttpError(400, "INVALID_BASE64");
  const raw = atob(audio);
  if (
    raw.length < 32 || raw.length > 200000 || raw.charCodeAt(0) !== 0x1a ||
    raw.charCodeAt(1) !== 0x45 || raw.charCodeAt(2) !== 0xdf ||
    raw.charCodeAt(3) !== 0xa3 || !raw.includes("webm") ||
    !raw.includes("OpusHead")
  ) throw new HttpError(400, "WEBM_OPUS_HEADER_REQUIRED");
  const language = input.languageCode ?? "en-US";
  if (
    !["en-US", "en-GB", "es-ES", "es-US", "zh-CN", "zh-TW"].includes(
      String(language),
    )
  ) throw new HttpError(400, "UNSUPPORTED_LANGUAGE");
  return {
    audio: { content: audio },
    config: {
      encoding: "WEBM_OPUS",
      sampleRateHertz: 48000,
      languageCode: language,
      alternativeLanguageCodes: ["es-ES", "zh-CN"].filter((value) =>
        value !== language
      ),
      model: "latest_short",
      enableAutomaticPunctuation: false,
      enableWordTimeOffsets: false,
    },
  };
}

export async function transcribe(
  input: ReturnType<typeof speechInput> | ReturnType<typeof legacySpeechInput>,
) {
  const data = await fetchJSON(
    `https://speech.googleapis.com/v1/speech:recognize?key=${
      encodeURIComponent(env("GOOGLE_SPEECH_API_KEY"))
    }`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    20000,
  );
  let transcript = "";
  let language = input.config.languageCode;
  let confidence = -1;
  for (const result of Array.isArray(data.results) ? data.results : []) {
    const row = object(result);
    const alternatives = row.alternatives;
    const first = Array.isArray(alternatives) && alternatives[0]
      ? object(alternatives[0])
      : {};
    if (typeof first.transcript === "string") {
      transcript += `${transcript ? " " : ""}${first.transcript}`;
    }
    if (
      typeof first.confidence === "number" && first.confidence > confidence &&
      typeof row.languageCode === "string"
    ) {
      confidence = first.confidence;
      language = row.languageCode;
    }
  }
  if (!transcript.trim()) throw new HttpError(422, "NO_SPEECH_DETECTED");
  return { text: transcript.trim(), detectedLanguage: language };
}
