"""Outbound telephony agent — places calls and talks to whoever answers.

Unlike the inbound agent, this one does the dialling. It waits to be dispatched
into a room with a phone number in the job metadata, then asks LiveKit to call
that number and bridge it into the room.

Run the worker with:

    uv run python src/telephony/outbound/agent.py dev

Then trigger a call from another terminal:

    uv run python src/telephony/outbound/dial.py --to +15551234567

See src/telephony/README.md for the trunk setup.
"""

import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from livekit import api, rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    room_io,
    tokenize,
)
from livekit.plugins import deepgram, google, murf, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("outbound-agent")

load_dotenv(".env.local")

# Required — create this with `lk sip outbound create`.
OUTBOUND_TRUNK_ID = os.getenv("LIVEKIT_SIP_OUTBOUND_TRUNK_ID")

# Optional — a phone number to transfer people to when they ask for a human.
TRANSFER_TO_NUMBER = os.getenv("TRANSFER_TO_NUMBER")


# ============================================================
# HEALTHSAATHI AI PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are HealthSaathi, a friendly and respectful AI assistant making an
outbound medication reminder call.

Your purpose is ONLY to provide a medication reminder and handle the user's
response. You are not a doctor and must not provide medical diagnosis,
treatment recommendations, dosage changes, or other medical advice.

OUTBOUND CALL RULES:

- The person did not initiate this call, so be polite, brief, and respectful.
- At the beginning, clearly identify yourself as the HealthSaathi AI assistant
  and explain that you are calling about a medication reminder.
- Ask whether this is a good time to talk.
- Keep responses short and natural because this is a phone conversation.
- Do not use emojis, markdown, lists, or complicated language.
- Never pressure the person to continue the conversation.

REMINDER CONVERSATION:

- If the person is available, provide the medication reminder.

- When the user agrees to hear the reminder, say the following demo reminder:

  "This is a demo reminder from HealthSaathi to take your scheduled medication
  at the time you were given by your healthcare provider."

- If they ask you to repeat the reminder, repeat it clearly.

- Do not invent a medication name, dosage, or time.

- If they say they are busy, acknowledge that and politely offer to end
  the call.

- If they say they do not want reminder calls, respect their request and
  end the conversation politely.

- If they ask for a human, use the transfer_to_human tool.

- If you hear a voicemail or answering machine, immediately use the
  detected_answering_machine tool.

- When the conversation is finished, use the end_call tool.
- Do not say a separate goodbye before calling end_call.
- The end_call tool will provide the final goodbye and disconnect the call.


SAFETY:

- Never tell the person to start, stop, increase, decrease, or change a
  medication.

- Never diagnose a medical condition.

- If the person asks for medical advice, explain briefly that you cannot
  provide medical advice and recommend speaking with their doctor or
  healthcare professional.

- If the person reports an emergency or severe symptoms, do not attempt to
  diagnose or treat them. Encourage them to contact appropriate emergency
  medical services or a healthcare professional.


PRIVACY:

- Do not ask for unnecessary sensitive personal information.
- Do not ask for passwords, OTPs, financial information, or account
  credentials.


OPT-OUT:

- If the person says "stop calling", "don't call me", "remove me", or clearly
  asks not to receive calls, respect the request immediately.

- Acknowledge the request and end the call.


The goal is a short, useful, respectful medication reminder conversation.
"""


# ============================================================
# DEMO REMINDER
# ============================================================

REMINDER_MESSAGE = (
    "This is a demo reminder from HealthSaathi to take your scheduled "
    "medication at the time you were given by your healthcare provider."
)


# ============================================================
# FIRST MESSAGE HEARD BY THE USER
# ============================================================

GREETING = (
    "Hello, this is HealthSaathi's AI assistant. "
    "I'm calling with a medication reminder. "
    "Is now a good time to talk?"
)


# The identity LiveKit gives the person we call.
CALLEE_IDENTITY = "phone-user"


# ============================================================
# OUTBOUND AGENT
# ============================================================
class OutboundAgent(Agent):

    def __init__(self, ctx: JobContext) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.ctx = ctx
        self._ending = False

    @function_tool
    async def transfer_to_human(
        self,
        context: RunContext
    ) -> str:
        """Transfer the person to a human colleague.

        Use this when they explicitly ask for a person, or when you cannot help
        them with their request.
        """

        if not TRANSFER_TO_NUMBER:
            return (
                "Transfers are not available on this line. "
                "Offer to have someone call back instead."
            )

        await context.session.generate_reply(
            instructions=(
                "Tell them you're connecting them to a colleague now. "
                "Keep it very brief."
            )
        )

        logger.info(
            "transferring call to %s",
            TRANSFER_TO_NUMBER
        )

        try:
            await self.ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=self.ctx.room.name,
                    participant_identity=CALLEE_IDENTITY,
                    transfer_to=f"tel:{TRANSFER_TO_NUMBER}",
                    play_dialtone=True,
                )
            )

        except Exception:
            logger.exception("transfer failed")

            return (
                "The transfer did not go through. "
                "Apologize and offer a call back."
            )

        return "Transferred."

    @function_tool
    async def detected_answering_machine(
        self,
        context: RunContext
    ) -> str:
        """Hang up because the call reached voicemail or an answering machine."""

        logger.info(
            "answering machine detected - hanging up"
        )

        await self._hangup()

        return "Call ended."

    @function_tool
    async def end_call(
        self,
        context: RunContext
    ) -> str:
        """End the call after the conversation is finished.

        Use this when the user says goodbye, thanks the assistant,
        asks to end the call, or the reminder conversation is complete.
        """

        # Prevent the LLM from calling end_call repeatedly.
        if self._ending:
            return "Call is already ending."

        self._ending = True

        logger.info("ending call")

        # Say EXACTLY one goodbye.
        await context.session.say(
            "You're welcome. Thank you for your time. "
            "Have a great day. Goodbye.",
            allow_interruptions=False,
        )

        # Then disconnect the phone call.
        await self._hangup()

        return "Call ended."

    async def _hangup(self) -> None:
        """Delete the LiveKit room and end the SIP phone call."""

        logger.info("hanging up call")

        await self.ctx.api.room.delete_room(
            api.DeleteRoomRequest(
                room=self.ctx.room.name
            )
        )
# ============================================================
# LIVEKIT SERVER
# ============================================================

server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


def phone_number_from_metadata(ctx: JobContext) -> str | None:
    """Read the number to dial out of the dispatch metadata set by dial.py."""

    metadata = ctx.job.metadata

    if not metadata:
        return None

    try:
        return json.loads(metadata).get("phone_number")

    except json.JSONDecodeError:
        # Allow a bare phone number as metadata too.
        return metadata.strip() or None


# ============================================================
# OUTBOUND SESSION
# ============================================================

@server.rtc_session(agent_name="outbound-agent")
async def outbound_agent(ctx: JobContext):

    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    phone_number = phone_number_from_metadata(ctx)

    if not phone_number:
        logger.error(
            "no phone number in job metadata — dispatch with "
            '{"phone_number": "+15551234567"}'
        )

        ctx.shutdown()
        return

    if not OUTBOUND_TRUNK_ID:
        logger.error(
            "LIVEKIT_SIP_OUTBOUND_TRUNK_ID is not set — "
            "cannot place calls"
        )

        ctx.shutdown()
        return

    await ctx.connect()

    # ========================================================
    # VOICE PIPELINE
    # ========================================================

    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
        ),

        llm=google.LLM(
            model="gemini-3.5-flash",
        ),

        tts=murf.TTS(
            voice="Samar",
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(
                min_sentence_len=2
            ),
            text_pacing=True,
        ),

        turn_detection=MultilingualModel(),

        vad=ctx.proc.userdata["vad"],

        preemptive_generation=True,
    )

    # Start the session while the phone is still ringing so the models
    # are warm by the time somebody picks up.

    session_started = asyncio.create_task(
        session.start(
            agent=OutboundAgent(ctx),
            room=ctx.room,

            room_options=room_io.RoomOptions(
                audio_input=room_io.AudioInputOptions(

                    # BVCTelephony is tuned for the narrow frequency
                    # range of phone audio.

                    noise_cancellation=lambda params: (
                        noise_cancellation.BVCTelephony()
                        if params.participant.kind
                        == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                        else noise_cancellation.BVC()
                    ),
                ),
            ),
        )
    )

    logger.info("dialing %s", phone_number)

    try:

        # wait_until_answered returns once the call connects.
        await ctx.api.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,

                sip_trunk_id=OUTBOUND_TRUNK_ID,

                sip_number="arpit075",

                sip_call_to=phone_number,

                participant_identity=CALLEE_IDENTITY,

                participant_name="Phone user",

                wait_until_answered=True,
            )
        )

    except api.TwirpError as e:

        logger.error(
            "call to %s was not answered: %s (%s)",
            phone_number,
            e.message,
            e.metadata.get("sip_status"),
        )

        session_started.cancel()

        ctx.shutdown()

        return

    await session_started

    # ========================================================
    # START THE CONVERSATION
    # ========================================================

    await session.say(
        GREETING,
        allow_interruptions=True
    )


# ============================================================
# START APPLICATION
# ============================================================

if __name__ == "__main__":
    cli.run_app(server)