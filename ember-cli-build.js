'use strict';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {});

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
