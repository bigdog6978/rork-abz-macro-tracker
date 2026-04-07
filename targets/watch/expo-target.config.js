/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',
  icon: '../../assets/images/icon.png',
  displayName: 'Physiq',
  frameworks: ['WatchConnectivity', 'SwiftUI'],
  deploymentTarget: '11.0',
  bundleIdentifier: '.watch',
});
