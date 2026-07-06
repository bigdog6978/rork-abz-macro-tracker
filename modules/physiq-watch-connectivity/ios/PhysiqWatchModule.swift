import ExpoModulesCore
import WatchConnectivity

/// iPhone-side WatchConnectivity + JS events. HealthKit stays on iPhone (Option B).
public class PhysiqWatchModule: Module {
  private let sessionBridge = PhysiqPhoneWatchSession()

  public func definition() -> ModuleDefinition {
    Name("PhysiqWatch")

    Events("onWatchPayload", "onActivationChange")

    OnCreate {
      self.sessionBridge.bind(module: self)
    }

    Property("isWatchSupported") {
      WCSession.isSupported()
    }

    Property("activationState") {
      self.sessionBridge.activationStateLabel
    }

    AsyncFunction("sendProSnapshot") { (payload: [String: String]) in
      try await self.sessionBridge.updateApplicationContext(payload)
    }
  }
}

final class PhysiqPhoneWatchSession: NSObject, WCSessionDelegate {
  weak var module: PhysiqWatchModule?

  /// transferCurrentComplicationUserInfo has a ~50/day budget; throttle so
  /// frequent snapshot sends (every food log) can't exhaust it.
  private var lastComplicationPushAt: Date?
  private let complicationPushMinInterval: TimeInterval = 30 * 60

  var activationStateLabel: String {
    switch WCSession.default.activationState {
    case .activated: return "activated"
    case .inactive: return "inactive"
    case .notActivated: return "notActivated"
    @unknown default: return "unknown"
    }
  }

  func bind(module: PhysiqWatchModule) {
    self.module = module
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func updateApplicationContext(_ payload: [String: String]) async throws {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default

    var waited = 0
    while session.activationState != .activated && waited < 60 {
      try await Task.sleep(nanoseconds: 50_000_000)
      waited += 1
    }

    #if DEBUG
    print("[PhysiqWatch iPhone] activationState=\(activationStateLabel) keys=\(payload.keys.sorted())")
    #endif

    do {
      try session.updateApplicationContext(payload)
    } catch {
      #if DEBUG
      print("[PhysiqWatch iPhone] updateApplicationContext error: \(error.localizedDescription)")
      #endif
      throw error
    }

    if session.isReachable {
      session.sendMessage(
        payload,
        replyHandler: { _ in
          #if DEBUG
          print("[PhysiqWatch iPhone] sendMessage delivered")
          #endif
        },
        errorHandler: { err in
          #if DEBUG
          print("[PhysiqWatch iPhone] sendMessage error: \(String(describing: err))")
          #endif
        }
      )
    }

    pushComplicationUpdateIfNeeded(session: session, payload: payload)
  }

  /// Wakes the watch to refresh complications even when the watch app is
  /// closed. Guarded by the enabled check and a 30-minute throttle so the
  /// system budget (~50/day) is never exhausted; never throws to JS.
  private func pushComplicationUpdateIfNeeded(session: WCSession, payload: [String: String]) {
    guard session.isComplicationEnabled else { return }
    if let last = lastComplicationPushAt,
       Date().timeIntervalSince(last) < complicationPushMinInterval {
      return
    }
    guard session.remainingComplicationUserInfoTransfers > 0 else {
      #if DEBUG
      print("[PhysiqWatch iPhone] complication transfer budget exhausted")
      #endif
      return
    }
    lastComplicationPushAt = Date()
    session.transferCurrentComplicationUserInfo(payload)
    #if DEBUG
    print("[PhysiqWatch iPhone] transferCurrentComplicationUserInfo sent (remaining=\(session.remainingComplicationUserInfoTransfers))")
    #endif
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    #if DEBUG
    print("[PhysiqWatch iPhone] activationDidComplete state=\(activationState.rawValue) err=\(error?.localizedDescription ?? "nil")")
    #endif
    module?.sendEvent("onActivationChange", [
      "state": activationStateLabel,
      "error": error?.localizedDescription as Any,
    ])
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    emitPayload(message, source: "message")
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    // Legacy path: watch builds ≤1.3.4 queued actions via applicationContext.
    // Current builds queue via transferUserInfo (see didReceiveUserInfo).
    guard let action = applicationContext["action"] as? String, !action.isEmpty else { return }
    emitPayload(applicationContext, source: "applicationContext")
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    // Queued watch → phone actions: each transferUserInfo arrives separately
    // and in order, so multiple offline hydration logs are all delivered.
    guard let action = userInfo["action"] as? String, !action.isEmpty else { return }
    emitPayload(userInfo, source: "userInfo")
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    emitPayload(message, source: "message")
    if let action = message["action"] as? String {
      if action == "voice_meal" {
        replyHandler(["status": "processing"])
        return
      }
      if action == "set_day_type", let dayType = message["dayType"] as? String {
        replyHandler(["status": "ok", "dayTypeOverride": dayType])
        return
      }
    }
    replyHandler(["ok": true])
  }

  private func emitPayload(_ raw: [String: Any], source: String) {
    var strings: [String: String] = [:]
    for (k, v) in raw {
      strings[k] = "\(v)"
    }
    module?.sendEvent("onWatchPayload", [
      "payload": strings,
      "source": source,
    ])
  }
}
