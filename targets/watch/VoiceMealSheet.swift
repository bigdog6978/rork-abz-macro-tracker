import SwiftUI

/// Full-screen dictation flow: listen on-watch, send transcript to iPhone for food lookup.
struct VoiceMealSheet: View {
  @EnvironmentObject private var connectivity: WatchConnectivityManager
  @Environment(\.dismiss) private var dismiss

  @StateObject private var recorder = WatchVoiceMealRecorder()
  @State private var phase: Phase = .ready
  @State private var localMessage = ""

  private enum Phase {
    case ready
    case listening
    case sending
    case done
    case error
  }

  var body: some View {
    VStack(spacing: 10) {
      HStack(spacing: 6) {
        Image(systemName: "mic.fill")
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(PhysiqTheme.defaultAccent)
        Text("Speak meal")
          .font(.system(size: 13, weight: .heavy, design: .rounded))
          .foregroundStyle(PhysiqTheme.textPrimary)
        Spacer(minLength: 0)
      }

      Text(statusText)
        .font(.system(size: 11, weight: .medium, design: .rounded))
        .foregroundStyle(PhysiqTheme.textSecondary)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)

      if !recorder.transcript.isEmpty {
        Text(recorder.transcript)
          .font(.system(size: 12, weight: .semibold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textPrimary)
          .multilineTextAlignment(.center)
          .lineLimit(4)
          .padding(8)
          .frame(maxWidth: .infinity)
          .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(PhysiqTheme.card))
      }

      if phase == .ready || phase == .listening {
        Button {
          WatchInteractionFeedback.play(phase == .listening ? .confirm : .tap)
          toggleListening()
        } label: {
          Label(
            phase == .listening ? "Done speaking" : "Start speaking",
            systemImage: phase == .listening ? "stop.fill" : "mic.fill"
          )
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
        }
        .buttonStyle(PhysiqPressableButtonStyle())
        .foregroundStyle(PhysiqTheme.background)
        .background(
          RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.defaultAccent)
        )
      }

      if phase == .sending {
        ProgressView()
          .tint(PhysiqTheme.defaultAccent)
      }

      if phase == .done || phase == .error {
        Button("Close") {
          WatchInteractionFeedback.play(.tap)
          dismiss()
        }
        .font(.system(size: 12, weight: .bold, design: .rounded))
        .buttonStyle(PhysiqPressableButtonStyle())
      }
    }
    .padding(10)
    .onDisappear {
      recorder.stopListening()
    }
  }

  private var statusText: String {
    switch phase {
    case .ready:
      return "Say what you ate, like \"2 eggs and 1 avocado\"."
    case .listening:
      return "Listening… tap Done when finished."
    case .sending:
      return "Sending to iPhone…"
    case .done:
      return localMessage.isEmpty ? "Sent to iPhone." : localMessage
    case .error:
      return localMessage.isEmpty ? "Could not log meal." : localMessage
    }
  }

  private func toggleListening() {
    if phase == .listening {
      recorder.stopListening()
      submitTranscript()
      return
    }

    Task {
      let granted = await recorder.requestPermissions()
      guard granted else {
        phase = .error
        localMessage = recorder.errorMessage ?? "Permission denied."
        return
      }
      phase = .listening
      recorder.startListening()
    }
  }

  private func submitTranscript() {
    let text = recorder.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else {
      phase = .error
      localMessage = "Nothing heard. Try again."
      return
    }

    phase = .sending
    connectivity.sendVoiceMeal(transcript: text) { result in
      switch result {
      case .processing, .queued:
        phase = .done
        localMessage = result == .queued
          ? "Queued — open Physiq on iPhone."
          : "Processing on iPhone…"
      case .failed(let message):
        phase = .error
        localMessage = message
      }
    }
  }
}
