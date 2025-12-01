# AG-UI Protocol Guide: Connecting UI to LLM/Agent

A comprehensive guide to using AG-UI Server (Python) and Client (React/TypeScript) SDKs to build real-time streaming AI chat applications.

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Python Server SDK](#python-server-sdk)
- [TypeScript/React Client SDK](#typescriptreact-client-sdk)
- [Event System](#event-system)
- [Complete Implementation Example](#complete-implementation-example)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Introduction

**AG-UI (Agent User Interaction Protocol)** is a streaming event-based protocol designed for building interactive AI agent applications. It provides:

- 🚀 **Real-time streaming** - Stream responses as they're generated
- 🎯 **Type-safe** - Strongly typed data structures in both Python and TypeScript
- 🔄 **Event-driven** - Reactive architecture with lifecycle events
- 🛠️ **Extensible** - Support for custom events, tools, and state management
- 📡 **Framework agnostic** - Works with any HTTP server/client

### Key Concepts

- **Events** - Fundamental units of communication between server and client
- **Streaming** - Responses are sent in real-time chunks, not all at once
- **State Management** - Track agent state, messages, and activity
- **Lifecycle Events** - Track run/step progress from start to finish

---

## Architecture Overview

```
┌─────────────────┐         HTTP POST          ┌─────────────────┐
│                 │  ────────────────────────▶  │                 │
│  React Client   │                             │  FastAPI Server │
│  (@ag-ui/client)│                             │  (ag_ui.core)   │
│                 │  ◀────────────────────────  │                 │
└─────────────────┘   Streaming Events (SSE)   └─────────────────┘
                                                         │
                                                         │
                                                         ▼
                                                 ┌──────────────┐
                                                 │   OpenAI     │
                                                 │   GPT-4      │
                                                 └──────────────┘
```

### Communication Flow

1. **Client sends request** - User message sent via HTTP POST
2. **Server processes** - FastAPI endpoint receives and validates input
3. **Events stream back** - Server emits events as processing occurs
4. **Client renders** - React components update in real-time
5. **Lifecycle completes** - Run finishes with success or error event

---

## Python Server SDK

### Installation

```bash
pip install ag-ui-protocol
```

Or with uv:

```bash
uv add ag-ui-protocol
```

### Basic Setup

```python
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from ag_ui.core import RunAgentInput, EventType, RunStartedEvent, RunFinishedEvent
from ag_ui.core.events import TextMessageChunkEvent
from ag_ui.encoder import EventEncoder

app = FastAPI()

@app.post("/chat")
async def chat(request: Request):
    """AG-UI streaming endpoint"""
    # Parse request body
    body = await request.json()
    input_data = RunAgentInput(**body)

    # Create encoder for events
    encoder = EventEncoder()

    async def event_generator():
        # Your streaming logic here
        yield encoder.encode(RunStartedEvent(...))
        # ... emit other events
        yield encoder.encode(RunFinishedEvent(...))

    return StreamingResponse(
        event_generator(),
        media_type=encoder.get_content_type(),
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
```

### Core Components

#### 1. **RunAgentInput** - Request Validation

The input structure sent from the client:

```python
from ag_ui.core import RunAgentInput

# Automatically parsed from request body
input_data = RunAgentInput(**body)

# Access properties:
# - input_data.messages: List[Message] - Conversation history
# - input_data.thread_id: str - Thread identifier
# - input_data.run_id: str - Unique run identifier
# - input_data.context: Optional[Context] - Additional context
```

#### 2. **EventEncoder** - Event Serialization

Encodes events into the AG-UI streaming format:

```python
from ag_ui.encoder import EventEncoder

encoder = EventEncoder()

# Encode any event
encoded = encoder.encode(event_object)

# Get content type for response headers
content_type = encoder.get_content_type()  # Returns appropriate MIME type
```

#### 3. **Event Types**

Import event classes from `ag_ui.core` and `ag_ui.core.events`:

```python
from ag_ui.core import (
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
```

### Event Emission Patterns

#### Lifecycle Events

```python
import uuid

# 1. Start the run
yield encoder.encode(
    RunStartedEvent(
        type=EventType.RUN_STARTED,
        thread_id=input_data.thread_id,
        run_id=input_data.run_id,
        agent_id="my-agent",
    )
)

# 2. Emit steps (optional)
yield encoder.encode(
    StepStartedEvent(
        type=EventType.STEP_STARTED,
        step_name="Analyzing request"
    )
)

await asyncio.sleep(1)  # Simulate work

yield encoder.encode(
    StepFinishedEvent(
        type=EventType.STEP_FINISHED,
        step_name="Analyzing request"
    )
)

# 3. Stream text response
message_id = str(uuid.uuid4())

for chunk in generate_response():
    yield encoder.encode(
        TextMessageChunkEvent(
            message_id=message_id,
            delta=chunk,  # Text chunk to stream
        )
    )

# 4. Finish the run
yield encoder.encode(
    RunFinishedEvent(
        type=EventType.RUN_FINISHED,
        thread_id=input_data.thread_id,
        run_id=input_data.run_id,
    )
)
```

#### Error Handling

```python
try:
    # Your processing logic
    yield encoder.encode(RunStartedEvent(...))
    # ... process
    yield encoder.encode(RunFinishedEvent(...))

except Exception as error:
    # Emit error event
    yield encoder.encode(
        RunErrorEvent(
            type=EventType.RUN_ERROR,
            message=str(error),
            error_code="PROCESSING_ERROR"  # Optional
        )
    )
```

### Integration with OpenAI

```python
from openai import AsyncOpenAI
import uuid

client = AsyncOpenAI(api_key="your-key")

async def event_generator():
    try:
        yield encoder.encode(RunStartedEvent(...))

        # Call OpenAI with streaming
        stream = await client.chat.completions.create(
            model="gpt-4o",
            stream=True,
            messages=[
                {"role": msg.role, "content": msg.content or ""}
                for msg in input_data.messages
            ],
        )

        message_id = str(uuid.uuid4())

        # Stream each chunk
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield encoder.encode(
                    TextMessageChunkEvent(
                        message_id=message_id,
                        delta=chunk.choices[0].delta.content,
                    )
                )

        yield encoder.encode(RunFinishedEvent(...))

    except Exception as error:
        yield encoder.encode(RunErrorEvent(
            type=EventType.RUN_ERROR,
            message=str(error)
        ))
```

### CORS Configuration

For web clients, enable CORS:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## TypeScript/React Client SDK

### Installation

```bash
npm install @ag-ui/client
```

### Basic Setup

```typescript
import { HttpAgent, type Message, type AgentSubscriber } from '@ag-ui/client';

// Create agent instance
const agent = new HttpAgent({
    url: 'http://localhost:8000/chat',
    threadId: 'thread-123',  // Optional, for conversation continuity
});

// Subscribe to events
const subscriber: AgentSubscriber = {
    onRunStartedEvent: ({ event }) => {
        console.log('Run started');
    },
    onTextMessageContentEvent: ({ textMessageBuffer, event }) => {
        console.log('Streaming:', textMessageBuffer);
    },
    onRunFinishedEvent: ({ event, result }) => {
        console.log('Run finished');
    },
};

agent.subscribe(subscriber);

// Send messages
agent.messages.push({
    id: 'msg-1',
    role: 'user',
    content: 'Hello!',
});

await agent.runAgent();
```

### React Hook Implementation

Create a custom hook for easy integration:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { HttpAgent, type Message, type AgentSubscriber } from '@ag-ui/client';

export function useAgent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const agentRef = useRef<HttpAgent | null>(null);

    // Initialize agent
    useEffect(() => {
        const subscriber: AgentSubscriber = {
            onRunStartedEvent: ({ event }) => {
                setIsRunning(true);
                setError(null);
            },

            onRunFinishedEvent: ({ event, result }) => {
                setIsRunning(false);
            },

            onRunErrorEvent: ({ event }) => {
                setError(event.message || 'An error occurred');
                setIsRunning(false);
            },

            onTextMessageContentEvent: ({ textMessageBuffer, event }) => {
                // Update streaming content in real-time
                setMessages((prev) => {
                    const copy = [...prev];
                    const lastMsg = copy[copy.length - 1];

                    if (!lastMsg || lastMsg.role !== 'assistant') {
                        // Create new assistant message
                        copy.push({
                            id: 'streaming',
                            role: 'assistant',
                            content: textMessageBuffer || '',
                        });
                    } else {
                        // Update existing message
                        copy[copy.length - 1] = {
                            ...lastMsg,
                            content: textMessageBuffer || lastMsg.content,
                        };
                    }
                    return copy;
                });
            },

            onStepStartedEvent: ({ event }) => {
                console.log('Step started:', event.stepName);
            },

            onStepFinishedEvent: ({ event }) => {
                console.log('Step finished:', event.stepName);
            },
        };

        const agent = new HttpAgent({
            url: 'http://localhost:8000/chat',
            threadId: `thread-${Date.now()}`,
        });

        agent.subscribe(subscriber);
        agentRef.current = agent;

        return () => {
            // Cleanup if needed
        };
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        if (!agentRef.current || isRunning) return;

        try {
            const userMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'user',
                content,
            };

            agentRef.current.messages.push(userMessage);
            setMessages([...agentRef.current.messages]);

            await agentRef.current.runAgent();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    }, [isRunning]);

    return { messages, isRunning, error, sendMessage };
}
```

### Using the Hook in Components

```typescript
function ChatApp() {
    const { messages, isRunning, error, sendMessage } = useAgent();

    const handleSubmit = (text: string) => {
        sendMessage(text);
    };

    return (
        <div>
            {messages.map((msg, i) => (
                <div key={i}>
                    <strong>{msg.role}:</strong> {msg.content}
                </div>
            ))}
            {error && <div>Error: {error}</div>}
            <input
                onSubmit={handleSubmit}
                disabled={isRunning}
            />
        </div>
    );
}
```

---

## Event System

### Event Hierarchy

AG-UI supports multiple event categories:

#### 1. **Lifecycle Events**

Track the overall execution flow:

```typescript
// Server emits:
RunStartedEvent → ... → RunFinishedEvent
                  ↓
              RunErrorEvent (on failure)

// Client listens:
onRunStartedEvent({ event }) { }
onRunFinishedEvent({ event, result }) { }
onRunErrorEvent({ event }) { }
```

#### 2. **Step Events**

Track individual processing steps:

```typescript
// Server emits:
StepStartedEvent → StepFinishedEvent

// Client listens:
onStepStartedEvent({ event }) {
    // event.stepName - Name of the step
    // event.stepText - Description (optional)
}
onStepFinishedEvent({ event }) { }
```

#### 3. **Message Events**

Stream text content as it's generated:

```typescript
// Server emits (automatically via TextMessageChunkEvent):
TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT → TEXT_MESSAGE_END

// Client listens:
onTextMessageContentEvent({ textMessageBuffer, event }) {
    // textMessageBuffer - Full accumulated text so far
    // event.delta - Just the new chunk
}
```

#### 4. **State Events**

Track agent state changes:

```typescript
onStateChanged({ state }) {
    // state - Current agent state
}

onMessagesChanged({ agent }) {
    // agent.messages - Current message list
}
```

### Event Flow Diagram

```
Server                          Client
  │                               │
  ├─ RunStartedEvent ────────────▶│ onRunStartedEvent
  │                               │ (UI: Show loading)
  │                               │
  ├─ StepStartedEvent ───────────▶│ onStepStartedEvent
  │                               │ (UI: Show "Planning...")
  ├─ StepFinishedEvent ──────────▶│ onStepFinishedEvent
  │                               │
  ├─ TextMessageChunkEvent ──────▶│ onTextMessageContentEvent
  ├─ TextMessageChunkEvent ──────▶│ onTextMessageContentEvent
  ├─ TextMessageChunkEvent ──────▶│ onTextMessageContentEvent
  │   (multiple chunks)           │ (UI: Update text in real-time)
  │                               │
  ├─ RunFinishedEvent ───────────▶│ onRunFinishedEvent
  │                               │ (UI: Hide loading)
  │                               │
```

---

## Complete Implementation Example

### Backend (FastAPI + OpenAI)

```python
import os
import uuid
import uvicorn
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

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@app.post("/chat")
async def chat(request: Request):
    """AG-UI agentic chat endpoint with OpenAI streaming"""
    body = await request.json()
    input_data = RunAgentInput(**body)
    encoder = EventEncoder()

    async def event_generator():
        try:
            # 1. Start the run
            yield encoder.encode(
                RunStartedEvent(
                    type=EventType.RUN_STARTED,
                    thread_id=input_data.thread_id,
                    run_id=input_data.run_id,
                    agent_id="chat-agent",
                )
            )

            # 2. Optional: Emit processing steps
            yield encoder.encode(
                StepStartedEvent(
                    type=EventType.STEP_STARTED,
                    step_name="Analyzing request"
                )
            )

            await asyncio.sleep(0.5)

            yield encoder.encode(
                StepFinishedEvent(
                    type=EventType.STEP_FINISHED,
                    step_name="Analyzing request"
                )
            )

            # 3. Call OpenAI with streaming
            stream = await client.chat.completions.create(
                model="gpt-4o",
                stream=True,
                messages=[
                    {"role": msg.role, "content": msg.content or ""}
                    for msg in input_data.messages
                ],
            )

            message_id = str(uuid.uuid4())

            # 4. Stream response chunks
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield encoder.encode(
                        TextMessageChunkEvent(
                            message_id=message_id,
                            delta=chunk.choices[0].delta.content,
                        )
                    )

            # 5. Finish the run
            yield encoder.encode(
                RunFinishedEvent(
                    type=EventType.RUN_FINISHED,
                    thread_id=input_data.thread_id,
                    run_id=input_data.run_id,
                )
            )

        except Exception as error:
            print(f"Error: {error}")
            yield encoder.encode(
                RunErrorEvent(
                    type=EventType.RUN_ERROR,
                    message=str(error)
                )
            )

    return StreamingResponse(
        event_generator(),
        media_type=encoder.get_content_type(),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        },
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Frontend (React + TypeScript)

**hooks/useAgent.ts:**

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { HttpAgent, type Message, type AgentSubscriber } from '@ag-ui/client';

const BACKEND_URL = 'http://localhost:8000/chat';

export function useAgent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const agentRef = useRef<HttpAgent | null>(null);
    const threadIdRef = useRef<string>(`thread-${Date.now()}`);

    useEffect(() => {
        const subscriber: AgentSubscriber = {
            onRunStartedEvent: ({ event }) => {
                setIsRunning(true);
                setError(null);
            },

            onRunFinishedEvent: ({ event, result }) => {
                setIsRunning(false);
            },

            onRunErrorEvent: ({ event }) => {
                setError(event.message || 'An error occurred');
                setIsRunning(false);
            },

            onTextMessageContentEvent: ({ textMessageBuffer }) => {
                setMessages((prev) => {
                    const copy = [...prev];
                    const lastMsg = copy[copy.length - 1];

                    if (!lastMsg || lastMsg.role !== 'assistant') {
                        copy.push({
                            id: 'streaming',
                            role: 'assistant',
                            content: textMessageBuffer || '',
                        });
                    } else {
                        copy[copy.length - 1] = {
                            ...lastMsg,
                            content: textMessageBuffer || '',
                        };
                    }
                    return copy;
                });
            },

            onStepStartedEvent: ({ event }) => {
                console.log('Step started:', event.stepName);
            },

            onStepFinishedEvent: ({ event }) => {
                console.log('Step finished:', event.stepName);
            },
        };

        const agent = new HttpAgent({
            url: BACKEND_URL,
            threadId: threadIdRef.current,
        });

        agent.subscribe(subscriber);
        agentRef.current = agent;
    }, []);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!agentRef.current || isRunning) return;

            try {
                const userMessage: Message = {
                    id: `msg-${Date.now()}`,
                    role: 'user',
                    content,
                };

                agentRef.current.messages.push(userMessage);
                setMessages([...agentRef.current.messages]);

                await agentRef.current.runAgent();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            }
        },
        [isRunning]
    );

    return { messages, isRunning, error, sendMessage };
}
```

**App.tsx:**

```typescript
import { useAgent } from './hooks/useAgent';

function App() {
    const { messages, isRunning, error, sendMessage } = useAgent();
    const [input, setInput] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="chat-container">
            <div className="messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        <strong>{msg.role}:</strong>
                        <p>{msg.content}</p>
                    </div>
                ))}
            </div>

            {error && (
                <div className="error">Error: {error}</div>
            )}

            <form onSubmit={handleSubmit}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isRunning}
                    placeholder="Type a message..."
                />
                <button type="submit" disabled={isRunning || !input.trim()}>
                    {isRunning ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
}

export default App;
```

---

## Best Practices

### Server-Side

1. **Always emit lifecycle events**
   ```python
   # Always start with RunStartedEvent
   yield encoder.encode(RunStartedEvent(...))

   # Always end with RunFinishedEvent or RunErrorEvent
   yield encoder.encode(RunFinishedEvent(...))
   ```

2. **Handle errors gracefully**
   ```python
   try:
       # Processing logic
   except Exception as error:
       yield encoder.encode(RunErrorEvent(
           type=EventType.RUN_ERROR,
           message=str(error)
       ))
   ```

3. **Use proper streaming headers**
   ```python
   headers={
       "Cache-Control": "no-cache",
       "X-Accel-Buffering": "no"  # Disable nginx buffering
   }
   ```

4. **Validate input data**
   ```python
   input_data = RunAgentInput(**body)  # Validates structure
   ```

### Client-Side

1. **Manage state carefully during streaming**
   ```typescript
   // Don't overwrite messages while streaming
   if (!isRunning) {
       setMessages([...agent.messages]);
   }
   ```

2. **Use refs for agent instances**
   ```typescript
   const agentRef = useRef<HttpAgent | null>(null);
   ```

3. **Handle cleanup properly**
   ```typescript
   useEffect(() => {
       // Setup
       return () => {
           // Cleanup
       };
   }, []);
   ```

4. **Provide user feedback**
   ```typescript
   {isRunning && <LoadingSpinner />}
   {error && <ErrorMessage message={error} />}
   ```

### Performance

1. **Stream in reasonable chunks** - Don't send too small or too large chunks
2. **Use connection pooling** - Reuse HTTP connections when possible
3. **Implement retry logic** - Handle transient network failures
4. **Debounce user input** - Prevent excessive requests

### Security

1. **Validate API keys** - Never expose keys in client code
2. **Use HTTPS** - Always encrypt traffic in production
3. **Implement rate limiting** - Prevent abuse
4. **Sanitize user input** - Prevent injection attacks

---

## Troubleshooting

### Common Issues

#### 1. Events Not Streaming

**Problem:** Events arrive all at once instead of streaming

**Solution:**
- Check streaming headers are set
- Disable nginx/proxy buffering
- Ensure `StreamingResponse` is used
- Verify encoder content type

```python
return StreamingResponse(
    event_generator(),
    media_type=encoder.get_content_type(),
    headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no"
    }
)
```

#### 2. CORS Errors

**Problem:** Browser blocks requests

**Solution:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 3. Messages Not Updating

**Problem:** UI doesn't show streaming content

**Solution:**
- Check `onTextMessageContentEvent` is implemented
- Use `textMessageBuffer` instead of accumulating deltas manually
- Don't overwrite state while streaming

```typescript
onTextMessageContentEvent: ({ textMessageBuffer }) => {
    // Use textMessageBuffer - it's already accumulated
    setMessages((prev) => {
        const copy = [...prev];
        const lastMsg = copy[copy.length - 1];

        if (lastMsg?.role === 'assistant') {
            copy[copy.length - 1] = {
                ...lastMsg,
                content: textMessageBuffer || '',
            };
        }
        return copy;
    });
}
```

#### 4. TypeScript Errors

**Problem:** Type mismatches

**Solution:**
```typescript
import type { Message, AgentSubscriber } from '@ag-ui/client';

// Ensure proper typing
const subscriber: AgentSubscriber = { /* ... */ };
const message: Message = { /* ... */ };
```

#### 5. Step Events Not Working

**Problem:** Steps not visible in UI

**Solution:**
- Ensure step names match between `StepStartedEvent` and `StepFinishedEvent`
- Check event handlers are implemented
- Verify step data is stored in component state

```typescript
onStepStartedEvent: ({ event }) => {
    // Store step information
    setSteps(prev => [...prev, {
        name: event.stepName,
        status: 'running'
    }]);
}
```

### Debugging Tips

1. **Enable console logging**
   ```typescript
   onRunStartedEvent: ({ event }) => {
       console.log('Run started:', event);
   }
   ```

2. **Check network tab** - Inspect streaming response
3. **Verify event encoding** - Log encoded events server-side
4. **Test with curl**
   ```bash
   curl -X POST http://localhost:8000/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"thread_id":"test"}'
   ```

---

## Additional Resources

- **Official Documentation:** https://docs.ag-ui.com
- **GitHub Repository:** https://github.com/ag-ui-protocol/ag-ui
- **Python SDK:** https://docs.ag-ui.com/sdk/python
- **TypeScript SDK:** https://docs.ag-ui.com/sdk/js
- **Event Reference:** https://docs.ag-ui.com/sdk/python/core/events

---

## Summary

AG-UI Protocol provides a powerful, type-safe way to build streaming AI applications:

✅ **Server:** Use `ag-ui-protocol` with FastAPI to emit events
✅ **Client:** Use `@ag-ui/client` with React to receive events
✅ **Events:** Stream lifecycle, steps, messages, and state
✅ **Real-time:** See responses as they're generated
✅ **Type-safe:** Strongly typed in both Python and TypeScript

Start building your streaming AI application today with AG-UI! 🚀
