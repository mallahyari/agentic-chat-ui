import { useState, useCallback, useRef, useEffect } from 'react';
import { HttpAgent, type Message, type AgentSubscriber } from '@ag-ui/client';

const BACKEND_URL = 'http://localhost:8000/chat';

export function useAgent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [streamingText, setStreamingText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const agentRef = useRef<HttpAgent | null>(null);
    const threadIdRef = useRef<string | null>(null);

    const isRunningRef = useRef(false);

    // Store step_text from raw events since AG-UI client strips it
    const stepTextMapRef = useRef<Map<string, string>>(new Map());
    // Initialize threadId once after mount
    useEffect(() => {
        if (!threadIdRef.current) {
            threadIdRef.current = `thread-${Date.now()}`;
        }
    }, []);

    // Initialize agent on mount
    useEffect(() => {
        const subscriber: AgentSubscriber = {
            // Lifecycle events
            onRunStartedEvent: ({ event }) => {
                console.log('Run started:', event);
                setIsRunning(true);
                isRunningRef.current = true;
                setError(null);
                setStreamingText(null);
            },

            onRunFinishedEvent: ({ event, result }) => {
                console.log('Run finished:', result);
                setIsRunning(false);
                isRunningRef.current = false;
                setStreamingText(null);
            },

            onRunErrorEvent: ({ event }) => {
                console.error('Run error:', event.message);
                setError(event.message || 'An error occurred');
                setIsRunning(false);
                isRunningRef.current = false;
                setStreamingText(null);
            },

            // Streaming text messages - this updates in real-time as text streams
            onTextMessageContentEvent: ({
                textMessageBuffer,
                event,
            }) => {
                console.log('Streaming update:', { textMessageBuffer, delta: event?.delta });

                const newContent = textMessageBuffer;
                setStreamingText(newContent ?? null);

                // Fallback: Manually update state
                // We intentionally ignore `messages` or `agent` from the event args here
                // because they might not reflect the partial streaming state yet.
                setMessages((prev) => {
                    const copy = [...prev];
                    const lastMsg = copy[copy.length - 1];

                    // If we have no messages, or the last message is from the user, start a new assistant message
                    if (!lastMsg || lastMsg.role !== 'assistant') {
                        copy.push({
                            id: 'streaming-placeholder',
                            role: 'assistant',
                            content: newContent || event?.delta || '',
                        });
                    } else {
                        // Update existing assistant message
                        // If we have a buffer, use it. If not, append delta to existing content
                        let updatedContent = lastMsg.content;
                        if (newContent) {
                            updatedContent = newContent;
                        } else if (event?.delta && typeof lastMsg.content === 'string') {
                            updatedContent = lastMsg.content + event.delta;
                        }

                        copy[copy.length - 1] = {
                            ...lastMsg,
                            content: updatedContent,
                        };
                    }
                    return copy;
                });
            },

            // Step events
            onStepStartedEvent: ({ event }) => {
                // Parse stepName to extract name and text (workaround for AG-UI client stripping step_text)
                const parts = event.stepName.split('|||');
                const stepName = parts[0];
                const stepText = parts[1] || '';
                console.log('Step started:', stepName, 'Text:', stepText);

                setMessages((prev) => {
                    const copy = [...prev];
                    const lastMsg = copy[copy.length - 1];

                    // Create a new step object
                    const newStep = {
                        name: stepName,
                        text: stepText,
                        status: 'running' as const
                    };

                    console.log('Creating step:', newStep);

                    // If last message is assistant, add step to it
                    if (lastMsg && lastMsg.role === 'assistant') {
                        const steps = (lastMsg as any).steps ? [...(lastMsg as any).steps, newStep] : [newStep];
                        copy[copy.length - 1] = {
                            ...lastMsg,
                            steps
                        } as any;
                    } else {
                        // Create new assistant message with step
                        copy.push({
                            id: 'step-placeholder',
                            role: 'assistant',
                            content: '',
                            steps: [newStep]
                        } as any);
                    }
                    return copy;
                });
            },

            onStepFinishedEvent: ({ event }) => {
                // Parse stepName to get just the name part
                const stepName = event.stepName.split('|||')[0];
                console.log('Step finished:', stepName);

                setMessages((prev) => {
                    const copy = [...prev];
                    const lastMsg = copy[copy.length - 1];

                    if (lastMsg && lastMsg.role === 'assistant' && (lastMsg as any).steps) {
                        // Find the step and mark it as completed
                        const updatedSteps = (lastMsg as any).steps.map((step: any) => {
                            if (step.name === stepName && step.status === 'running') {
                                return { ...step, status: 'completed' };
                            }
                            return step;
                        });

                        copy[copy.length - 1] = {
                            ...lastMsg,
                            steps: updatedSteps
                        } as any;
                    }
                    return copy;
                });
            },

            // State updates - this is called when agent state changes
            onStateChanged: ({ state }) => {
                console.log('State updated:', state);
            },

            // Messages changed - update our local state with agent's messages
            onMessagesChanged: ({ agent }) => {
                console.log('Messages updated:', agent.messages);
                // CRITICAL: Do not overwrite messages if we are running, as it might kill the streaming state
                if (!isRunningRef.current) {
                    setMessages([...agent.messages]);
                }
            },
        };

        const agent = new HttpAgent({
            url: BACKEND_URL,
            threadId: threadIdRef.current ?? undefined,
        });

        // Subscribe to agent events
        agent.subscribe(subscriber);

        agentRef.current = agent;

        return () => {
            // Cleanup if needed
        };
    }, []);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!agentRef.current || isRunning) return;

            try {
                setError(null);

                // Create a proper user message
                const userMessage: Message = {
                    id: `msg-${Date.now()}`,
                    role: 'user',
                    content,
                };

                // Add to agent's messages
                agentRef.current.messages.push(userMessage);

                // Update UI immediately
                setMessages([...agentRef.current.messages]);

                // Run the agent - it will process the messages and stream the response
                await agentRef.current.runAgent();
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                console.error('Error sending message:', err);
                setIsRunning(false);
            }
        },
        [isRunning]
    );

    return {
        messages,
        isRunning,
        error,
        streamingText,
        sendMessage,
    };
}
