import { generateKeyPair, SignJWT } from "jose";
import {
  authenticate,
  certificateKey,
  PROJECT,
} from "../functions/_shared/auth.ts";
import { equal, rejects } from "./helpers.ts";
const now = new Date("2026-09-10T12:00:00Z");
const seconds = now.getTime() / 1000;
const pair = await generateKeyPair("RS256");
const token = (
  overrides: Record<string, unknown> = {},
  key = pair.privateKey,
) =>
  new SignJWT({
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    sub: "anonymous-user",
    iat: seconds - 5,
    exp: seconds + 3600,
    auth_time: seconds - 5,
    ...overrides,
  }).setProtectedHeader({ alg: "RS256", kid: "test-key" }).sign(key);
const request = (value: string) =>
  new Request("https://example.test", {
    headers: { Authorization: `Bearer ${value}` },
  });
Deno.test("Firebase RS256 token authenticates UID, including anonymous signup", async () => {
  equal(
    await authenticate(
      request(await token()),
      () => Promise.resolve(pair.publicKey),
      now,
    ),
    { uid: "anonymous-user", emailVerified: false },
  );
});
Deno.test("missing, expired, spoofed audience/issuer, future auth and empty subject rejected", async () => {
  await rejects(
    () =>
      authenticate(
        new Request("https://example.test"),
        () => Promise.resolve(pair.publicKey),
        now,
      ),
    "AUTH_REQUIRED",
  );
  for (
    const claims of [
      { exp: seconds - 61 },
      { aud: "other-project" },
      { iss: "https://attacker.test" },
      { sub: "" },
      { sub: "bad/path" },
      { auth_time: seconds + 61 },
      { iat: seconds + 61 },
    ]
  ) {
    await rejects(
      async () =>
        authenticate(
          request(await token(claims)),
          () => Promise.resolve(pair.publicKey),
          now,
        ),
      "INVALID_TOKEN",
    );
  }
});
Deno.test("attacker signed token and non-RS256 algorithm rejected", async () => {
  const attacker = await generateKeyPair("RS256");
  await rejects(
    async () =>
      authenticate(
        request(await token({}, attacker.privateKey)),
        () => Promise.resolve(pair.publicKey),
        now,
      ),
    "INVALID_TOKEN",
  );
  const hs = await new SignJWT({ sub: "admin" }).setProtectedHeader({
    alg: "HS256",
    kid: "test-key",
  }).sign(new Uint8Array(32));
  await rejects(
    () => authenticate(request(hs), () => Promise.resolve(pair.publicKey), now),
    "INVALID_TOKEN",
  );
});

Deno.test("auth tolerates bounded clock skew and certificate outages stay retryable", async () => {
  equal(
    (await authenticate(
      request(await token({ iat: seconds + 60, auth_time: seconds + 60 })),
      () => Promise.resolve(pair.publicKey),
      now,
    )).uid,
    "anonymous-user",
  );
  const unavailable = certificateKey(() =>
    Promise.reject(new TypeError("offline"))
  );
  await rejects(
    async () => authenticate(request(await token()), unavailable, now),
    "AUTH_CERTIFICATES_UNAVAILABLE",
  );
});
Deno.test("unknown signing key refreshes cached certificates once after cooldown", async () => {
  let time = 0;
  let calls = 0;
  const key = certificateKey(() => {
    calls++;
    return Promise.resolve(
      new Response(JSON.stringify({ existing: "certificate" }), {
        headers: { "cache-control": "max-age=3600" },
      }),
    );
  }, () => time);
  const attempt = async () => authenticate(request(await token()), key, now);
  await rejects(attempt, "INVALID_TOKEN");
  equal(calls, 1);
  time = 60000;
  await rejects(attempt, "INVALID_TOKEN");
  equal(calls, 2);
  await rejects(attempt, "INVALID_TOKEN");
  equal(calls, 2);
});
