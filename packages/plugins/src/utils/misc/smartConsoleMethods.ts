import { isDebugMode } from './debugMode';

export function consoleLog(...args: unknown[]) : void {
  const debug = isDebugMode()
  if (!debug) {
    return
  }

  // eslint-disable-next-line no-console
  console.log(...args);
}

export function consoleError(...args: unknown[]) : void {
  const debug = isDebugMode()
  if (!debug) {
    return
  }

  // eslint-disable-next-line no-console
  console.error(...args);
}
