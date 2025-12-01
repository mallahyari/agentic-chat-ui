import { useState, useCallback, useRef, useEffect } from 'react';
import { HttpAgent, type Message, type AgentSubscriber } from '@ag-ui/client';

const BACKEND_URL = 'http://localhost:8000/chat';

interface StepData {
	name: string;
	text: string;
	status: 'running' | 'completed';
}

type EnhancedMessage = Message & {
	steps?: StepData[];
};

export function useAgent() {
	const [messages, setMessages] = useState<EnhancedMessage[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [streamingText, setStreamingText] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const agentRef = useRef<HttpAgent | null>(null);
	const threadIdRef = useRef<string | null>(null);

	const isRunningRef = useRef(false);
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
			onTextMessageContentEvent: ({ textMessageBuffer, event }) => {
				// console.log('Streaming update:', { textMessageBuffer, delta: event?.delta });

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
							id: `assistant-${Date.now()}`,
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

						// IMPORTANT: Preserve steps when updating content
						copy[copy.length - 1] = {
							...lastMsg,
							content: updatedContent,
							...(lastMsg.steps && { steps: lastMsg.steps }),
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
					const newStep: StepData = {
						name: stepName,
						text: stepText,
						status: 'running',
					};

					console.log('Creating step:', newStep);

					// If last message is assistant, add step to it
					if (lastMsg && lastMsg.role === 'assistant') {
						const steps = lastMsg.steps ? [...lastMsg.steps, newStep] : [newStep];
						copy[copy.length - 1] = {
							...lastMsg,
							steps,
						};
					} else {
						// Create new assistant message with step
						// Use a unique ID that won't be a placeholder
						copy.push({
							id: `assistant-${Date.now()}`,
							role: 'assistant',
							content: '',
							steps: [newStep],
						});
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

					if (lastMsg && lastMsg.role === 'assistant' && lastMsg.steps) {
						// Find the step and mark it as completed
						const updatedSteps = lastMsg.steps.map((step) => {
							if (step.name === stepName && step.status === 'running') {
								return { ...step, status: 'completed' as const };
							}
							return step;
						});

						copy[copy.length - 1] = {
							...lastMsg,
							steps: updatedSteps,
						};
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
				console.log('onMessagesChanged - Is running:', isRunningRef.current);
				console.log('onMessagesChanged - Agent messages count:', agent.messages.length);

				// Preserve steps from previous messages when syncing with agent
				// We do this EVEN when running, to preserve steps from completed messages
				setMessages((prev) => {
					console.log(
						'Previous messages with steps:',
						prev.filter((m) => m.steps).map((m) => ({ id: m.id, stepsCount: m.steps?.length }))
					);

					// Create maps of existing steps by both message ID and index
					const stepsById = new Map<string, StepData[]>();
					const stepsByIndex = new Map<number, StepData[]>();

					// Count assistant messages to map indices correctly
					let assistantIndex = 0;
					prev.forEach((msg, idx) => {
						if (msg.steps) {
							console.log(
								`Preserving steps for message at index ${idx}, id: ${msg.id}, steps:`,
								msg.steps.length
							);

							// Store by ID if it's a real ID (not a placeholder)
							if (msg.id && !msg.id.includes('placeholder')) {
								stepsById.set(msg.id, msg.steps);
							}

							// Also store by position among assistant messages only
							if (msg.role === 'assistant') {
								stepsByIndex.set(assistantIndex, msg.steps);
							}
						}

						if (msg.role === 'assistant') {
							assistantIndex++;
						}
					});

					// Merge agent messages with preserved steps
					let currentAssistantIndex = 0;
					const result = agent.messages.map((agentMsg) => {
						// Try to find steps by ID first, then by assistant message index
						let existingSteps = stepsById.get(agentMsg.id);

						// If not found by ID and it's an assistant message, try by assistant index
						if (!existingSteps && agentMsg.role === 'assistant') {
							existingSteps = stepsByIndex.get(currentAssistantIndex);
							console.log(
								`Looking for steps for assistant ${currentAssistantIndex}, found:`,
								existingSteps?.length || 0
							);
							currentAssistantIndex++;
						}

						if (existingSteps) {
							console.log(`Restoring ${existingSteps.length} steps to message ${agentMsg.id}`);
							return { ...agentMsg, steps: existingSteps } as EnhancedMessage;
						}
						return agentMsg as EnhancedMessage;
					});

					console.log(
						'Result messages with steps:',
						result.filter((m) => m.steps).map((m) => ({ id: m.id, stepsCount: m.steps?.length }))
					);

					// If we're running and have a streaming message, preserve its steps from prev
					if (isRunningRef.current && result.length > 0 && prev.length > 0) {
						const lastResult = result[result.length - 1];
						const lastPrev = prev[prev.length - 1];

						// If the last message is assistant and has steps in prev, keep them
						if (
							lastResult.role === 'assistant' &&
							lastPrev.role === 'assistant' &&
							lastPrev.steps &&
							!lastResult.steps
						) {
							console.log('Preserving steps for streaming message');
							result[result.length - 1] = { ...lastResult, steps: lastPrev.steps };
						}
					}

					return result;
				});
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
