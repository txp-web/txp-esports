import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface UpiPaymentBoxProps {
  upiId: string;
  upiName: string;
  amount: number;
  note: string;
}

export function UpiPaymentBox({ upiId, upiName, amount, note }: UpiPaymentBoxProps) {
  const [copied, setCopied] = useState(false);

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    upiName
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="bg-[#0D0E12] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-zinc-400">Send exact amount via any UPI app</p>
          <p className="text-xs text-zinc-500 mt-0.5">{upiName}</p>
        </div>
        <p className="font-mono text-2xl font-semibold text-orange-400 tabular-nums">
          ₹{amount.toLocaleString('en-IN')}
        </p>
      </div>

      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <code className="font-mono text-sm text-white bg-[#161820] border border-white/10 px-3 py-1.5 rounded-md truncate">
            {upiId}
          </code>
          <button
            type="button"
            onClick={() => void handleCopyUpi()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-[#1B1D26] hover:bg-[#252834] border border-white/10 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy UPI</span>
              </>
            )}
          </button>
        </div>

        <a
          href={upiUri}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 underline underline-offset-4 whitespace-nowrap shrink-0"
        >
          <span>Pay via UPI App</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
