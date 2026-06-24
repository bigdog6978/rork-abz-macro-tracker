import SwiftUI

/// Dictation flow: capture a spoken meal with watchOS system input and send the
/// transcript to iPhone for food lookup. watchOS has no on-device
/// `SFSpeechRecognizer`; the system input UI handles dictation/scribble and hands
/// us the recognized text as a plain string. On watchOS 9+ this upgrades to
/// `TextFieldLink`; on watchOS 8 it falls back to a native `TextField`.
struct VoiceMealSheet: View {
  @EnvironmentObject private var connectivity: WatchConnectivityManager
  @Environment(\.dismiss) private var dismiss

  @State private var transcript = ""
  @State private var phase: Phase = .ready
  @State private var localMessage = ""

  private enum Phase {
    case ready
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
          .font(.system(size: 13, weight: .heavy))
          .foregroundStyle(PhysiqTheme.textPrimary)
        Spacer(minLength: 0)
      }

      Text(statusText)
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(PhysiqTheme.textSecondary)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)

      if !transcript.isEmpty {
        Text(transcript)
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(PhysiqTheme.textPrimary)
          .multilineTextAlignment(.center)
          .lineLimit(4)
          .padding(8)
          .frame(maxWidth: .infinity)
          .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(PhysiqTheme.card))
      }

      if phase == .ready {
        if #available(watchOS 9.0, *) {
          TextFieldLink(prompt: Text("Say what you ate")) {
            Label("Start speaking", systemImage: "mic.fill")
              .font(.system(size: 12, weight: .bold))
              .frame(maxWidth: .infinity)
              .padding(.vertical, 10)
          } onSubmit: { spoken in
            WatchInteractionFeedback.play(.confirm)
            transcript = spoken
            submitTranscript()
          }
          .buttonStyle(PhysiqPressableButtonStyle())
          .foregroundStyle(PhysiqTheme.background)
          .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.defaultAccent)
          )
        } else {
          legacyDictationInput
        }
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
        .font(.system(size: 12, weight: .bold))
        .buttonStyle(PhysiqPressableButtonStyle())
      }
    }
    .padding(10)
  }

  /// watchOS 8 fallback: a native TextField opens the system input UI
  /// (Dictation / Scribble / Emoji) and returns the recognized text as a string.
  private var legacyDictationInput: some View {
    VStack(spacing: 8) {
      TextField("Say what you ate", text: $transcript)
        .font(.system(size: 13, weight: .semibold))
        .submitLabel(.done)
        .onSubmit {
          WatchInteractionFeedback.play(.confirm)
          submitTranscript()
        }

      Button {
        WatchInteractionFeedback.play(.confirm)
        submitTranscript()
      } label: {
        Label("Send", systemImage: "paperplane.fill")
          .font(.system(size: 12, weight: .bold))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
      }
      .buttonStyle(PhysiqPressableButtonStyle())
      .foregroundStyle(PhysiqTheme.background)
      .background(
        RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.defaultAccent)
      )
      .disabled(transcript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }
  }

  private var statusText: String {
    switch phase {
    case .ready:
      return "Tap, then dictate what you ate, like \"2 eggs and 1 avocado\"."
    case .sending:
      return "Sending to iPhone…"
    case .done:
      return localMessage.isEmpty ? "Sent to iPhone." : localMessage
    case .error:
      return localMessage.isEmpty ? "Could not log meal." : localMessage
    }
  }

  private func submitTranscript() {
    let text = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else {
      phase = .error
      localMessage = "Nothing heard. Try again."
      return
    }

    phase = .sending
    connectivity.sendVoiceMeal(transcript: text) { result in
      switch result {
      case .processing:
        phase = .done
        localMessage = "Processing on iPhone…"
      case .queued:
        phase = .done
        localMessage = "Queued — open Physiq on iPhone."
      case .failed(let message):
        phase = .error
        localMessage = message
      }
    }
  }
}
