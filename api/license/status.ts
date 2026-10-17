import type { IncomingMessage, ServerResponse } from 'node:http';
import { licenseStatus } from '../../server/lib/billing';
import { env } from '../../server/lib/env';
import { HttpError, bearerToken, handleError, methodNotAllowed, sendJson } from '../../server/lib/http';
import { verifyDeviceToken } from '../../server/lib/license';

/** Checks a device token and confirms the license is still active on this device. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const token = bearerToken(req);
    if (!token) throw new HttpError(401, 'Sign in with your license key first.');

    let claims;
    try {
      claims = await verifyDeviceToken(token, env('LICENSE_TOKEN_SECRET'));
    } catch {
      throw new HttpError(401, 'Your session has expired. Activate this device again.');
    }
    const status = await licenseStatus(claims.purchaseId, claims.deviceId);
    if (!status.active) throw new HttpError(403, 'This device is no longer active on the license.');
    sendJson(res, 200, { active: true, devicesUsed: status.devicesUsed, maxDevices: status.maxDevices });
  } catch (err) {
    handleError(res, err);
  }
}
