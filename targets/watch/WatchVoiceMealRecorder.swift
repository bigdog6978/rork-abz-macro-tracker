import AVFoundation
import Speech
import SwiftUI

/// Captures a short spoken meal on-watch and returns the transcript string.
@MainActor
final class WatchVoiceMealRecorder: ObservableObject {
  @Published var transcript = ""
  @Published var isListening = false
  @Published var errorMessage: String?

  private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private let audioEngine = AVAudioEngine()

  func requestPermissions() async -> Bool {
    let speechStatus = await withCheckedContinuation { continuation in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status)
      }
    }
    guard speechStatus == .authorized else {
      errorMessage = "Speech access denied."
      return false
    }

    let micGranted: Bool
    if #available(watchOS 10.0, *) {
      micGranted = await AVAudioApplication.requestRecordPermission()
    } else {
      micGranted = await withCheckedContinuation { continuation in
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          continuation.resume(returning: granted)
        }
      }
    }

    if !micGranted {
      errorMessage = "Microphone access denied."
    }
    return micGranted
  }

  func startListening() {
    errorMessage = nil
    transcript = ""
    guard let speechRecognizer, speechRecognizer.isAvailable else {
      errorMessage = "Speech unavailable."
      return
    }

    recognitionTask?.cancel()
    recognitionTask = nil

    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.record, mode: .measurement, options: .duckOthers)
      try session.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      errorMessage = "Could not start audio."
      return
    }

    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest else {
      errorMessage = "Could not start listening."
      return
    }
    recognitionRequest.shouldReportPartialResults = true

    let inputNode = audioEngine.inputNode
    let format = inputNode.outputFormat(forBus: 0)
    inputNode.removeTap(onBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
      recognitionRequest.append(buffer)
    }

    audioEngine.prepare()
    do {
      try audioEngine.start()
    } catch {
      errorMessage = "Could not start microphone."
      cleanupAudio()
      return
    }

    isListening = true
    recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
      guard let self else { return }
      if let result {
        self.transcript = result.bestTranscription.formattedString
        if result.isFinal {
          self.stopListening()
        }
      }
      if error != nil {
        self.stopListening()
      }
    }
  }

  func stopListening() {
    if !isListening && recognitionTask == nil { return }
    isListening = false
    recognitionTask?.finish()
    recognitionTask = nil
    recognitionRequest?.endAudio()
    recognitionRequest = nil
    cleanupAudio()
  }

  private func cleanupAudio() {
    audioEngine.stop()
    audioEngine.inputNode.removeTap(onBus: 0)
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}
