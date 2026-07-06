import SwiftUI
import WidgetKit

/// Physiq watch complications (WidgetKit accessory widgets, watchOS 9+).
/// Data: latest phone snapshot via the shared App Group
/// (`ComplicationEntry.swift`); the watch app reloads timelines whenever a
/// fresh snapshot arrives, and the phone pushes
/// `transferCurrentComplicationUserInfo` when complications are active.
@main
struct PhysiqComplicationBundle: WidgetBundle {
  var body: some Widget {
    CaloriesLeftComplication()
    ProteinComplication()
    HydrationComplication()
    DailySummaryComplication()
  }
}

// MARK: - Shared bits

private let mlPerOz = 29.5735
private let mlPerCup = 236.588

private func formatInt(_ value: Double) -> String {
  let formatter = NumberFormatter()
  formatter.numberStyle = .decimal
  formatter.maximumFractionDigits = 0
  return formatter.string(from: NSNumber(value: value)) ?? String(Int(value))
}

private func hydrationRemainingLabel(_ snapshot: ComplicationSnapshot) -> String {
  let remainingMl = max(snapshot.hydrationTargetMl - snapshot.hydrationConsumedMl, 0)
  switch snapshot.hydrationUnit {
  case "oz":
    return "\(Int((remainingMl / mlPerOz).rounded())) oz"
  case "cup":
    let cups = (remainingMl / mlPerCup * 10).rounded() / 10
    let text = cups.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(cups)) : String(format: "%.1f", cups)
    return "\(text) cup"
  default:
    return "\(Int(remainingMl.rounded())) mL"
  }
}

private extension View {
  /// watchOS 10 requires a container background on widgets; accessory
  /// complications want it clear.
  @ViewBuilder func complicationBackground() -> some View {
    if #available(watchOS 10.0, *) {
      containerBackground(for: .widget) { Color.clear }
    } else {
      self
    }
  }
}

/// Circular gauge shared by the three ring complications.
private struct RingGaugeAccessory: View {
  let progress: Double
  let systemImage: String
  let centerText: String
  let bottomLabel: String

  var body: some View {
    Gauge(value: progress) {
      Image(systemName: systemImage)
    } currentValueLabel: {
      Text(centerText)
        .font(.system(size: 13, weight: .bold))
        .minimumScaleFactor(0.6)
        .lineLimit(1)
    } minimumValueLabel: {
      Text("")
    } maximumValueLabel: {
      Text(bottomLabel)
        .font(.system(size: 7, weight: .semibold))
    }
    .gaugeStyle(.accessoryCircular)
    .widgetAccentable()
  }
}

private struct NoDataView: View {
  var body: some View {
    Text("--")
      .font(.system(size: 14, weight: .bold))
      .widgetAccentable()
  }
}

// MARK: - Calories left

struct CaloriesLeftComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "PhysiqCaloriesLeft", provider: ComplicationProvider()) { entry in
      CaloriesLeftView(entry: entry).complicationBackground()
    }
    .configurationDisplayName("Calories Left")
    .description("Calories remaining toward today's target.")
    .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline])
  }
}

private struct CaloriesLeftView: View {
  @Environment(\.widgetFamily) private var family
  let entry: ComplicationTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot, snapshot.hasData {
      switch family {
      case .accessoryInline:
        Text("\u{1F525} \(formatInt(snapshot.caloriesRemaining)) cal left")
      case .accessoryCorner:
        Text(formatInt(snapshot.caloriesRemaining))
          .font(.system(size: 18, weight: .bold))
          .widgetAccentable()
          .widgetLabel {
            Gauge(value: snapshot.progress(consumed: snapshot.caloriesConsumed, target: snapshot.caloriesTarget)) {
              Text("cal left")
            }
            .gaugeStyle(.accessoryLinear)
          }
      default:
        RingGaugeAccessory(
          progress: snapshot.progress(consumed: snapshot.caloriesConsumed, target: snapshot.caloriesTarget),
          systemImage: "flame.fill",
          centerText: formatInt(snapshot.caloriesRemaining),
          bottomLabel: "cal"
        )
      }
    } else {
      NoDataView()
    }
  }
}

// MARK: - Protein

struct ProteinComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "PhysiqProtein", provider: ComplicationProvider()) { entry in
      ProteinView(entry: entry).complicationBackground()
    }
    .configurationDisplayName("Protein")
    .description("Protein progress toward today's target.")
    .supportedFamilies([.accessoryCircular, .accessoryInline])
  }
}

private struct ProteinView: View {
  @Environment(\.widgetFamily) private var family
  let entry: ComplicationTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot, snapshot.hasData {
      if family == .accessoryInline {
        Text("P \(formatInt(snapshot.proteinConsumed))/\(formatInt(snapshot.proteinTarget))g")
      } else {
        RingGaugeAccessory(
          progress: snapshot.progress(consumed: snapshot.proteinConsumed, target: snapshot.proteinTarget),
          systemImage: "fork.knife",
          centerText: formatInt(max(snapshot.proteinTarget - snapshot.proteinConsumed, 0)),
          bottomLabel: "g left"
        )
      }
    } else {
      NoDataView()
    }
  }
}

// MARK: - Hydration

struct HydrationComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "PhysiqHydration", provider: ComplicationProvider()) { entry in
      HydrationView(entry: entry).complicationBackground()
    }
    .configurationDisplayName("Hydration")
    .description("Hydration progress in your preferred unit.")
    .supportedFamilies([.accessoryCircular, .accessoryInline])
  }
}

private struct HydrationView: View {
  @Environment(\.widgetFamily) private var family
  let entry: ComplicationTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot, snapshot.hasData, snapshot.hydrationTargetMl > 0 {
      if family == .accessoryInline {
        Text("\u{1F4A7} \(hydrationRemainingLabel(snapshot)) left")
      } else {
        RingGaugeAccessory(
          progress: snapshot.progress(consumed: snapshot.hydrationConsumedMl, target: snapshot.hydrationTargetMl),
          systemImage: "drop.fill",
          centerText: hydrationRemainingLabel(snapshot),
          bottomLabel: "left"
        )
      }
    } else {
      NoDataView()
    }
  }
}

// MARK: - Daily summary (rectangular)

struct DailySummaryComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "PhysiqDailySummary", provider: ComplicationProvider()) { entry in
      DailySummaryView(entry: entry).complicationBackground()
    }
    .configurationDisplayName("Daily Summary")
    .description("Calories left and macro progress at a glance.")
    .supportedFamilies([.accessoryRectangular])
  }
}

private struct DailySummaryView: View {
  let entry: ComplicationTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot, snapshot.hasData {
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 4) {
          Image(systemName: "flame.fill")
            .font(.system(size: 11, weight: .bold))
          Text("\(formatInt(snapshot.caloriesRemaining)) cal left")
            .font(.system(size: 14, weight: .bold))
            .lineLimit(1)
        }
        .widgetAccentable()
        macroLine("P", snapshot.proteinConsumed, snapshot.proteinTarget)
        HStack(spacing: 8) {
          macroLine("C", snapshot.carbsConsumed, snapshot.carbsTarget)
          macroLine("F", snapshot.fatConsumed, snapshot.fatTarget)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    } else {
      Text("Open Physiq on iPhone to sync")
        .font(.system(size: 12, weight: .semibold))
        .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  private func macroLine(_ label: String, _ consumed: Double, _ target: Double) -> some View {
    HStack(spacing: 3) {
      Text(label)
        .font(.system(size: 11, weight: .heavy))
        .foregroundStyle(.secondary)
      Text("\(formatInt(consumed))/\(formatInt(target))g")
        .font(.system(size: 11, weight: .semibold))
        .lineLimit(1)
    }
  }
}
