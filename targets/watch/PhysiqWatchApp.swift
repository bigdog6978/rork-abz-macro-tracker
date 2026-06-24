import SwiftUI

@main
struct PhysiqWatchApp: App {
  @StateObject private var connectivity = WatchConnectivityManager.shared

  init() {
    WatchConnectivityManager.shared.activate()
    #if DEBUG
    if WatchDebugHarness.isMockEnabled {
      WatchConnectivityManager.shared.context = WatchDebugHarness.mockContext
    }
    #endif
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(connectivity)
    }
  }
}
