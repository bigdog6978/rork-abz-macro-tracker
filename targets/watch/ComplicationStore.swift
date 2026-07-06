import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

/// Writes the latest phone snapshot into the shared App Group so the
/// watch-widget extension (complications) can render it, then asks WidgetKit
/// to refresh timelines.
///
/// The raw `[String: String]` WatchConnectivity context is stored as-is —
/// the widget parses the same keys as `WatchSnapshot.parse`, so there is no
/// second schema to migrate. Reader lives in
/// `targets/watch-widget/ComplicationEntry.swift` (keys must stay in sync).
enum ComplicationStore {
  static let appGroupId = "group.app.rork.abz-macro-tracker"
  static let snapshotKey = "physiq_complication_snapshot_v1"

  static func write(context: [String: String]) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      #if DEBUG
      print("[PhysiqWatch] ComplicationStore: app group unavailable")
      #endif
      return
    }
    defaults.set(context, forKey: snapshotKey)
    if #available(watchOS 9.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
