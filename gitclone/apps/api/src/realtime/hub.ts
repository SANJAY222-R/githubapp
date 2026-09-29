export type Subscriber = {
  userId: string;
  send: (event: string, data: unknown) => void;
  close: () => void;
};

const subscribers = new Map<string, Set<Subscriber>>();
export const MAX_SSE_PER_USER = 3;

export function getSubscriberCount(userId: string): number {
  return subscribers.get(userId)?.size ?? 0;
}

export function addSubscriber(userId: string, sub: Subscriber): boolean {
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  const userSubs = subscribers.get(userId)!;
  if (userSubs.size >= MAX_SSE_PER_USER) {
    return false;
  }
  userSubs.add(sub);
  return true;
}

export function removeSubscriber(userId: string, sub: Subscriber): void {
  subscribers.get(userId)?.delete(sub);
  if (subscribers.get(userId)?.size === 0) {
    subscribers.delete(userId);
  }
}

export function broadcastToUser(userId: string, event: string, data: unknown): void {
  subscribers.get(userId)?.forEach((sub) => sub.send(event, data));
}

export function broadcastToAll(event: string, data: unknown): void {
  subscribers.forEach((subs) => subs.forEach((sub) => sub.send(event, data)));
}

export function clearSubscribers(): void {
  subscribers.clear();
}
