import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientIp, rateLimit, rateLimitHeaders } from "@/server/rate-limit";

describe("rateLimit (memory store)", () => {
  beforeEach(() => {
    delete process.env.RATE_LIMIT_DISABLED;
    delete process.env.UPSTASH_REDIS_REST_URL;
  });
  afterEach(() => {
    process.env.RATE_LIMIT_DISABLED = "1";
  });

  it("allows up to the limit, then refuses with a Retry-After", async () => {
    const rule = { bucket: `t-${Date.now()}`, limit: 3, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await rateLimit(rule, "user-a"));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]!.remaining).toBe(0);
    expect(rateLimitHeaders(results[3]!)["Retry-After"]).toBeDefined();
    expect(rateLimitHeaders(results[0]!)["Retry-After"]).toBeUndefined();
  });

  it("keys by subject, so one caller cannot exhaust another's budget", async () => {
    const rule = { bucket: `s-${Date.now()}`, limit: 1, windowSeconds: 60 };
    expect((await rateLimit(rule, "a")).allowed).toBe(true);
    expect((await rateLimit(rule, "a")).allowed).toBe(false);
    expect((await rateLimit(rule, "b")).allowed).toBe(true);
  });

  it("can be switched off for incidents and tests", async () => {
    process.env.RATE_LIMIT_DISABLED = "1";
    const rule = { bucket: `o-${Date.now()}`, limit: 1, windowSeconds: 60 };
    expect((await rateLimit(rule, "a")).allowed).toBe(true);
    expect((await rateLimit(rule, "a")).allowed).toBe(true);
  });

  it("reads the first x-forwarded-for hop", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } }))).toBe("203.0.113.9");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
