/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',
  icon: '../../assets/images/icon.png',
  displayName: 'Physiq',
  // Speech.framework / SFSpeechRecognizer is unavailable on watchOS; the meal
  // dictation flow uses TextFieldLink (system dictation), which needs no extra
  // frameworks, no microphone entitlement, and no speech-recognition entitlement.
  frameworks: ['WatchConnectivity', 'SwiftUI'],
  // TextFieldLink requires watchOS 9.0+.
  deploymentTarget: '9.0',
  bundleIdentifier: '.watch',
});
