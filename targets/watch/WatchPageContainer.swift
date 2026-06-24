import SwiftUI

/// Full-bleed TabView page. Passes full geometry width; v5 layout uses non-overlapping vertical zones.
struct WatchPageContainer<Content: View>: View {
  let scrollable: Bool
  @ViewBuilder let content: (WatchLayoutMetrics) -> Content

  init(
    scrollable: Bool = false,
    @ViewBuilder content: @escaping (WatchLayoutMetrics) -> Content
  ) {
    self.scrollable = scrollable
    self.content = content
  }

  var body: some View {
    GeometryReader { geo in
      let metrics = WatchLayoutMetrics.from(geo)

      Group {
        if scrollable {
          ScrollView(.vertical, showsIndicators: false) {
            content(metrics)
          }
        } else {
          content(metrics)
        }
      }
      .frame(width: geo.size.width, height: metrics.layoutHeight, alignment: .top)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
      .ignoresSafeArea(.container, edges: [.top, .bottom])
    }
  }
}
