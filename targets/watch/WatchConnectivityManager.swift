import Foundation
import SwiftUI
import WatchConnectivity

/// Watch-side WatchConnectivity: receives Pro snapshot from iPhone via `applicationContext`
/// and sends quick actions (e.g. hydration ack) back with `sendMessage` when reachable.
final class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = WatchConnectivityManager()

  @Published var context: [String: String] = [:]
  @Published var activationLabel: String = "…"
  @Published var phoneReachable: Bool = false

  func activate() {
    guard WCSession.isSupported() else {
      activationLabel = "Unsupported"
      return
    }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func sendHydrationAck() {
    let message = ["action": "hydration_ack"]
    if WCSession.default.isReachable {
      WCSession.default.sendMessage(
        message,
        replyHandler: { _ in },
        errorHandler: { _ in
          try? WCSession.default.updateApplicationContext(message)
        }
      )
    } else {
      try? WCSession.default.updateApplicationContext(message)
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    DispatchQueue.main.async {
      switch activationState {
      case .activated:
        self.activationLabel = "Ready"
      case .inactive:
        self.activationLabel = "Inactive"
      case .notActivated:
        self.activationLabel = "Off"
      @unknown default:
        self.activationLabel = "Unknown"
      }
    }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async {
      self.phoneReachable = session.isReachable
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    let strings = applicationContext.compactMapValues { $0 as? String }
    DispatchQueue.main.async {
      self.context = strings
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    // Reserved for future phone → watch messages
    _ = message
  }
}
