import path from 'path';
import clone from 'clone';
import {
  getLogger,
  updateLoggers,
  closeLoggers,
} from '../lib/js/log/winston/index.js';
import { get, set } from '../lib/js/util/object.js';

export { closeLoggers } from '../lib/js/log/winston/index.js';

export function createLogger(options = {}) {
  const config = clone(options);

  const { name } = config;
  if (!config.label) config.label = name;

  if (!get(options, 'transports[1].filename'))
    set(config, 'transports[1].filename', path.resolve(`log/${name}.log`));
  if (!get(options, 'transports[2].filename'))
    set(
      config,
      'transports[2].filename',
      path.resolve(`log/${name}_error.log`)
    );
  if (!get(options, 'transports[3].filename'))
    set(
      config,
      'transports[3].filename',
      path.resolve(`log/${name}_%DATE%.log`)
    );

  return getLogger(config);
}
