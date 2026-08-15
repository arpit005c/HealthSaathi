'use client';

import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

function WelcomeImage() {
  return (
    <div className="flex items-center justify-center">
      <div className="border-primary/20 bg-primary/5 relative flex h-28 w-28 items-center justify-center rounded-full border shadow-[0_0_40px_-10px_rgba(var(--color-primary),0.3)]">
        <div className="bg-primary/10 absolute inset-0 animate-ping rounded-full duration-3000"></div>

        <div className="bg-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
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
      <section className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        {/* Brand */}
        <div className="border-primary/20 bg-primary/5 mb-8 flex items-center justify-center gap-3 rounded-full border px-5 py-2 shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>

          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
            HealthSaathi AI
          </p>
        </div>

        {/* Heading */}
        <h1 className="text-foreground text-4xl leading-[1.1] font-bold tracking-tight md:text-6xl">
          Your personal <br />
          <span className="text-primary">health assistant.</span>
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mt-6 max-w-xl text-base leading-relaxed md:text-lg">
          Speak naturally about your symptoms, wellness goals, and medical questions in English,
          Hindi, and Hinglish.
        </p>

        {/* Languages */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="bg-secondary text-secondary-foreground rounded-full px-4 py-2 text-xs font-semibold shadow-sm">
            English
          </span>

          <span className="bg-secondary text-secondary-foreground rounded-full px-4 py-2 text-xs font-semibold shadow-sm">
            हिंदी (Hindi)
          </span>

          <span className="bg-secondary text-secondary-foreground rounded-full px-4 py-2 text-xs font-semibold shadow-sm">
            Hinglish
          </span>
        </div>

        {/* Microphone */}
        <div className="mt-12">
          <WelcomeImage />
        </div>

        {/* Status */}
        <div className="mt-8">
          <p className="text-foreground text-base font-semibold">Ready to listen</p>

          <p className="text-muted-foreground mt-2 text-sm">
            Click below to start your secure health consultation.
          </p>
        </div>

        {/* Start Conversation */}
        <Button
          size="lg"
          onClick={onStartCall}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 w-64 rounded-full font-semibold tracking-wide shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>

          {startButtonText}
        </Button>

        {/* Dashboard Navigation */}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-full shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Analytics Dashboard
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-full shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <Link href="/human-help">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Human Help
            </Link>
          </Button>
        </div>

        {/* Trust Badge */}
        <div className="text-muted-foreground mt-8 flex items-center justify-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-600 dark:text-emerald-400"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>

          <p className="text-xs font-medium">Private &amp; Secure Conversation</p>
        </div>
      </section>

      {/* Footer */}
      <div className="fixed bottom-6 left-0 flex w-full items-center justify-center px-6">
        <p className="text-muted-foreground/60 max-w-prose text-center text-xs font-medium">
          Powered by LiveKit and Murf Falcon
        </p>
      </div>
    </div>
  );
};
