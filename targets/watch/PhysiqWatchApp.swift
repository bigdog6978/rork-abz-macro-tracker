import SwiftUI

@main
struct PhysiqWatchApp: App {
  @StateObject private var connectivity = WatchConnectivityManager.shared

  init() {
    WatchConnectivityManager.shared.activate()
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(connectivity)
    }
  }
}
