import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { consoleLog, consoleError } from 'packages/plugins/src/utils/misc/smartConsoleMethods';

dotenv.config({ path: resolve(__dirname, '../../.env') });

export function json(res: any, {status, message, data, exception}: { status: number; message: string, data?: any, exception?: any}) {
  if (status >= 400) {
    consoleError(message, exception ?? 'No exception given');
  } else {
    consoleLog(message, exception ?? 'No exception given');
  }

  return res.status(status).json({
    message,
    data
  })
}
