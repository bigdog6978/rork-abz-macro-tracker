import SwiftUI

/// Full-bleed TabView page wrapper. Hero content may extend behind page-indicator dots;
/// the inline header respects the top safe band so icons/titles are not clipped.
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
              .frame(maxWidth: .infinity, alignment: .top)
          }
        } else {
          content(metrics)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
      }
      .padding(.horizontal, metrics.horizontal)
      .ignoresSafeArea(.container, edges: [.top, .bottom])
    }
  }
}
