import Foundation
import SwiftUI
import WatchConnectivity

/// Watch-side WatchConnectivity: receives Pro snapshot from iPhone via `applicationContext`
/// and immediate `sendMessage` when reachable; sends quick actions back to the phone.
final class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = WatchConnectivityManager()

  @Published var context: [String: String] = [:]
  @Published var activationLabel: String = "…"
  @Published var phoneReachable: Bool = false
  /// Optimistic override until the next phone snapshot confirms the selection.
  @Published var pendingDayTypeOverride: String?
  @Published var dayTypeFeedback: String?

  func activate() {
    guard WCSession.isSupported() else {
      activationLabel = "Unsupported"
      return
    }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func resolvedDayTypeOverride(fallback: String = "auto") -> String {
    if let pending = pendingDayTypeOverride { return pending }
    let fromPhone = context["dayTypeOverride"] ?? fallback
    return fromPhone.isEmpty ? "auto" : fromPhone
  }

  func sendHydrationAck() {
    send(["action": "hydration_ack"])
  }

  func logWater(ml: Int) {
    send(["action": "log_water", "ml": String(ml)])
  }

  enum VoiceMealSendResult {
    case processing
    case queued
    case failed(String)
  }

  func sendVoiceMeal(transcript: String, completion: @escaping (VoiceMealSendResult) -> Void) {
    let message: [String: String] = [
      "action": "voice_meal",
      "transcript": transcript,
    ]
    sendWithReply(message) { reply in
      let status = reply["status"] as? String ?? "processing"
      completion(status == "processing" ? .processing : .processing)
    } onQueued: {
      completion(.queued)
    } onFailed: { message in
      completion(.failed(message))
    }
  }

  enum DayTypeSendResult {
    case ok
    case queued
    case failed(String)
  }

  /// Override today's day type (auto / training / competition / rest).
  func setDayType(_ dayType: String, completion: ((DayTypeSendResult) -> Void)? = nil) {
    pendingDayTypeOverride = dayType
    dayTypeFeedback = nil
    let message: [String: String] = [
      "action": "set_day_type",
      "dayType": dayType,
    ]
    sendWithReply(message, onReply: { reply in
      if let confirmed = reply["dayTypeOverride"] as? String, confirmed == dayType {
        self.pendingDayTypeOverride = nil
      }
      completion?(.ok)
    }, onQueued: {
      self.dayTypeFeedback = "Queued — open Physiq on iPhone"
      completion?(.queued)
    }, onFailed: { err in
      self.pendingDayTypeOverride = nil
      self.dayTypeFeedback = err
      completion?(.failed(err))
    })
  }

  private func send(_ message: [String: String]) {
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

  private func sendWithReply(
    _ message: [String: String],
    onReply: @escaping ([String: Any]) -> Void,
    onQueued: @escaping () -> Void,
    onFailed: @escaping (String) -> Void
  ) {
    if WCSession.default.isReachable {
      WCSession.default.sendMessage(
        message,
        replyHandler: { reply in
          DispatchQueue.main.async { onReply(reply) }
        },
        errorHandler: { _ in
          do {
            try WCSession.default.updateApplicationContext(message)
            DispatchQueue.main.async { onQueued() }
          } catch {
            DispatchQueue.main.async { onFailed("Could not reach iPhone.") }
          }
        }
      )
    } else {
      do {
        try WCSession.default.updateApplicationContext(message)
        DispatchQueue.main.async { onQueued() }
      } catch {
        DispatchQueue.main.async { onFailed("Could not reach iPhone.") }
      }
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
      if let pending = self.pendingDayTypeOverride,
         let confirmed = strings["dayTypeOverride"],
         confirmed == pending {
        self.pendingDayTypeOverride = nil
        self.dayTypeFeedback = nil
      }
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
