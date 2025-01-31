import { Logger } from './core/Logger';

(function main() {
  Logger.shared.info('info', { info: 'info' });
  Logger.shared.dbg('dbg', { dbg: 'dbg' });
  Logger.shared.error({ stack: 'shared', name: 'error', message: 'message' }, { error: 'error' });
})();
