'use strict';

module.exports = function (environment) {
  let ENV = {
    modulePrefix: 'oncore',
    podModulePrefix: 'oncore/pods',
    environment,
    rootURL: '/',
    locationType: 'auto',
    apiUrl: '',
    externalRoutes: {
      auth: {
        start: 'http://0.0.0.0:8611/auth/start',
      },
    },
    EmberENV: {
      FEATURES: {},
      EXTEND_PROTOTYPES: { Date: false },
    },
    APP: {},
  };

  if (environment === 'production') {
    ENV.rootURL = process.env['ONCORE_ROOT_URL'];
    ENV.apiUrl = process.env['ONCORE_TWOWAIYO_API_URL'];
    ENV.externalRoutes.auth.start = process.env['ONCORE_TWOWAIYO_AUTH_START_URL'];
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  return ENV;
};
