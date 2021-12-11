'use strict';

/* eslint-disable @typescript-eslint/no-var-requires */
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const autoprefixer = require('autoprefixer');
const tailwindcss = require('tailwindcss');
/* eslint-enable @typescript-eslint/no-var-requires */

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    fontawesome: {},
    postcssOptions: {
      compile: {
        enabled: true,
        plugins: [
          {
            module: autoprefixer,
          },
          {
            module: tailwindcss,
            options: { config: './tailwindcss-config.js' },
          },
        ],
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Webpack } = require('@embroider/webpack');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@embroider/compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
  });
};
