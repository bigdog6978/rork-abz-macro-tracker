/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',
  icon: '../../assets/images/icon.png',
  displayName: 'Physiq',
  // Speech.framework / SFSpeechRecognizer is unavailable on watchOS; the meal
  // dictation flow uses a native SwiftUI TextField (Scribble/Dictation/Emoji),
  // which needs no extra frameworks, no microphone entitlement, and no
  // speech-recognition entitlement. On watchOS 9+ it upgrades to TextFieldLink.
  frameworks: ['WatchConnectivity', 'SwiftUI'],
  // Floor at watchOS 8.0 so Apple Watch Series 3 (42mm) and newer can install.
  deploymentTarget: '8.0',
  bundleIdentifier: '.watch',
  // Shared with the watch-widget target: complication snapshot handoff.
  entitlements: {
    'com.apple.security.application-groups': ['group.app.rork.abz-macro-tracker'],
  },
});
