import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createIdentity } from '../src/server/store';
import { getKVClient } from '../src/server/kvClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const id = randomUUID();
  const data = await createIdentity(getKVClient(), id);
  res.status(200).json({ id: data.id });
}
