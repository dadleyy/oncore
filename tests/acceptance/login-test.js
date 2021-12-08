import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit, findAll, currentURL } from '@ember/test-helpers';
import { setupPretender, waitForRequest } from 'oncore/tests/helpers/setup-pretender';

module('Acceptance | Login', function (hooks) {
  setupApplicationTest(hooks);
  setupPretender(hooks);

  test('it redirects the user to home when 200 on session', async function (assert) {
    const load = visit('/login');
    await Promise.all([
      waitForRequest('get', '/auth/identify', { withOk: {} }),
      waitForRequest('get', '/tables', { withOk: [] }),
      load,
    ]);
    const createButtons = await findAll('[data-role=create-table]');
    const url = await currentURL();
    assert.true(createButtons.length > 0, 'there are create buttons');
    assert.equal(url, '/home');
  });

  test('it redirects the user to login when 404 on session', async function (assert) {
    const load = visit('/home');
    const request = await waitForRequest('get', '/auth/identify');
    await Promise.all([request.missing(), load]);
    const links = await findAll('[data-role=login-link]');
    assert.equal(links.length, 1, 'the login link rendered');
    const url = await currentURL();
    assert.equal(url, '/login', 'we are at the login page');
  });
});
