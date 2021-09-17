export default config;

declare const config: {
  environment: string;
  modulePrefix: string;
  apiUrl: string;
  externalRoutes: {
    auth: {
      start: string;
    };
  };
  podModulePrefix: string;
  locationType: string;
  rootURL: string;
  APP: Record<string, unknown>;
};
