import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

class VoiceRecordingService {
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Audio recording permission denied');
        return false;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      this.recording = recording;
      console.log('Recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        console.log('No recording in progress');
        return null;
      }

      console.log('Stopping recording...');
      await this.recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = this.recording.getURI();
      this.recordingUri = uri;
      this.recording = null;

      console.log('Recording stopped and stored at', uri);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.recording = null;
      return null;
    }
  }

  async transcribeAudio(audioUri: string): Promise<string | null> {
    try {
      // For now, return a simulated transcription
      // In production, you would:
      // 1. Convert audio to appropriate format if needed
      // 2. Send to transcription service (OpenAI Whisper, Google Speech-to-Text, etc.)
      // 3. Return the transcribed text
      
      console.log('Transcribing audio from:', audioUri);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation:
      // const audioFile = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
      // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${API_KEY}`,
      //     'Content-Type': 'multipart/form-data',
      //   },
      //   body: formData with audio file
      // });
      // const { text } = await response.json();
      // return text;
      
      // For now, return simulated transcription based on random scenarios
      const scenarios = [
        "I'm feeling pretty good today, just a bit tired from work.",
        "My neck is really sore from sitting at my desk all day.",
        "I'm stressed about deadlines but trying to stay positive.",
        "Feeling great! Did some stretches earlier and it helped a lot.",
        "My back is aching, I think I need to improve my posture.",
      ];
      
      return scenarios[Math.floor(Math.random() * scenarios.length)];
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      return null;
    }
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  async cancelRecording(): Promise<void> {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
        this.recordingUri = null;
      } catch (error) {
        console.error('Error canceling recording:', error);
      }
    }
  }
}

export default new VoiceRecordingService();