import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserData, saveUserData } from '../../src/server/store';
import { getKVClient } from '../../src/server/kvClient';
import type { UserDataInput } from '../../src/types/userData';

const ID_PATTERN = /^[a-zA-Z0-9-]{8,100}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  const kv = getKVClient();

  if (req.method === 'GET') {
    const data = await getUserData(kv, id);
    if (!data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.status(200).json(data);
    return;
  }

  if (req.method === 'PUT') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as UserDataInput;
    const data = await saveUserData(kv, id, body);
    res.status(200).json(data);
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
}
