## oncore

The frontend for [`twowaiyo`](https://github.com/dadleyy/twowaiyo).

---

### Prerequisites + Installation

This is an [emberjs](https://emberjs.com/) single-page, client-side application.

* `git clone git@github.com:dadleyy/oncore.git`
* `cd oncore`
* `npm install`

### Running / Development

* `npm run start:proxy`
* `npm run build`

### Running Tests

* `npm test:ember`

### Linting

* `npm run lint:js`
* `npm run lint:deps`
* `npm run lint:hbs`

### Notes

When making changes to the `ember-intl` translation files, rebuild-on-edit is available using [this workaround][w]:

```
EMBROIDER_REBUILD_ADDONS=ember-intl npm run start:proxy
```

[w]: https://github.com/ember-intl/ember-intl/issues/1544
