import Pretender from 'pretender';
import { dasherize } from '@ember/string';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('oncore:tests/helpers/setup-pretender');
const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };

const context = {};

async function delay(amount) {
  return new Promise((resolve) => setTimeout(resolve, amount));
}

function defer() {
  const out = {};
  out.promise = new Promise((resolve, reject) => {
    out.resolve = resolve;
    out.reject = reject;
  });
  return out;
}

export function waitForRequest(sourceMethod, url, { withOk } = {}) {
  const method = dasherize(sourceMethod);
  const matchMethod = context.requests[method] || {};
  const matchUrl = matchMethod[url] || [];
  const { promise, resolve, reject } = defer();

  if (matchUrl.length) {
    debug('[waitForRequest] found matching pending request');
    return promise;
  }

  debug('[waitForRequest] no matching request for "%s %s", pushing to waiter queue', method, url);
  const existingMethod = context.waiters[method] || {};
  const existingUrl = existingMethod[url] || [];
  const handle = {
    kind: 'waiter-handle',
    resolve,
    reject,
    withOk,
  };
  const updatedMethod = { ...existingMethod, [url]: [handle, existingUrl] };
  context.waiters = { ...context.waiters, [method]: updatedMethod };

  return promise;
}

export function setupPretender(hooks) {
  hooks.beforeEach(function () {
    if (context.server) {
      throw new Error('pretender already running');
    }

    async function handle(request) {
      const { method: sourceMethod, url } = request;
      const method = dasherize(sourceMethod);
      const methodQueue = context.waiters[method] || {};
      const pathQueue = methodQueue[url] || [];
      const { promise, resolve, reject } = defer();

      const ok = (body = {}) => {
        debug('[request] responding with good response');

        return new Promise((innerResolve) => {
          resolve({ status: 200, headers: { ...DEFAULT_HEADERS }, body });
          delay(100).then(() => innerResolve({ kind: 'ok-result' }));
        });
      };

      const missing = () => {
        debug('[request] responding with 404 response');

        return new Promise((innerResolve) => {
          resolve({ status: 404 });
          delay(100).then(() => innerResolve({ kind: 'ok-result' }));
        });
      };

      if (pathQueue.length) {
        debug('[request] found matching waiter for "%s %s", popping first and resolving', method, url);
        const [first, ...remainder] = pathQueue;
        const updatedMethodQueue = { ...methodQueue, [url]: remainder };
        context.waiters = {
          ...context.waiters,
          [method]: updatedMethodQueue,
        };

        if (first.withOk) {
          debug('[request] waiter has immediate response, responding');
          ok(first.withOk);
        }

        // Resolve our request api to the waiting test.
        first.resolve({ ok, missing });
        const response = await promise;

        debug('[request] waiter completed response - "%o"', response);
        return [response.status, response.headers || {}, response.body ? JSON.stringify(response.body) : ''];
      }

      debug('[request] no matching waiter for "%s %s", pushing new handle', method, url);
      const existingMethod = context.requests[method] || {};
      const existingUrl = existingMethod[url] || [];
      const handle = {
        kind: 'request-handle',
        resolve,
        reject,
      };
      const updatedMethod = { ...existingMethod, [url]: [...existingUrl, handle] };
      context.requests = { ...context.requests, [method]: updatedMethod };
      return promise;
    }

    const server = new Pretender(function () {
      this.get('/*', handle);
    });

    debug('setting up pretender');
    context.server = server;

    context.waiters = {};
    context.requests = {};
  });

  hooks.afterEach(function () {
    const { server } = context;

    if (!server) {
      return;
    }

    server.shutdown();
    context.server = null;
  });
}
