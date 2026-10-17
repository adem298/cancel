import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

export function methodNotAllowed(res: ServerResponse, allowed: string[]): void {
  res.setHeader('allow', allowed.join(', '));
  sendJson(res, 405, { error: 'Method not allowed.' });
}

/** Maps errors to responses. Internal details are logged, never returned. */
export function handleError(res: ServerResponse, err: unknown): void {
  if (err instanceof HttpError) {
    sendJson(res, err.status, { error: err.message });
    return;
  }
  console.error('[stopbill-api]', err);
  sendJson(res, 500, { error: 'Something went wrong. Please try again.' });
}

export async function readBody(req: IncomingMessage, maxBytes = 64_000): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer);
    size += buf.length;
    if (size > maxBytes) throw new HttpError(413, 'Request body is too large.');
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

/** Accepts a body the platform already parsed, or reads and parses the raw stream. */
export async function readJson(req: IncomingMessage): Promise<unknown> {
  const pre = (req as IncomingMessage & { body?: unknown }).body;
  if (pre !== undefined) {
    if (typeof pre === 'string') return parseJson(pre);
    return pre;
  }
  const raw = await readBody(req);
  if (raw.length === 0) return {};
  return parseJson(raw.toString('utf8'));
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

export function queryParam(req: IncomingMessage, name: string): string | null {
  return new URL(req.url ?? '/', 'http://localhost').searchParams.get(name);
}

export function bearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1]!.trim() : null;
}
