import SwiftUI

/// Edge-to-edge watch face geometry (v6.5). All safe areas ignored, so geo == full physical face. VStack shell; footer bar at true bottom, page dots overlay.
struct WatchLayoutMetrics: Equatable {
  let size: CGSize
  let safeAreaInsets: EdgeInsets

  static let headerRowHeight: CGFloat = 22
  /// Upper-right — keep macro/hero ticks out of system clock.
  static let clockExclusionWidth: CGFloat = 48
  static let bottomBarHeight: CGFloat = 44
  static let caloriesBottomBarHeight: CGFloat = 36
  static let macroLabelHeight: CGFloat = 10
  static let macroRowGap: CGFloat = 2
  static let todayTileGap: CGFloat = 4

  static let fallback = WatchLayoutMetrics(
    size: CGSize(width: 184, height: 224),
    safeAreaInsets: EdgeInsets()
  )

  static func from(_ geo: GeometryProxy) -> WatchLayoutMetrics {
    let metrics = WatchLayoutMetrics(size: geo.size, safeAreaInsets: geo.safeAreaInsets)
    #if DEBUG
    print(
      "[WatchLayout] geo=\(Int(geo.size.width))×\(Int(geo.size.height)) "
        + "safeT=\(Int(geo.safeAreaInsets.top)) safeB=\(Int(geo.safeAreaInsets.bottom)) "
        + "safeL=\(Int(geo.safeAreaInsets.leading)) safeR=\(Int(geo.safeAreaInsets.trailing)) "
        + "faceH=\(Int(metrics.faceHeight)) "
        + "bodyH=\(Int(metrics.bodyHeight(bottomBar: Self.bottomBarHeight))) "
        + "todayBodyH=\(Int(metrics.todayBodyHeight())) "
        + "todayTile=\(Int(metrics.todayTileSide()))"
    )
    #endif
    return metrics
  }

  var faceHeight: CGFloat { size.height }
  var faceWidth: CGFloat { size.width }

  var leadingInset: CGFloat {
    max(10, safeAreaInsets.leading + 4)
  }

  /// Flex body between the header and footer bar. All safe areas are ignored, so
  /// `faceHeight` is the full physical face; the footer bar sits at the true bottom
  /// and the TabView page dots simply overlay it (no dot-band reservation).
  func bodyHeight(bottomBar: CGFloat) -> CGFloat {
    max(0, faceHeight - Self.headerRowHeight - bottomBar)
  }

  func todayBodyHeight() -> CGFloat {
    max(0, faceHeight - Self.headerRowHeight)
  }

  func heroDialSize(bottomBar: CGFloat) -> CGFloat {
    let body = bodyHeight(bottomBar: bottomBar)
    return max(72, min(faceWidth - 4, body))
  }

  func macroDialSize(bottomBar: CGFloat = bottomBarHeight) -> CGFloat {
    let body = bodyHeight(bottomBar: bottomBar)
    // Rings are vertically centered below the clock, so they use the full width
    // (minus a small edge margin) rather than reserving the top-right clock column.
    let rowWidth = faceWidth - 12
    let cellWidth = (rowWidth - Self.macroRowGap * 2) / 3
    let heightBased = body - Self.macroLabelHeight - Self.macroRowGap
    return max(36, min(cellWidth, heightBased))
  }

  func heroRingLineWidth(for ringSize: CGFloat) -> CGFloat { max(7, ringSize * 0.088) }
  func heroCalorieFontSize(for ringSize: CGFloat) -> CGFloat { min(44, ringSize * 0.32) }
  func miniRingLineWidth(for ringSize: CGFloat) -> CGFloat { max(4, ringSize * 0.11) }

  func todayTileSide() -> CGFloat {
    let body = todayBodyHeight()
    let gap = Self.todayTileGap
    let byHeight = (body - gap) / 2
    let byWidth = (faceWidth - gap) / 2
    return max(40, min(byHeight, byWidth))
  }
}
