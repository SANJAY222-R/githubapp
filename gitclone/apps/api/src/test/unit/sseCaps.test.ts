import { describe, it, expect, beforeEach } from "vitest";
import {
  addSubscriber,
  removeSubscriber,
  getSubscriberCount,
  clearSubscribers,
  MAX_SSE_PER_USER,
} from "../../realtime/hub.js";

describe("SSE Connection Caps & Lifecycle", () => {
  beforeEach(() => {
    clearSubscribers();
  });

  it("enforces maximum 3 concurrent active streams per user", () => {
    const user1 = "user_1";

    const sub1 = { userId: user1, send: () => {}, close: () => {} };
    const sub2 = { userId: user1, send: () => {}, close: () => {} };
    const sub3 = { userId: user1, send: () => {}, close: () => {} };
    const sub4 = { userId: user1, send: () => {}, close: () => {} };

    expect(addSubscriber(user1, sub1)).toBe(true);
    expect(addSubscriber(user1, sub2)).toBe(true);
    expect(addSubscriber(user1, sub3)).toBe(true);
    expect(getSubscriberCount(user1)).toBe(MAX_SSE_PER_USER);

    // 4th subscriber for user1 must be rejected
    expect(addSubscriber(user1, sub4)).toBe(false);
    expect(getSubscriberCount(user1)).toBe(MAX_SSE_PER_USER);
  });

  it("allows a different user to connect up to their own limit", () => {
    const user1 = "user_1";
    const user2 = "user_2";

    const sub1 = { userId: user1, send: () => {}, close: () => {} };
    const sub2 = { userId: user2, send: () => {}, close: () => {} };

    expect(addSubscriber(user1, sub1)).toBe(true);
    expect(addSubscriber(user2, sub2)).toBe(true);

    expect(getSubscriberCount(user1)).toBe(1);
    expect(getSubscriberCount(user2)).toBe(1);
  });

  it("decrements subscriber count when a stream closes and allows new connections", () => {
    const user1 = "user_1";
    const sub1 = { userId: user1, send: () => {}, close: () => {} };
    const sub2 = { userId: user1, send: () => {}, close: () => {} };
    const sub3 = { userId: user1, send: () => {}, close: () => {} };
    const sub4 = { userId: user1, send: () => {}, close: () => {} };

    addSubscriber(user1, sub1);
    addSubscriber(user1, sub2);
    addSubscriber(user1, sub3);

    // Remove sub1
    removeSubscriber(user1, sub1);
    expect(getSubscriberCount(user1)).toBe(2);

    // Now sub4 can connect
    expect(addSubscriber(user1, sub4)).toBe(true);
    expect(getSubscriberCount(user1)).toBe(3);
  });
});
