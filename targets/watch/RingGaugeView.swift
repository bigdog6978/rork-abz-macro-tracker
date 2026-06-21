import SwiftUI

// MARK: - Shared geometry (mirrors `CalorieGauge.tsx` / `MacroRing.tsx`)

private struct InstrumentDialGeometry {
  let size: CGFloat
  let lineWidth: CGFloat

  var center: CGPoint { CGPoint(x: size / 2, y: size / 2) }
  var radius: CGFloat { size / 2 - lineWidth / 2 }

  func arcPath(startDeg: Double, endDeg: Double) -> Path {
    Path { path in
      path.addArc(
        center: center,
        radius: radius,
        startAngle: .degrees(startDeg),
        endAngle: .degrees(endDeg),
        clockwise: false
      )
    }
  }

  func bottomDashSegments(dashCount: Int) -> [(start: Double, end: Double)] {
    let totalDeg = 180.0
    let gapRatio = 0.44
    let dashRatio = 0.56
    let gapSpan =
      totalDeg / ((Double(dashCount) + 1) + Double(dashCount) * (dashRatio / gapRatio))
    let dashSpan = gapSpan * (dashRatio / gapRatio)
    return (0..<dashCount).map { index in
      let startDeg = gapSpan + Double(index) * (dashSpan + gapSpan)
      return (startDeg, startDeg + dashSpan)
    }
  }

  func stroke(_ path: Path, color: Color) -> some View {
    path.stroke(
      color,
      style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt, lineJoin: .miter)
    )
  }
}

// MARK: - Calorie dial (phone `CalorieGauge`)

/// Solid top semicircle + segmented bottom ticks — matches phone calorie hero dial.
struct CalorieInstrumentDial: View {
  var progress: CGFloat
  var color: Color
  var lineWidth: CGFloat
  var size: CGFloat

  private let dashCount = 28

  var body: some View {
    let geom = InstrumentDialGeometry(size: size, lineWidth: lineWidth)
    let clamped = min(max(progress, 0), 1)
    let dashes = geom.bottomDashSegments(dashCount: dashCount)

    ZStack {
      geom.stroke(geom.arcPath(startDeg: 180, endDeg: 360), color: color)

      ForEach(Array(dashes.enumerated()), id: \.offset) { _, segment in
        geom.stroke(geom.arcPath(startDeg: segment.start, endDeg: segment.end), color: PhysiqTheme.track)
      }

      let progressEnd = 180 + 180 * Double(clamped)
      if progressEnd > 180 {
        geom.stroke(geom.arcPath(startDeg: 180, endDeg: progressEnd), color: color)
      }

      ForEach(Array(dashes.enumerated()), id: \.offset) { index, segment in
        let threshold = CGFloat(index + 1) / CGFloat(dashCount)
        if clamped >= threshold {
          geom.stroke(geom.arcPath(startDeg: segment.start, endDeg: segment.end), color: color)
        }
      }
    }
    .frame(width: size, height: size)
    .accessibilityLabel(Text("Progress \(Int(clamped * 100)) percent"))
  }
}

// MARK: - Macro dial (phone `MacroRing` / `MacroDial`)

/// Locked top semicircle + bottom ticks that fill with progress — matches phone macro dials.
struct MacroInstrumentDial: View {
  var progress: CGFloat
  var color: Color
  var lineWidth: CGFloat
  var size: CGFloat

  private let dashCount = 20

  var body: some View {
    let geom = InstrumentDialGeometry(size: size, lineWidth: lineWidth)
    let clamped = min(max(progress, 0), 1)
    let dashes = geom.bottomDashSegments(dashCount: dashCount)

    ZStack {
      geom.stroke(geom.arcPath(startDeg: 180, endDeg: 360), color: color)

      ForEach(Array(dashes.enumerated()), id: \.offset) { _, segment in
        geom.stroke(geom.arcPath(startDeg: segment.start, endDeg: segment.end), color: PhysiqTheme.track)
      }

      ForEach(Array(dashes.enumerated()), id: \.offset) { index, segment in
        let threshold = CGFloat(index + 1) / CGFloat(dashCount)
        if clamped >= threshold {
          geom.stroke(geom.arcPath(startDeg: segment.start, endDeg: segment.end), color: color)
        }
      }
    }
    .frame(width: size, height: size)
    .accessibilityLabel(Text("Progress \(Int(clamped * 100)) percent"))
  }
}

/// Legacy alias — calorie-style instrument dial.
struct RingGaugeView: View {
  var progress: CGFloat
  var color: Color
  var lineWidth: CGFloat
  var size: CGFloat

  var body: some View {
    CalorieInstrumentDial(
      progress: progress,
      color: color,
      lineWidth: lineWidth,
      size: size
    )
  }
}
