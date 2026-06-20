import SwiftUI
import WatchKit

enum WatchFeedbackIntent {
  case tap
  case select
  case confirm
  case success
  case warning
  case destructive
}

enum WatchInteractionFeedback {
  static func play(_ intent: WatchFeedbackIntent) {
    let device = WKInterfaceDevice.current()
    switch intent {
    case .tap, .select, .confirm:
      device.play(.click)
    case .success:
      device.play(.success)
    case .warning:
      device.play(.retry)
    case .destructive:
      device.play(.failure)
    }
  }
}
