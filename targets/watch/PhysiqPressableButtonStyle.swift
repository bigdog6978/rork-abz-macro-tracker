import SwiftUI

/// Subtle press scale for watch buttons; respects Reduce Motion.
struct PhysiqPressableButtonStyle: ButtonStyle {
  var pressedScale: CGFloat = 0.96

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(reduceMotion ? 1 : (configuration.isPressed ? pressedScale : 1))
      .animation(reduceMotion ? nil : .spring(response: 0.15, dampingFraction: 0.72), value: configuration.isPressed)
  }
}

/// Slightly lighter scale for grid selectors (day type, etc.).
struct PhysiqSelectButtonStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(reduceMotion ? 1 : (configuration.isPressed ? 0.97 : 1))
      .animation(reduceMotion ? nil : .spring(response: 0.15, dampingFraction: 0.72), value: configuration.isPressed)
  }
}
