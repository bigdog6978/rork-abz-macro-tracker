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
    guard let action = applicationContext["action"] as? String, !action.isEmpty else { return }
    emitPayload(applicationContext, source: "applicationContext")
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    emitPayload(message, source: "message")
    if let action = message["action"] as? String, action == "voice_meal" {
      replyHandler(["status": "processing"])
    } else {
      replyHandler(["ok": true])
    }
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
