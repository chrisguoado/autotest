import path from 'path';
import settings from './settings.js';

const requireReplaces = settings.requireReplaces || [];

const rules = [];
requireReplaces.forEach((item) => {
  rules.push({
    // item.test usually would be a regex;
    // item.files usually would be a path, in this case,
    // convert it to an absolute path.
    ...((item.test || item.files) && {
      test: item.test || path.resolve(item.files),
    }),
    ...(item.include && {
      include: item.include.map((i) => path.resolve(i)),
    }),
    loader: 'string-replace-loader',
    options: {
      search: item.from,
      replace: item.to,
      ...(item.flags !== undefined && { flags: item.flags }),
    },
  });
});

export default {
  module: {
    rules,
  },
};
