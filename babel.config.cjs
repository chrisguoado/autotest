const presets = [
  [
    '@babel/preset-env',
    {
      targets: {
        node: 'current',
      },
    },
  ],
];

const plugins = [];

/*
if (process.env["ENV"] === "prod") {
  plugins.push(...);
}
*/

module.exports = {
  presets,
  plugins,
};
