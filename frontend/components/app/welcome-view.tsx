'use client';

import { Button } from '@/components/ui/button';

function WelcomeImage() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black">
          <span className="text-3xl">🎙</span>
        </div>
      </div>
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div className="bg-background relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden px-6">
      {/* Main content */}
      <section className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-2">
          <span className="text-lg">✦</span>

          <p className="text-muted-foreground text-xs font-bold tracking-[0.25em] uppercase">
            HealthSaathi · AI Voice Assistant
          </p>
        </div>

        {/* Heading */}
        <h1 className="text-5xl leading-[0.95] font-bold tracking-tight md:text-7xl">
          Talk naturally.
          <br />
          <span className="text-muted-foreground">
            In your language.
          </span>
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mt-6 max-w-xl text-base leading-7 md:text-lg">
          Your neutral AI voice assistant for natural conversations,
          questions, and everyday help in English, Hindi, and Hinglish.
        </p>

        {/* Language badges */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border px-4 py-2 text-xs font-medium">
            English
          </span>

          <span className="rounded-full border px-4 py-2 text-xs font-medium">
            हिंदी
          </span>

          <span className="rounded-full border px-4 py-2 text-xs font-medium">
            Hinglish
          </span>
        </div>

        {/* Microphone */}
        <div className="mt-10">
          <WelcomeImage />
        </div>

        {/* Status */}
        <div className="mt-7">
          <p className="text-base font-semibold">
            Ready to talk
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            Click below to start your voice conversation.
          </p>
        </div>

        {/* Start button */}
        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-6 w-64 rounded-full font-mono text-xs font-bold tracking-wider uppercase"
        >
          🎙 {startButtonText}
        </Button>

        {/* Supporting text */}
        <p className="text-muted-foreground mt-8 max-w-lg text-xs leading-5 md:text-sm">
          Speak naturally and switch between English, Hindi, and Hinglish
          during your conversation.
        </p>
      </section>

      {/* Footer */}
      <div className="fixed bottom-5 left-0 flex w-full items-center justify-center px-6">
        <p className="text-muted-foreground max-w-prose text-center text-xs leading-5 font-normal md:text-sm">
          Powered by LiveKit and Murf Falcon
        </p>
      </div>
    </div>
  );
};