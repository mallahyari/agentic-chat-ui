import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';

interface MessageFeedbackProps {
	messageContent: string;
}

export function MessageFeedback({ messageContent }: MessageFeedbackProps) {
	const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(messageContent);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	const handleFeedback = (type: 'up' | 'down') => {
		setFeedback(type);
		// You can add analytics or API call here to save feedback
		console.log(`User feedback: ${type}`);
	};

	return (
		<div className="relative mt-2 border-t border-gray-100">
			<div className="flex items-center gap-1">
				<Tooltip content="Good response">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleFeedback('up')}
						className={`h-8 w-8 p-0 rounded-lg transition-colors ${
							feedback === 'up'
								? 'bg-teal-50 text-teal-600 hover:bg-teal-100'
								: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
						}`}
					>
						<ThumbsUp className="h-4 w-4" />
					</Button>
				</Tooltip>

				<Tooltip content="Bad response">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleFeedback('down')}
						className={`h-8 w-8 p-0 rounded-lg transition-colors ${
							feedback === 'down'
								? 'bg-red-50 text-red-600 hover:bg-red-100'
								: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
						}`}
					>
						<ThumbsDown className="h-4 w-4" />
					</Button>
				</Tooltip>

				<Tooltip content={copied ? 'Copied!' : 'Copy'}>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCopy}
						className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<Copy className="h-4 w-4" />
					</Button>
				</Tooltip>

				<Tooltip content="More info">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<Info className="h-4 w-4" />
					</Button>
				</Tooltip>
			</div>

			{feedback && (
				<div className="mt-2 text-xs text-gray-500 italic">Thank you for your feedback!</div>
			)}

			{copied && <div className="mt-2 text-xs text-teal-600 font-medium">Copied to clipboard!</div>}
		</div>
	);
}
