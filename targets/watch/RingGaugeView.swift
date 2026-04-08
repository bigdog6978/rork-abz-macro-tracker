import SwiftUI

/// Radial progress ring aligned with phone `CalorieGauge` / `MacroDial` (active arc + muted track).
struct RingGaugeView: View {
  var progress: CGFloat
  var color: Color
  var lineWidth: CGFloat
  var size: CGFloat

  var body: some View {
    ZStack {
      Circle()
        .stroke(PhysiqTheme.track, lineWidth: lineWidth)
      Circle()
        .trim(from: 0, to: progress)
        .stroke(
          color,
          style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
        )
        .rotationEffect(.degrees(-90))
    }
    .frame(width: size, height: size)
    .accessibilityLabel(Text("Progress \(Int(progress * 100)) percent"))
  }
}
