import SwiftUI

/// Single source of truth for watch spacing and component sizing.
///
/// Philosophy: the `TabView` page already lays content inside the system safe
/// area (below the upper-right clock, above the page-indicator dots), so we do
/// **not** re-reserve large chrome blocks. Sizes scale **up** from the real
/// available space and fill the watch face, capping generously on 45/49mm.
struct WatchLayoutMetrics: Equatable {
  /// Full available page size (already excludes system chrome).
  let size: CGSize
  /// Bezel clearance on each side.
  let horizontal: CGFloat
  /// Small cosmetic top inset so the title row clears the curved top corner.
  let topInset: CGFloat
  /// Small bottom inset so the last control clears the page-indicator dots.
  let bottomInset: CGFloat

  /// Used by previews when a GeometryReader is unavailable.
  static let fallback = WatchLayoutMetrics(
    size: CGSize(width: 184, height: 224),
    horizontal: 6,
    topInset: 2,
    bottomInset: 8
  )

  static func from(_ geo: GeometryProxy) -> WatchLayoutMetrics {
    WatchLayoutMetrics(
      size: geo.size,
      horizontal: 6,
      topInset: 2,
      bottomInset: 8
    )
  }

  var contentWidth: CGFloat { max(0, size.width - horizontal * 2) }
  var contentHeight: CGFloat { max(0, size.height - topInset - bottomInset) }

  var pageSpacing: CGFloat { contentHeight < 200 ? 8 : 10 }

  /// Show the calorie streak row only when there is comfortable vertical space.
  var showsStreakRow: Bool { contentHeight >= 200 }

  /// Space the hero pages need around the ring (title row + stat/quick-add row
  /// + inter-item spacing + a small safety margin), so non-scroll pages
  /// (Calories / Hydration) fill the screen without ever clipping.
  private var heroReserve: CGFloat {
    let base = 22 + 54 + (pageSpacing * 2) + 4
    return showsStreakRow ? base + 16 + pageSpacing : base
  }

  /// Hero ring (Calories / Hydration): width-driven and generous, but bounded by
  /// the leftover height so the page fills the face top-to-bottom without clipping.
  var heroRingSize: CGFloat {
    let widthBased = contentWidth - 6
    let heightBased = contentHeight - heroReserve
    return max(94, min(widthBased, heightBased, 130))
  }

  var heroRingLineWidth: CGFloat { max(8, heroRingSize * 0.085) }

  var heroCalorieFontSize: CGFloat { min(34, heroRingSize * 0.28) }

  /// One of three macro mini-rings spanning the Macros page width.
  private var macroCellWidth: CGFloat { (contentWidth - 12) / 3 }
  var miniRingSize: CGFloat { min(58, max(46, macroCellWidth * 0.94)) }
  var miniRingLineWidth: CGFloat { max(4.5, miniRingSize * 0.1) }

  var minTouchHeight: CGFloat { 44 }
}
