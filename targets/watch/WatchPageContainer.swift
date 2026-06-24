import SwiftUI

/// Full-bleed TabView page — content fills geo; safe area in metrics (v6.3).
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
      .frame(width: geo.size.width, height: geo.size.height)
      .ignoresSafeArea(.container, edges: [.top, .bottom])
    }
  }
}
