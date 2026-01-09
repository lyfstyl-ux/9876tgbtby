import type { Request, Response } from 'express';

type SSEClient = {
  id: number;
  res: Response;
};

let clients: SSEClient[] = [];
let nextId = 1;

export function subscribeSSE(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client: SSEClient = { id: nextId++, res };
  clients.push(client);

  // Send a welcome event
  res.write(`event: connected\ndata: ${JSON.stringify({ id: client.id })}\n\n`);

  req.on('close', () => {
    clients = clients.filter((c) => c.id !== client.id);
  });
}

export function sendNotification(event: string, payload: any) {
  const data = JSON.stringify(payload);
  clients.forEach((c) => {
    try {
      c.res.write(`event: ${event}\ndata: ${data}\n\n`);
    } catch (e) {
      // ignore write errors; remove closed clients lazily on next request close
    }
  });
}
