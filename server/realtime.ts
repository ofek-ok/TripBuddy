import type { Response } from 'express';

const coupleClients = new Map<string, Set<Response>>();

export function subscribeCoupleClient(coupleId: string, res: Response) {
  if (!coupleClients.has(coupleId)) {
    coupleClients.set(coupleId, new Set());
  }
  coupleClients.get(coupleId)!.add(res);

  res.on('close', () => {
    coupleClients.get(coupleId)?.delete(res);
  });
}

export function broadcastCoupleUpdate(coupleId: string, reason = 'sync') {
  const clients = coupleClients.get(coupleId);
  if (!clients || clients.size === 0) return;

  const payload = `data: ${JSON.stringify({ type: 'workspace_updated', reason, ts: Date.now() })}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}
