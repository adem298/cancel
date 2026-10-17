import type { IncomingMessage, ServerResponse } from 'node:http';
import { activateDevice } from '../../server/lib/billing';
import { env } from '../../server/lib/env';
import { HttpError, handleError, methodNotAllowed, readJson, sendJson } from '../../server/lib/http';
import { MAX_DEVICES, isValidDeviceId, normalizeLicenseKey, signDeviceToken } from '../../server/lib/license';

/** Registers this device against a license and returns a short-lived device token. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const raw = await readJson(req);
    const body = (raw && typeof raw === 'object' ? raw : {}) as { licenseKey?: unknown; deviceId?: unknown };
    const key = typeof body.licenseKey === 'string' ? normalizeLicenseKey(body.licenseKey) : null;
    const deviceId = typeof body.deviceId === 'string' && isValidDeviceId(body.deviceId) ? body.deviceId : null;
    if (!key) throw new HttpError(400, 'Enter a valid license key, for example SB-ABCD-EFGH-JKMN.');
    if (!deviceId) throw new HttpError(400, 'This device could not be identified. Reload the extension and try again.');

    const { purchaseId, devicesUsed } = await activateDevice(key, deviceId);
    const { token, expiresAt } = await signDeviceToken({ purchaseId, deviceId }, env('LICENSE_TOKEN_SECRET'));
    sendJson(res, 200, { token, expiresAt: expiresAt.toISOString(), devicesUsed, maxDevices: MAX_DEVICES });
  } catch (err) {
    handleError(res, err);
  }
}
