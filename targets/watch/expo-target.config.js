/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',
  icon: '../../assets/images/icon.png',
  displayName: 'Physiq',
  frameworks: ['WatchConnectivity', 'SwiftUI', 'Speech', 'AVFoundation'],
  deploymentTarget: '8.0',
  bundleIdentifier: '.watch',
  infoPlist: {
    NSMicrophoneUsageDescription:
      'Physiq uses the microphone so you can speak meals into your food log from Apple Watch.',
    NSSpeechRecognitionUsageDescription:
      'Physiq uses speech recognition to turn spoken meals into food entries with macros.',
  },
});
