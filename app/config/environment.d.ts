export default config;

declare const config: {
  environment: string;
  version: string;
  modulePrefix: string;
  apiURL: string;
  avatarURL: string;
  externalRoutes: {
    auth: {
      start: string;
      logout: string;
    };
  };
  podModulePrefix: string;
  locationType: string;
  rootURL: string;
  APP: Record<string, unknown>;
};
