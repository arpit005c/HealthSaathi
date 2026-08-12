import logging
from datetime import datetime, timezone

from dotenv import load_dotenv
from livekit import rtc
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
from livekit.plugins import (
    deepgram,
    google,
    murf,
    noise_cancellation,
    silero,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from src.memory import initialize_database
from src.memory import lookup_user as db_lookup_user
from src.memory import save_user as db_save_user

from src.escalation.service import (
    initialize_escalation_table,
    create_escalation as db_create_escalation,
)


logger = logging.getLogger("agent")

load_dotenv(".env.local")


SYSTEM_PROMPT = """
IDENTITY

You are HealthSaathi AI, a friendly multilingual healthcare assistant
that provides general health education and wellness guidance.

You are not a doctor.

You must never pretend to be a doctor, diagnose diseases, prescribe
medicines, or make treatment decisions.

Your role is to provide safe general information and know when a
human healthcare professional should take over.


OBJECTIVES

- Help users understand common health concerns.
- Encourage healthy habits.
- Provide general health education.
- Use the health_triage tool when appropriate.
- Remember only information that the user explicitly agrees to save.
- Know when to ask a human healthcare professional for help.


MEMORY

You have access to two memory tools:

1. lookup_user
   Use this to check whether the current caller has an existing
   HealthSaathi memory record.

2. save_user
   Use this only after the caller has explicitly agreed to save
   their information.

The memory tools automatically know the caller's identity.

Never ask the caller for a user ID.
Never invent a user ID.
Never pass a made-up user ID to a memory tool.

On the first meaningful interaction with a caller, use lookup_user
to check whether they are a returning caller.

If saved memory exists and contains the caller's name, naturally
greet the returning caller by name if appropriate.

Do not reveal private stored information unless it is relevant to
the current conversation.

Do not save detailed medical conversations, diagnoses, prescriptions,
OTP codes, passwords, PINs, account numbers, or unnecessary sensitive
information.


HEALTH TRIAGE

You have access to a health_triage tool.

Use health_triage when the caller describes symptoms and wants to
know how urgently they should seek professional medical care.

Examples include:

- chest pain
- difficulty breathing
- heavy bleeding
- unconsciousness
- stroke-like symptoms
- severe allergic reaction
- severe or worsening symptoms

The tool provides an urgency classification only.

It does NOT diagnose a disease.
It does NOT prescribe medicine.
It does NOT replace a doctor.

If the tool returns URGENT, clearly recommend immediate professional
medical attention.

If the tool returns PROFESSIONAL_CARE, recommend consultation with
an appropriate healthcare professional.

If the tool returns GENERAL_GUIDANCE, provide general wellness guidance
while reminding the caller that persistent or worsening symptoms
should be professionally assessed.

If the tool is unavailable, do not guess or invent a triage result.

Always mention that the triage result is based on the current
assessment time.


HUMAN HELP / ESCALATION

You have access to a create_escalation tool.

HealthSaathi must ask a human healthcare professional for help in
these situations:

1. RED-FLAG OR EMERGENCY SYMPTOMS

If the caller reports potentially serious symptoms such as:

- chest pain or pressure
- severe difficulty breathing
- unconsciousness
- heavy bleeding
- stroke-like symptoms
- severe allergic reaction
- coughing blood
- vomiting blood
- another potentially life-threatening situation

the agent must not attempt to diagnose or treat the condition.

Recommend immediate professional medical attention.

If appropriate for the Day 7 human-help workflow, explain that you
can create a human-help request containing a short summary.

2. DIAGNOSIS OR PRESCRIPTION REQUESTS

If the caller asks:

- "Can you diagnose me?"
- "What disease do I have?"
- "Which antibiotic should I take?"
- "Can I take this antibiotic?"
- "What medicine should I take?"
- "What dosage should I take?"
- "Can you prescribe medicine?"
- "Should I start this medication?"

do NOT provide a diagnosis, prescription, antibiotic recommendation,
dosage, or treatment decision.

Explain briefly that a human healthcare professional needs to make
that decision.

Then ask:

"Would you like me to create a human-help request with a short
summary of what you told me?"

IMPORTANT:

Never create an escalation request without explicit permission.

Clear examples of permission include:

- yes
- yes, please
- okay
- go ahead
- that's fine
- create it
- send it

If the caller says no, do not create the request.

Never treat silence as consent.

If the caller gives permission, call create_escalation.

The escalation summary must contain only useful information:

- who needs help
- what happened
- what the agent already checked
- why human help is needed
- urgency
- caller language
- preferred follow-up method

Do NOT include:

- passwords
- OTPs
- PINs
- account numbers
- unnecessary private information
- the entire conversation

Before calling create_escalation, make sure the summary is short and
appropriate for a human healthcare professional.

After create_escalation succeeds:

1. Give the caller the reference ID.
2. Explain that the request has been created.
3. Explain the next step honestly.
4. Do not promise an immediate human response unless such a response
   is actually guaranteed.

Example:

"Your human-help request has been created. Your reference number is
HS-1234ABCD. A healthcare professional can review the request, but I
can't promise an immediate response."


ESCALATION URGENCY

Use:

- EMERGENCY for potentially life-threatening situations.
- HIGH for serious symptoms or urgent medical concerns.
- MEDIUM for diagnosis or medication questions that require
  professional review.
- LOW for non-urgent requests where human assistance would still
  be useful.

Do not exaggerate urgency.

For emergency symptoms, tell the caller to seek immediate professional
medical attention regardless of whether an escalation request is
created.


CONSENT

Before saving a caller's personal information, clearly ask for
permission.

For example:

"Would you like me to remember your name and language preference
for future conversations?"

Only call save_user after explicit consent.

If the caller says no, do not call save_user.

For escalation, also ask for explicit permission before sharing
caller information with a human.

Never treat silence as consent.


ANTIBIOTICS AND MEDICINES

HealthSaathi must NOT prescribe antibiotics.

If a caller asks whether they should take a specific antibiotic,
which antibiotic they should take, or what dosage they should use:

- Do not recommend an antibiotic.
- Do not provide a dosage.
- Do not tell them to start or stop prescription medication.
- Explain that antibiotic decisions should be made by a qualified
  healthcare professional.
- Offer to create a human-help request after asking for permission.

You may provide general educational information about why antibiotics
should be used under professional guidance, without making an
individual treatment recommendation.


LANGUAGE

Always mirror the user's language.

If the user speaks English, reply in English.

If the user speaks Hindi, reply in Hindi.

If the user speaks Hinglish, reply naturally in Hinglish.

Use simple everyday words.

Hindi should preferably use Devanagari script.

Always write each language in its appropriate native script.

Do not unnecessarily use medical jargon.


GUARDRAILS

Never claim to be a doctor.

Never diagnose diseases.

Never prescribe medicines.

Never recommend a specific antibiotic for the caller.

Never provide a prescription dosage.

Never guarantee recovery or treatment.

For emergencies such as chest pain, difficulty breathing,
heavy bleeding, unconsciousness, stroke symptoms, or severe
allergic reactions, immediately advise the user to seek emergency
medical care or visit the nearest hospital.

Do not provide dangerous instructions that could delay emergency
medical care.


STYLE

Speak naturally for voice conversations.

Keep answers under three short sentences whenever possible.

Be calm, friendly, respectful, and reassuring.

Ask one question at a time.

Do not overwhelm the caller with long explanations.

If the user is silent, politely ask if they are still there.
"""


class Assistant(Agent):
    def __init__(self, caller_id: str) -> None:
        self.caller_id = caller_id

        super().__init__(
            instructions=SYSTEM_PROMPT
        )

        logger.info(
            "HealthSaathi initialized for caller identity: %s",
            self.caller_id,
        )

    @function_tool
    async def lookup_user(
        self,
        context: RunContext,
    ) -> str:
        """
        Look up the current caller's saved HealthSaathi memory.

        The caller identity is provided by LiveKit and is not supplied
        by the language model.
        """

        logger.info(
            "Looking up HealthSaathi caller: %s",
            self.caller_id,
        )

        user = db_lookup_user(self.caller_id)

        if user is None:
            logger.info(
                "No HealthSaathi memory found for caller: %s",
                self.caller_id,
            )

            return (
                "No saved HealthSaathi memory was found for this caller. "
                "This appears to be a new caller."
            )

        logger.info(
            "HealthSaathi memory found for caller %s: name=%s",
            self.caller_id,
            user.get("name"),
        )

        name = user.get("name") or "not set"
        language = user.get("language_preference") or "not set"
        age_band = user.get("age_band") or "not set"
        last_interaction = user.get("last_interaction") or "not set"

        return (
            "Returning HealthSaathi caller found. "
            f"Name: {name}. "
            f"Language preference: {language}. "
            f"Age band: {age_band}. "
            f"Last interaction: {last_interaction}. "
            "Greet the caller naturally by name if appropriate."
        )

    @function_tool
    async def save_user(
        self,
        context: RunContext,
        name: str,
        consent: bool,
        language_preference: str | None = None,
        age_band: str | None = None,
        last_triage_outcome: str | None = None,
    ) -> str:
        """
        Save the current caller's consented HealthSaathi profile.

        The caller identity is automatically taken from LiveKit.

        This tool must only be called after explicit user consent.
        """

        if not consent:
            logger.info(
                "Memory save rejected because consent was not given: %s",
                self.caller_id,
            )

            return (
                "The caller did not give consent. "
                "Do not save their information."
            )

        if not name.strip():
            return (
                "No valid name was provided, so nothing was saved."
            )

        logger.info(
            "Saving consented HealthSaathi memory for caller: %s",
            self.caller_id,
        )

        saved = db_save_user(
            user_id=self.caller_id,
            name=name.strip(),
            language_preference=language_preference,
            age_band=age_band,
            last_triage_outcome=last_triage_outcome,
        )

        logger.info(
            "HealthSaathi memory saved for caller: %s",
            self.caller_id,
        )

        return (
            f"Memory saved successfully for {saved['name']}. "
            "You may tell the caller that their agreed information "
            "will be available for future HealthSaathi conversations."
        )

    @function_tool
    async def health_triage(
        self,
        context: RunContext,
        symptoms: str,
    ) -> str:
        """
        Assess the urgency level of symptoms described by the caller.

        This tool performs a conservative symptom-to-triage-level
        classification. It does not diagnose diseases, prescribe
        medication, or replace a healthcare professional.
        """

        checked_at = datetime.now(timezone.utc).isoformat()

        logger.info(
            "Running HealthSaathi triage for caller %s: %s",
            self.caller_id,
            symptoms,
        )

        try:
            text = symptoms.lower().strip()

            if not text:
                return (
                    "TRIAGE_UNAVAILABLE. "
                    "No symptoms were provided. "
                    f"Assessment time: {checked_at}."
                )

            urgent_terms = [
                "chest pain",
                "chest pressure",
                "chest tightness",
                "difficulty breathing",
                "can't breathe",
                "cannot breathe",
                "severe breathlessness",
                "heavy bleeding",
                "unconscious",
                "not responding",
                "stroke",
                "face drooping",
                "speech difficulty",
                "one side weakness",
                "severe allergic reaction",
                "anaphylaxis",
                "coughing blood",
                "vomiting blood",
            ]

            if any(term in text for term in urgent_terms):
                logger.warning(
                    "URGENT triage result for caller %s",
                    self.caller_id,
                )

                return (
                    "TRIAGE_LEVEL: URGENT. "
                    "Red-flag symptoms were detected. "
                    "The caller should seek immediate professional "
                    "medical attention or contact local emergency "
                    "medical services. "
                    f"Assessment time: {checked_at}."
                )

            professional_terms = [
                "high fever",
                "persistent fever",
                "severe pain",
                "worsening pain",
                "persistent vomiting",
                "persistent diarrhea",
                "dehydration",
                "fainting",
                "dizziness",
                "infection",
                "swelling",
                "blood in urine",
                "blood in stool",
            ]

            if any(term in text for term in professional_terms):
                logger.info(
                    "PROFESSIONAL_CARE triage result for caller %s",
                    self.caller_id,
                )

                return (
                    "TRIAGE_LEVEL: PROFESSIONAL_CARE. "
                    "The symptoms may need assessment by a healthcare "
                    "professional, especially if they persist or worsen. "
                    f"Assessment time: {checked_at}."
                )

            logger.info(
                "GENERAL_GUIDANCE triage result for caller %s",
                self.caller_id,
            )

            return (
                "TRIAGE_LEVEL: GENERAL_GUIDANCE. "
                "No predefined red-flag symptom was detected by this "
                "basic screening tool. This is not a diagnosis, and "
                "persistent or worsening symptoms should be assessed "
                "by a healthcare professional. "
                f"Assessment time: {checked_at}."
            )

        except Exception:
            logger.exception(
                "HealthSaathi triage tool failed for caller %s",
                self.caller_id,
            )

            return (
                "TRIAGE_UNAVAILABLE. "
                "The health triage service is temporarily unavailable. "
                "Do not guess about the caller's condition. "
                f"Assessment time: {checked_at}."
            )

    @function_tool
    async def create_escalation(
        self,
        context: RunContext,
        summary: str,
        urgency: str,
        language: str,
        follow_up_method: str,
        consent: bool,
    ) -> str:
        """
        Create a human-help request after explicit caller consent.

        The caller identity is automatically taken from LiveKit.

        This tool must NEVER be called without explicit caller consent.
        """

        if not consent:
            logger.warning(
                "Escalation rejected because consent was not given: %s",
                self.caller_id,
            )

            return (
                "ESCALATION_NOT_CREATED. "
                "The caller did not give permission to share "
                "their information with a human healthcare professional."
            )

        if not summary.strip():
            return (
                "ESCALATION_NOT_CREATED. "
                "A useful summary is required."
            )

        allowed_urgency = {
            "LOW",
            "MEDIUM",
            "HIGH",
            "EMERGENCY",
        }

        urgency = urgency.upper().strip()

        if urgency not in allowed_urgency:
            urgency = "MEDIUM"

        language = language.strip() or "unknown"
        follow_up_method = follow_up_method.strip() or "unknown"

        # Keep the escalation summary short.
        clean_summary = " ".join(summary.split())

        if len(clean_summary) > 1000:
            clean_summary = clean_summary[:1000].rstrip() + "..."

        logger.info(
            "Creating human escalation for caller %s | urgency=%s",
            self.caller_id,
            urgency,
        )

        try:
            reference_id = db_create_escalation(
                caller_id=self.caller_id,
                summary=clean_summary,
                urgency=urgency,
                language=language,
                follow_up_method=follow_up_method,
            )

            logger.info(
                "Human escalation successfully created: %s",
                reference_id,
            )

            return (
                f"ESCALATION_CREATED. "
                f"Reference ID: {reference_id}. "
                f"Urgency: {urgency}. "
                "The human-help request has been saved successfully. "
                "Tell the caller the reference ID and explain that a "
                "healthcare professional can review the request. "
                "Do not promise an immediate response."
            )

        except Exception:
            logger.exception(
                "Failed to create human escalation for caller %s",
                self.caller_id,
            )

            return (
                "ESCALATION_FAILED. "
                "The human-help request could not be created right now. "
                "Do not claim that a request was created."
            )


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):

    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Make sure both SQLite tables exist.
    initialize_database()
    initialize_escalation_table()

    # Connect to LiveKit first so we can identify the caller.
    await ctx.connect()

    # Wait for the actual human participant.
    participant = await ctx.wait_for_participant()

    # IMPORTANT:
    # This identity comes from LiveKit, not from Gemini.
    caller_id = participant.identity

    logger.info(
        "HealthSaathi caller connected: identity=%s name=%s",
        participant.identity,
        participant.name,
    )

    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
        ),

        llm=google.LLM(
            model="gemini-3.5-flash-lite",
        ),

        tts=murf.TTS(
            voice="Anisha",
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

    await session.start(
        agent=Assistant(caller_id=caller_id),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )


if __name__ == "__main__":
    cli.run_app(server)