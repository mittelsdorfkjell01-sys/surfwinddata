import { describe, it, expect, beforeEach } from "vitest";
import { revalidate, peek, __resetCache } from "../swr";

beforeEach(() => __resetCache());

describe("swr cache", () => {
  it("stores data on success", async () => {
    await revalidate("k", async () => 42);
    expect(peek<number>("k")?.data).toBe(42);
    expect(peek("k")?.error).toBeUndefined();
  });

  it("surfaces an error when there is nothing cached", async () => {
    await revalidate("k", async () => {
      throw new Error("boom");
    });
    expect(peek("k")?.data).toBeUndefined();
    expect(peek("k")?.error).toBeTruthy();
  });

  it("keeps stale data when a later refresh fails (stale-while-revalidate)", async () => {
    await revalidate("k", async () => 1);
    await revalidate("k", async () => {
      throw new Error("x");
    });
    expect(peek<number>("k")?.data).toBe(1); // stale data kept
    expect(peek("k")?.error).toBeUndefined(); // transient error not surfaced
  });

  it("dedupes concurrent requests for the same key", async () => {
    let calls = 0;
    const fetcher = () =>
      new Promise<number>((resolve) => {
        calls += 1;
        setTimeout(() => resolve(calls), 10);
      });
    const p1 = revalidate("k", fetcher);
    const p2 = revalidate("k", fetcher);
    expect(p1).toBe(p2); // joined the same in-flight request
    await p1;
    expect(calls).toBe(1);
  });

  it("refetches after the previous request settled", async () => {
    let calls = 0;
    const fetcher = async () => ++calls;
    await revalidate("k", fetcher);
    await revalidate("k", fetcher);
    expect(calls).toBe(2);
    expect(peek<number>("k")?.data).toBe(2);
  });
});
