import type { Context } from "hono";

type Subscriber = { userId: string; send: (event: string, data: unknown) => void; close: () => void };

const subscribers = new Map<string, Set<Subscriber>>();

export function addSubscriber(userId: string, sub: Subscriber) {
  if (!subscribers.has(userId)) subscribers.set(userId, new Set());
  subscribers.get(userId)!.add(sub);
}

export function removeSubscriber(userId: string, sub: Subscriber) {
  subscribers.get(userId)?.delete(sub);
  if (subscribers.get(userId)?.size === 0) subscribers.delete(userId);
}

export function broadcastToUser(userId: string, event: string, data: unknown) {
  subscribers.get(userId)?.forEach((sub) => sub.send(event, data));
}

export function broadcastToAll(event: string, data: unknown) {
  subscribers.forEach((subs) => subs.forEach((sub) => sub.send(event, data)));
}
