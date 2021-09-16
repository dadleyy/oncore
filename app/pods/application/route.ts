import Route from '@ember/routing/route';

class ApplicationRoute extends Route {
  public model(): void {
    console.log('loading application state');
  }
}

export default ApplicationRoute;
