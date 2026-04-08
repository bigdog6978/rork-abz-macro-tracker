import Foundation
import SwiftUI
import WatchConnectivity

/// Watch-side WatchConnectivity: receives Pro snapshot from iPhone via `applicationContext`
/// and immediate `sendMessage` when reachable; sends quick actions (e.g. hydration ack) back.
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

  private func mergeSnapshot(_ raw: [String: Any]) {
    var strings: [String: String] = [:]
    for (k, v) in raw {
      if let s = v as? String {
        strings[k] = s
      } else {
        strings[k] = "\(v)"
      }
    }
    DispatchQueue.main.async {
      self.context.merge(strings) { _, new in new }
      #if DEBUG
      print("[PhysiqWatch] context merged keys: \(strings.keys.sorted().joined(separator: ", "))")
      #endif
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
      #if DEBUG
      if let error {
        print("[PhysiqWatch] activation error: \(error.localizedDescription)")
      }
      #endif
    }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async {
      self.phoneReachable = session.isReachable
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    #if DEBUG
    print("[PhysiqWatch] didReceiveApplicationContext")
    #endif
    mergeSnapshot(applicationContext)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    #if DEBUG
    print("[PhysiqWatch] didReceiveMessage")
    #endif
    mergeSnapshot(message)
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    mergeSnapshot(message)
    replyHandler(["ok": true])
  }
}
