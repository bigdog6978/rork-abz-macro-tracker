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

/// Hydration ±8 oz footer — mirrors phone `HydrationActionTileGrid` rest + pressed styles.
struct HydrationActionButtonStyle: ButtonStyle {
  let hydrationColor: Color
  let isSubtract: Bool
  var isDisabled: Bool = false
  var cornerRadius: CGFloat = 12
  var pressedScale: CGFloat = 0.96

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  func makeBody(configuration: Configuration) -> some View {
    let pressed = configuration.isPressed
    let isActive = pressed && !isDisabled

    let fill: Color = isActive
      ? hydrationColor
      : (isSubtract ? PhysiqTheme.card : PhysiqTheme.hydrationMutedFill)

    let stroke: Color = isActive
      ? hydrationColor
      : (isSubtract ? PhysiqTheme.cardBorder : hydrationColor)

    let labelColor: Color = isActive
      ? PhysiqTheme.background
      : (isSubtract ? PhysiqTheme.textSecondary : hydrationColor)

    let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

    return ZStack {
      shape.fill(fill)
      shape.stroke(stroke, lineWidth: 1)
      configuration.label
        .font(.system(size: 12, weight: .bold))
        .foregroundStyle(labelColor)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .contentShape(shape)
    .opacity(isDisabled ? 0.4 : 1)
    .scaleEffect(reduceMotion ? 1 : (isActive ? pressedScale : 1))
  }
}
