import Route from '@ember/routing/route';
import fetch from 'fetch';

class ApplicationRoute extends Route {
  public async model(): Promise<void> {
    await fetch('/auth/identify');
    console.log('loading application state');
  }
}

export default ApplicationRoute;
