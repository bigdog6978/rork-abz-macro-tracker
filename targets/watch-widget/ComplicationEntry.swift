import Foundation
import WidgetKit

/// Snapshot read from the shared App Group. The watch app writes the raw
/// WatchConnectivity `[String: String]` context (see
/// `targets/watch/ComplicationStore.swift` — app group id and key MUST stay
/// in sync); this parses only the keys complications render.
struct ComplicationSnapshot {
  static let appGroupId = "group.app.rork.abz-macro-tracker"
  static let snapshotKey = "physiq_complication_snapshot_v1"

  var caloriesRemaining: Double
  var caloriesTarget: Double
  var caloriesConsumed: Double
  var proteinConsumed: Double
  var proteinTarget: Double
  var carbsConsumed: Double
  var carbsTarget: Double
  var fatConsumed: Double
  var fatTarget: Double
  var hydrationConsumedMl: Double
  var hydrationTargetMl: Double
  /// "ml" | "oz" | "cup"
  var hydrationUnit: String
  var updatedAt: Date?

  var hasData: Bool {
    caloriesTarget > 0 || caloriesConsumed > 0 || proteinTarget > 0
  }

  static func load() -> ComplicationSnapshot? {
    guard
      let defaults = UserDefaults(suiteName: appGroupId),
      let context = defaults.dictionary(forKey: snapshotKey) as? [String: String]
    else { return nil }
    return parse(context)
  }

  static func parse(_ context: [String: String]) -> ComplicationSnapshot {
    func d(_ k: String) -> Double { Double(context[k] ?? "") ?? 0 }

    let target = d("caloriesTarget")
    let consumed = d("caloriesConsumed")
    let remaining = d("caloriesRemaining") > 0
      ? d("caloriesRemaining")
      : max(target - consumed, 0)

    return ComplicationSnapshot(
      caloriesRemaining: remaining,
      caloriesTarget: target,
      caloriesConsumed: consumed,
      proteinConsumed: d("proteinConsumed"),
      proteinTarget: d("proteinTarget"),
      carbsConsumed: d("carbsConsumed"),
      carbsTarget: d("carbsTarget"),
      fatConsumed: d("fatConsumed"),
      fatTarget: d("fatTarget"),
      hydrationConsumedMl: d("hydrationConsumedMl"),
      hydrationTargetMl: d("hydrationTargetMl"),
      hydrationUnit: context["hydrationUnit"] ?? "ml",
      updatedAt: parseISO8601(context["updatedAt"])
    )
  }

  static func parseISO8601(_ value: String?) -> Date? {
    guard let value else { return nil }
    let withFraction = ISO8601DateFormatter()
    withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = withFraction.date(from: value) { return date }
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    return plain.date(from: value)
  }

  func progress(consumed: Double, target: Double) -> Double {
    guard target > 0 else { return 0 }
    return min(max(consumed / target, 0), 1)
  }

  var placeholderPreview: ComplicationSnapshot { Self.preview }

  static let preview = ComplicationSnapshot(
    caloriesRemaining: 1240,
    caloriesTarget: 2600,
    caloriesConsumed: 1360,
    proteinConsumed: 92,
    proteinTarget: 165,
    carbsConsumed: 180,
    carbsTarget: 260,
    fatConsumed: 41,
    fatTarget: 72,
    hydrationConsumedMl: 1300,
    hydrationTargetMl: 2400,
    hydrationUnit: "ml",
    updatedAt: Date()
  )
}

/// Single timeline entry — complications show the latest snapshot and ask
/// WidgetKit to revisit periodically; the watch app also force-reloads
/// timelines whenever a fresh snapshot arrives.
struct ComplicationTimelineEntry: TimelineEntry {
  let date: Date
  let snapshot: ComplicationSnapshot?
}

struct ComplicationProvider: TimelineProvider {
  func placeholder(in context: Context) -> ComplicationTimelineEntry {
    ComplicationTimelineEntry(date: Date(), snapshot: .preview)
  }

  func getSnapshot(in context: Context, completion: @escaping (ComplicationTimelineEntry) -> Void) {
    let snapshot = context.isPreview ? ComplicationSnapshot.preview : ComplicationSnapshot.load()
    completion(ComplicationTimelineEntry(date: Date(), snapshot: snapshot))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ComplicationTimelineEntry>) -> Void) {
    let entry = ComplicationTimelineEntry(date: Date(), snapshot: ComplicationSnapshot.load())
    let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }
}
