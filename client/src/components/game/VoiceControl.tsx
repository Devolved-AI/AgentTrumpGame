import { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import useSound from 'use-sound';
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Voice command triggers with their corresponding responses
const VOICE_COMMANDS = {
  "huge": "That's gonna be HUGE!",
  "wall": "We're gonna build a wall!",
  "great": "Make blockchain great again!",
  "tremendous": "It's gonna be tremendous, folks!",
  "winning": "We're winning so much!",
} as const;

export function VoiceControl() {
  const [isListening, setIsListening] = useState(false);
  const [playHuge] = useSound('/sounds/huge.mp3');
  const [playWall] = useSound('/sounds/wall.mp3');
  const [playGreat] = useSound('/sounds/great.mp3');
  const [playTremendous] = useSound('/sounds/tremendous.mp3');
  const [playWinning] = useSound('/sounds/winning.mp3');

  const commands = [
    {
      command: 'huge',
      callback: () => {
        playHuge();
        toast({
          title: "Voice Command Detected",
          description: VOICE_COMMANDS.huge,
        });
      }
    },
    {
      command: 'wall',
      callback: () => {
        playWall();
        toast({
          title: "Voice Command Detected",
          description: VOICE_COMMANDS.wall,
        });
      }
    },
    {
      command: 'great',
      callback: () => {
        playGreat();
        toast({
          title: "Voice Command Detected",
          description: VOICE_COMMANDS.great,
        });
      }
    },
    {
      command: 'tremendous',
      callback: () => {
        playTremendous();
        toast({
          title: "Voice Command Detected",
          description: VOICE_COMMANDS.tremendous,
        });
      }
    },
    {
      command: 'winning',
      callback: () => {
        playWinning();
        toast({
          title: "Voice Command Detected",
          description: VOICE_COMMANDS.winning,
        });
      }
    },
  ];

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({ commands });

  useEffect(() => {
    if (isListening && !listening) {
      SpeechRecognition.startListening({ continuous: true });
    } else if (!isListening && listening) {
      SpeechRecognition.stopListening();
    }
  }, [isListening, listening]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="text-center p-4 bg-red-50 text-red-500 rounded-lg">
        Browser doesn't support speech recognition.
      </div>
    );
  }

  const toggleListening = () => {
    if (!isListening) {
      resetTranscript();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-white/50 backdrop-blur-sm">
      <Button
        onClick={toggleListening}
        variant={isListening ? "destructive" : "default"}
        className="flex items-center gap-2"
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4" />
            Stop Listening
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Start Voice Commands
          </>
        )}
      </Button>
      
      {isListening && (
        <div className="text-sm text-muted-foreground animate-pulse">
          Listening for commands...
        </div>
      )}
      
      {transcript && (
        <div className="text-sm max-w-md overflow-hidden">
          <span className="font-semibold">Last heard:</span> {transcript}
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-2">
        Try saying: huge, wall, great, tremendous, winning
      </div>
    </div>
  );
}
