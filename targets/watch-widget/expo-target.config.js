/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch-widget',
  displayName: 'Physiq',
  // WidgetKit accessory complications require watchOS 9; the watch app itself
  // stays at 8.0 — complications are simply unavailable on watchOS 8.
  deploymentTarget: '9.0',
  // Must be prefixed by the watch app bundle id (.watch) since the extension
  // is embedded in the watch app.
  bundleIdentifier: '.watch.widget',
  entitlements: {
    'com.apple.security.application-groups': ['group.app.rork.abz-macro-tracker'],
  },
});
