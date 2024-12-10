import { pick } from 'lodash-es';
import { BaseExporter } from './base.js';

/**
 * @implements {BaseExporter}
 */
export class JSONLineExporter extends BaseExporter {
  /**
   * @param {!Object} result
   * @override
   */
  writeLine(result) {
    if (this._settings.fields) result = pick(result, this._settings.fields);
    const line = JSON.stringify(result, this._settings.jsonReplacer);
    this._stream.write(`${line}\n`);
  }

  /**
   * @override
   */
  writeHeader() {}

  /**
   * @override
   */
  writeFooter() {}
}
