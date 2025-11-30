import os
import uuid
import uvicorn
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from ag_ui.core import (
    RunAgentInput,
    EventType,
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
)
from ag_ui.core.events import (
    TextMessageChunkEvent,
    StepStartedEvent,
    StepFinishedEvent,
)
from ag_ui.encoder import EventEncoder
from openai import AsyncOpenAI

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

app = FastAPI()

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AsyncOpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@app.get("/")
async def root():
    """Root endpoint with welcome message"""
    return {
        "status": "ok",
        "service": "ag-ui-backend",
        "endpoints": ["/chat", "/health"]
    }


@app.post("/chat")
async def chat(request: Request):
    """AG-UI agentic chat endpoint with OpenAI streaming"""
    # Parse the raw request body
    body = await request.json()
    
    # Use AG-UI's RunAgentInput model to validate/parse
    input_data = RunAgentInput(**body)
    
    encoder = EventEncoder()

    async def event_generator():
        try:
            # Emit run started event
            yield encoder.encode(
                RunStartedEvent(
                    type=EventType.RUN_STARTED,
                    thread_id=input_data.thread_id,
                    run_id=input_data.run_id,
                    agent_id="perplexity-clone",
                )
            )

            # Step 1: Planning
            # Workaround: encode step_text in stepName since AG-UI client strips step_text field
            step1_name = "Creating a plan|||The user wants to know about the latest news. I should search for current events and headlines from reliable sources."
            yield encoder.encode(
                StepStartedEvent(
                    type=EventType.STEP_STARTED,
                    step_name=step1_name
                )
            )
            await asyncio.sleep(0.8)
            yield encoder.encode(
                StepFinishedEvent(
                    type=EventType.STEP_FINISHED,
                    step_name=step1_name
                )
            )

            # Step 2: Searching web
            step2_name = "Searching web|||I will search for the top news stories from reliable sources to gather comprehensive information."
            yield encoder.encode(
                StepStartedEvent(
                    type=EventType.STEP_STARTED,
                    step_name=step2_name
                )
            )
            await asyncio.sleep(1.5)
            yield encoder.encode(
                StepFinishedEvent(
                    type=EventType.STEP_FINISHED,
                    step_name=step2_name
                )
            )

            # Step 3: Reading content
            step3_name = "Reading content|||Reading through the search results to extract key information about world events and current headlines."
            yield encoder.encode(
                StepStartedEvent(
                    type=EventType.STEP_STARTED,
                    step_name=step3_name
                )
            )
            await asyncio.sleep(1.0)
            yield encoder.encode(
                StepFinishedEvent(
                    type=EventType.STEP_FINISHED,
                    step_name=step3_name
                )
            )

            # Call OpenAI's API with streaming enabled
            stream = await client.chat.completions.create(
                model="gpt-4o",
                stream=True,
                messages=[
                    {"role": msg.role, "content": msg.content or ""}
                    for msg in input_data.messages
                ],
            )

            message_id = str(uuid.uuid4())

            # Stream each chunk from OpenAI's response
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    # Debug: log chunk content server-side to verify streaming
                    yield encoder.encode(
                        TextMessageChunkEvent(
                            message_id=message_id,
                            delta=chunk.choices[0].delta.content,
                        )
                    )

            # Emit run finished event
            yield encoder.encode(
                RunFinishedEvent(
                    type=EventType.RUN_FINISHED,
                    thread_id=input_data.thread_id,
                    run_id=input_data.run_id,
                )
            )

        except Exception as error:
            print(f"Error generating response: {error}", flush=True)
            # Emit error event on failure
            yield encoder.encode(
                RunErrorEvent(
                    type=EventType.RUN_ERROR,
                    message=str(error)
                )
            )

    # Add common no-buffer headers to encourage proxies/servers to stream immediately
    content_type = encoder.get_content_type()
    return StreamingResponse(
        event_generator(),
        media_type=content_type,
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)


if __name__ == "__main__":
    main()
