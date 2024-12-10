/* eslint-disable no-console */
import nopt from 'nopt';
import createDebug from 'debug';

const debug = createDebug('lib:util:nopt');

// to validate unknown options
function unknownValidate(options, validOptions, remainValidate) {
  const invalidOptions = Object.keys(options).filter(
    (item) => item !== 'argv' && !validOptions.includes(item)
  );

  const invalidRemain = !remainValidate(options);

  if (invalidOptions.length === 0 && !invalidRemain) return true;

  if (invalidOptions.length)
    console.log(
      `Invalid option(s):\n${JSON.stringify(invalidOptions, null, 2)}`
    );
  if (invalidRemain)
    console.log(
      `Invalid remain(s):\n${JSON.stringify(options.argv.remain, null, 2)}`
    );
  return false;
}

export default (
  knownOpts,
  shortHands,
  args,
  slice,
  {
    help = () => {
      process.exit(1);
    },
    remainValidate = (opts) => opts.argv.remain.length === 0,
    invalidHandler = (k, v, t) => {
      debug(`invalidHandler triggerred`);
      console.log(`Invalid option(s): ${k}, ${v}, ${t}`);
      help();
    },
  }
) => {
  // 'invalid' in this context refers to an invalid value for a
  // known option - as opposed to an unknown option:
  //   https://github.com/npm/nopt/pull/39
  //   https://github.com/npm/nopt/issues/40
  nopt.invalidHandler = invalidHandler;

  const cmdOptions = nopt(knownOpts, shortHands, args, slice);
  // restore nopt.invalidHandler for the next parse if any
  nopt.invalidHandler = (k, v, t) => {};

  if (!unknownValidate(cmdOptions, Object.keys(knownOpts), remainValidate))
    help();

  return cmdOptions;
};
