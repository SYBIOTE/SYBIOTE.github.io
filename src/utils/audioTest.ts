/**
 * Audio Services Test Utilities
 *
 * This file contains test utilities to verify that the audio services
 * are working correctly. These can be run from the browser logger.
 */

// Test VAD Service
export const testVAD = async () => {
  logger.log('Testing VAD Service...')

  // Check if VAD package is available
  try {
    const { MicVAD } = await import('@ricky0123/vad-web')
    logger.log('✅ VAD package loaded successfully')

    // Test VAD initialization
    const vad = await MicVAD.new({
      model: 'v5',
      onSpeechStart: () => logger.log('🎤 Speech detected'),
      onSpeechEnd: (audio) => logger.log('🔇 Speech ended, audio length:', audio.length)
    })

    logger.log('✅ VAD initialized successfully')
    vad.pause() // Clean up
    return true
  } catch (error) {
    logger.error('❌ VAD test failed:', error)
    return false
  }
}

// Test Web Speech API availability
export const testSpeechAPI = () => {
  logger.log('Testing Web Speech API...')

  const windowWithSpeech = window as Window & {
    webkitSpeechRecognition?: unknown
    SpeechRecognition?: unknown
  }

  const hasSpeechRecognition = !!windowWithSpeech.webkitSpeechRecognition || !!windowWithSpeech.SpeechRecognition
  const hasSpeechSynthesis = !!window.speechSynthesis

  logger.log('Speech Recognition available:', hasSpeechRecognition ? '✅' : '❌')
  logger.log('Speech Synthesis available:', hasSpeechSynthesis ? '✅' : '❌')

  if (hasSpeechSynthesis) {
    const voices = speechSynthesis.getVoices()
    logger.log('Available voices:', voices.length)
    voices.slice(0, 3).forEach((voice) => logger.log(`  - ${voice.name} (${voice.lang})`))
  }

  return hasSpeechRecognition && hasSpeechSynthesis
}

// Test TTS
export const testTTS = async (text: string = 'Hello, this is a test of the text to speech system.') => {
  logger.log('Testing TTS with text:', text)

  if (!window.speechSynthesis) {
    logger.error('❌ Speech synthesis not available')
    return false
  }

  return new Promise<boolean>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)

    utterance.onstart = () => logger.log('🔊 TTS started')
    utterance.onend = () => {
      logger.log('✅ TTS completed')
      resolve(true)
    }
    utterance.onerror = (error) => {
      logger.error('❌ TTS error:', error)
      resolve(false)
    }

    speechSynthesis.speak(utterance)
  })
}

// Run all tests
export const runAllAudioTests = async () => {
  logger.log('🧪 Running Audio Services Tests...')
  logger.log('='.repeat(50))

  const speechAPITest = testSpeechAPI()
  const vadTest = await testVAD()
  const ttsTest = await testTTS()

  logger.log('='.repeat(50))
  logger.log('Test Results:')
  logger.log('Web Speech API:', speechAPITest ? '✅ PASS' : '❌ FAIL')
  logger.log('VAD Service:', vadTest ? '✅ PASS' : '❌ FAIL')
  logger.log('TTS Service:', ttsTest ? '✅ PASS' : '❌ FAIL')

  const allPassed = speechAPITest && vadTest && ttsTest
  logger.log('Overall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')

  return allPassed
}

// Make tests available globally for browser logger
if (typeof window !== 'undefined') {
  const globalWindow = window as Window & { audioTests?: unknown }
  globalWindow.audioTests = {
    testVAD,
    testSpeechAPI,
    testTTS,
    runAllAudioTests
  }

  logger.log('Audio tests available at window.audioTests')
  logger.log('Run window.audioTests.runAllAudioTests() to test all services')
}
