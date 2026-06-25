import SwiftUI

/// Shared send helper for watch → iPhone voice meal dictation.
enum VoiceMealSubmit {
  static func send(
    connectivity: WatchConnectivityManager,
    transcript raw: String,
    isSending: Binding<Bool>,
    statusMessage: Binding<String>
  ) {
    guard !isSending.wrappedValue else { return }

    let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else {
      statusMessage.wrappedValue = "Nothing heard. Try again."
      WatchInteractionFeedback.play(.warning)
      return
    }

    isSending.wrappedValue = true
    statusMessage.wrappedValue = "Sending…"
    connectivity.sendVoiceMeal(transcript: text) { result in
      DispatchQueue.main.async {
        isSending.wrappedValue = false
        switch result {
        case .processing:
          statusMessage.wrappedValue = "Processing on iPhone…"
          WatchInteractionFeedback.play(.success)
        case .queued:
          statusMessage.wrappedValue = "Queued — open Physiq on iPhone."
          WatchInteractionFeedback.play(.warning)
        case .failed(let message):
          statusMessage.wrappedValue = message
          WatchInteractionFeedback.play(.warning)
        }
      }
    }
  }
}

/// Footer mic bar — one tap opens system dictation on watchOS 9+ (no intermediate sheet).
struct VoiceMealMicBar: View {
  @EnvironmentObject private var connectivity: WatchConnectivityManager
  let metrics: WatchLayoutMetrics
  let accent: Color
  @Binding var statusMessage: String
  @Binding var isSending: Bool
  let onLegacyTap: () -> Void

  var body: some View {
    if #available(watchOS 9.0, *) {
      directDictationMic
    } else {
      legacyMicButton
    }
  }

  @available(watchOS 9.0, *)
  private var directDictationMic: some View {
    let buttonH = metrics.footerButtonHeight()
    let radius = metrics.tileCornerRadius(buttonHeight: buttonH)
    return TextFieldLink(prompt: Text("Say what you ate")) {
      micLabel
    } onSubmit: { spoken in
      WatchInteractionFeedback.play(.confirm)
      VoiceMealSubmit.send(
        connectivity: connectivity,
        transcript: spoken,
        isSending: $isSending,
        statusMessage: $statusMessage
      )
    }
    .buttonStyle(PhysiqPressableButtonStyle())
    .foregroundStyle(PhysiqTheme.background)
    .background(
      RoundedRectangle(cornerRadius: radius, style: .continuous).fill(accent)
    )
    .frame(height: buttonH)
    .frame(maxWidth: .infinity)
    .disabled(isSending)
    .opacity(isSending ? 0.65 : 1)
  }

  private var legacyMicButton: some View {
    let buttonH = metrics.footerButtonHeight()
    let radius = metrics.tileCornerRadius(buttonHeight: buttonH)
    return Button {
      WatchInteractionFeedback.play(.tap)
      onLegacyTap()
    } label: {
      micLabel
    }
    .buttonStyle(PhysiqPressableButtonStyle())
    .foregroundStyle(PhysiqTheme.background)
    .background(
      RoundedRectangle(cornerRadius: radius, style: .continuous).fill(accent)
    )
    .frame(height: buttonH)
    .frame(maxWidth: .infinity)
    .disabled(isSending)
    .opacity(isSending ? 0.65 : 1)
  }

  private var micLabel: some View {
    Image(systemName: "mic.fill")
      .font(.system(size: 18, weight: .bold))
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

/// watchOS 8 fallback — TextField dictation + Send in one sheet (no “Start speaking” step).
struct VoiceMealLegacySheet: View {
  @EnvironmentObject private var connectivity: WatchConnectivityManager
  @Environment(\.dismiss) private var dismiss
  @Binding var statusMessage: String
  @Binding var isSending: Bool

  @State private var transcript = ""

  var body: some View {
    VStack(spacing: 8) {
      Text("Say what you ate")
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(PhysiqTheme.textSecondary)
        .multilineTextAlignment(.center)

      TextField("2 eggs and toast", text: $transcript)
        .font(.system(size: 13, weight: .semibold))
        .submitLabel(.done)
        .onSubmit { submit() }

      Button {
        submit()
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
      .disabled(isSending || transcript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

      if isSending {
        ProgressView()
          .tint(PhysiqTheme.defaultAccent)
      }
    }
    .padding(10)
  }

  private func submit() {
    WatchInteractionFeedback.play(.confirm)
    VoiceMealSubmit.send(
      connectivity: connectivity,
      transcript: transcript,
      isSending: $isSending,
      statusMessage: $statusMessage
    )
    if !transcript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      dismiss()
    }
  }
}
