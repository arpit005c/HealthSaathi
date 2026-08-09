import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  AccessToken,
  type AccessTokenOptions,
  type VideoGrant,
} from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  userId: string;
};

// Environment variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const AGENT_NAME = process.env.AGENT_NAME;

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }

    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }

    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Parse room configuration from request body.
    const body = await req.json().catch(() => ({}));

    let roomConfig: RoomConfiguration | undefined;

    if (body?.room_config) {
      roomConfig = RoomConfiguration.fromJson(body.room_config, {
        ignoreUnknownFields: true,
      });
    } else if (AGENT_NAME) {
      roomConfig = RoomConfiguration.fromJson(
        {
          agents: [{ agentName: AGENT_NAME }],
        },
        {
          ignoreUnknownFields: true,
        }
      );
    }

    /*
     * ------------------------------------------------------------
     * HealthSaathi persistent anonymous user ID
     * ------------------------------------------------------------
     *
     * We use a cookie so the same browser receives the same
     * HealthSaathi user ID on future calls.
     *
     * No name, medical information, API key, or secret is stored
     * in this cookie.
     */

    const cookieStore = await cookies();

    let userId = cookieStore.get('healthsaathi_user_id')?.value;

    if (!userId) {
      userId = `health_user_${crypto.randomUUID()}`;
    }

    // Participant information
    const participantName = 'user';

    // Use the stable HealthSaathi ID as the LiveKit identity.
    const participantIdentity = userId;

    // Room can still be different for every conversation.
    const roomName = `voice_assistant_room_${Math.floor(
      Math.random() * 10_000
    )}`;

    const participantToken = await createParticipantToken(
      {
        identity: participantIdentity,
        name: participantName,
      },
      roomName,
      roomConfig
    );

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName,
      participantToken,
      userId,
    };

    const response = NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });

    /*
     * Keep the anonymous ID in the browser.
     *
     * It contains no personal or medical information.
     */
    if (!cookieStore.get('healthsaathi_user_id')) {
      response.cookies.set('healthsaathi_user_id', userId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);

      return new NextResponse(error.message, {
        status: 500,
      });
    }

    return new NextResponse('Failed to create connection details', {
      status: 500,
    });
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  roomConfig?: RoomConfiguration
): Promise<string> {
  const at = new AccessToken(API_KEY!, API_SECRET!, {
    ...userInfo,
    ttl: '15m',
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };

  at.addGrant(grant);

  if (roomConfig) {
    at.roomConfig = roomConfig;
  }

  return at.toJwt();
}