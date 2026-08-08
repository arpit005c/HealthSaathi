'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, type MotionProps, motion } from 'motion/react';
import {
  useAgent,
  useSessionContext,
  useSessionMessages,
} from '@livekit/components-react';

import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import {
  AgentControlBar,
  type AgentControlBarControls,
} from '@/components/agents-ui/agent-control-bar';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/lib/shadcn/utils';

import { TileLayout } from './tile-view';

const MotionMessage = motion.create(Shimmer);

const BOTTOM_VIEW_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      translateY: '0%',
    },
    hidden: {
      opacity: 0,
      translateY: '100%',
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.5,
    ease: 'easeOut',
  },
};

const CHAT_MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeOut',
        duration: 0.3,
      },
    },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.2,
        ease: 'easeOut',
        duration: 0.3,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

const SHIMMER_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0.8,
      },
    },
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'from-background pointer-events-none h-4 bg-linear-to-b to-transparent',
        top && 'bg-linear-to-b',
        bottom && 'bg-linear-to-t',
        className
      )}
    />
  );
}

/**
 * HealthSaathi status indicator.
 *
 * Shows the user what the voice agent is currently doing:
 * connecting, listening, thinking, or speaking.
 */
function AgentStatus({ state }: { state: string }) {
  const status = {
    connecting: {
      label: 'Connecting to HealthSaathi...',
      description: 'Please wait while we connect you.',
      indicator: 'Connecting',
    },

    initializing: {
      label: 'Getting HealthSaathi ready...',
      description: 'Almost ready.',
      indicator: 'Preparing',
    },

    listening: {
      label: 'Listening to you',
      description: 'Go ahead, I am listening.',
      indicator: 'Listening',
    },

    thinking: {
      label: 'HealthSaathi is thinking...',
      description: 'Please give me a moment.',
      indicator: 'Thinking',
    },

    speaking: {
      label: 'HealthSaathi is speaking',
      description: 'You can listen to the response.',
      indicator: 'Speaking',
    },

    disconnected: {
      label: 'Conversation ended',
      description: 'You can start another conversation anytime.',
      indicator: 'Ended',
    },

    failed: {
      label: 'Connection problem',
      description: 'Please try starting the conversation again.',
      indicator: 'Error',
    },
  }[state] ?? {
    label: 'HealthSaathi',
    description: 'Your AI health companion.',
    indicator: 'Ready',
  };

  return (
    <div className="pointer-events-none absolute left-1/2 top-6 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 text-center">
      <div className="bg-background/90 border-border rounded-2xl border px-5 py-3 shadow-lg backdrop-blur">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              state === 'listening' && 'animate-pulse bg-green-500',
              state === 'speaking' && 'animate-pulse bg-blue-500',
              state === 'thinking' && 'animate-pulse bg-yellow-500',
              state === 'connecting' && 'animate-pulse bg-yellow-500',
              state === 'initializing' && 'animate-pulse bg-yellow-500',
              state === 'failed' && 'bg-red-500',
              state === 'disconnected' && 'bg-muted-foreground',
              ![
                'listening',
                'speaking',
                'thinking',
                'connecting',
                'initializing',
                'failed',
                'disconnected',
              ].includes(state) && 'bg-green-500'
            )}
          />

          <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            {status.indicator}
          </span>
        </div>

        <p className="text-sm font-semibold">{status.label}</p>

        <p className="text-muted-foreground mt-1 text-xs">
          {status.description}
        </p>
      </div>
    </div>
  );
}

export interface AgentSessionView_01Props {
  /**
   * Message shown above the controls before the first chat message is sent.
   *
   * @default 'Agent is listening, ask it a question'
   */
  preConnectMessage?: string;

  /**
   * Enables or disables the chat toggle and transcript input controls.
   *
   * @default true
   */
  supportsChatInput?: boolean;

  /**
   * Enables or disables camera controls in the bottom control bar.
   *
   * @default true
   */
  supportsVideoInput?: boolean;

  /**
   * Enables or disables screen sharing controls in the bottom control bar.
   *
   * @default true
   */
  supportsScreenShare?: boolean;

  /**
   * Shows a pre-connect buffer state with a shimmer message before messages appear.
   *
   * @default true
   */
  isPreConnectBufferEnabled?: boolean;

  /** Selects the visualizer style rendered in the main tile area. */
  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';

  /** Primary hex color used by supported audio visualizer variants. */
  audioVisualizerColor?: `#${string}`;

  /** Hue shift intensity used by certain visualizers. */
  audioVisualizerColorShift?: number;

  /** Number of bars to render when audioVisualizerType is bar. */
  audioVisualizerBarCount?: number;

  /** Number of rows in the visualizer when audioVisualizerType is grid. */
  audioVisualizerGridRowCount?: number;

  /** Number of columns in the visualizer when audioVisualizerType is grid. */
  audioVisualizerGridColumnCount?: number;

  /** Number of radial bars when audioVisualizerType is radial. */
  audioVisualizerRadialBarCount?: number;

  /** Base radius of the radial visualizer when audioVisualizerType is radial. */
  audioVisualizerRadialRadius?: number;

  /** Stroke width of the wave path when audioVisualizerType is wave. */
  audioVisualizerWaveLineWidth?: number;

  /** Optional class name merged onto the outer section container. */
  className?: string;
}

export function AgentSessionView_01({
  preConnectMessage = 'HealthSaathi is ready. Ask me a question.',
  supportsChatInput = true,
  supportsVideoInput = true,
  supportsScreenShare = true,
  isPreConnectBufferEnabled = true,

  audioVisualizerType,
  audioVisualizerColor,
  audioVisualizerColorShift,
  audioVisualizerBarCount,
  audioVisualizerGridRowCount,
  audioVisualizerGridColumnCount,
  audioVisualizerRadialBarCount,
  audioVisualizerRadialRadius,
  audioVisualizerWaveLineWidth,

  ref,
  className,
  ...props
}: React.ComponentProps<'section'> & AgentSessionView_01Props) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);

  const [chatOpen, setChatOpen] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const { state: agentState } = useAgent();

  const controls: AgentControlBarControls = {
    leave: true,
    microphone: true,
    chat: supportsChatInput,
    camera: supportsVideoInput,
    screenShare: supportsScreenShare,
  };

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <section
      ref={ref}
      className={cn(
        'bg-background relative z-10 h-full w-full overflow-hidden',
        className
      )}
      {...props}
    >
      {/* HealthSaathi agent status */}
      <AgentStatus state={agentState} />

      {/* Transcript */}
      <div className="absolute top-0 bottom-[135px] flex w-full flex-col md:bottom-[170px]">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              {...CHAT_MOTION_PROPS}
              className="flex h-full w-full flex-col gap-4 space-y-3 transition-opacity duration-300 ease-out"
            >
              <AgentChatTranscript
                agentState={agentState}
                messages={messages}
                className="mx-auto w-full max-w-2xl [&_.is-user>div]:rounded-[22px] [&>div>div]:px-4 [&>div>div]:pt-40 md:[&>div>div]:px-6"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Audio visualizer / tile */}
      <TileLayout
        chatOpen={chatOpen}
        audioVisualizerType={audioVisualizerType}
        audioVisualizerColor={audioVisualizerColor}
        audioVisualizerColorShift={audioVisualizerColorShift}
        audioVisualizerBarCount={audioVisualizerBarCount}
        audioVisualizerRadialBarCount={audioVisualizerRadialBarCount}
        audioVisualizerRadialRadius={audioVisualizerRadialRadius}
        audioVisualizerGridRowCount={audioVisualizerGridRowCount}
        audioVisualizerGridColumnCount={audioVisualizerGridColumnCount}
        audioVisualizerWaveLineWidth={audioVisualizerWaveLineWidth}
      />

      {/* Bottom controls */}
      <motion.div
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="absolute inset-x-3 bottom-0 z-50 md:inset-x-12"
      >
        {/* Pre-connect / helper message */}
        {isPreConnectBufferEnabled && (
          <AnimatePresence>
            {messages.length === 0 && (
              <MotionMessage
                key="pre-connect-message"
                duration={2}
                aria-hidden={messages.length > 0}
                {...SHIMMER_MOTION_PROPS}
                className="pointer-events-none mx-auto block w-full max-w-2xl pb-4 text-center text-sm font-semibold"
              >
                {preConnectMessage}
              </MotionMessage>
            )}
          </AnimatePresence>
        )}

        <div className="bg-background relative mx-auto max-w-2xl pb-3 md:pb-12">
          <Fade
            bottom
            className="absolute inset-x-0 top-0 h-4 -translate-y-full"
          />

          <AgentControlBar
            variant="livekit"
            controls={controls}
            isChatOpen={chatOpen}
            isConnected={session.isConnected}
            onDisconnect={session.end}
            onIsChatOpenChange={setChatOpen}
          />
        </div>
      </motion.div>
    </section>
  );
}