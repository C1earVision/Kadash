import { useState, useEffect, useRef } from "react";
import { ChevronDown, Brain, Wrench, Route, MessageSquareCode, Loader2 } from "lucide-react";
const STEP_META = {
  reasoning: { icon: Brain, label: "Reasoning" },
  tool_call: { icon: Wrench, label: "Tool call" },
  tool_result: { icon: MessageSquareCode, label: "Tool result" },
  routing: { icon: Route, label: "Routing" },
};

function StepBadge({ type }) {
  const meta = STEP_META[type] || STEP_META.reasoning;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#6B7280] font-medium">
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

/**
 * Collapsible view of model thinking + agent execution trace.
 * @param {{ thinking?: string, steps?: import('../types/agentApi').AgentStep[], streaming?: boolean, statusText?: string }} props
 */
export default function AgentThinking({ thinking, steps = [], streaming = false, statusText }) {
  const [open, setOpen] = useState(streaming);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (streaming) setOpen(true);
  }, [streaming]);

  useEffect(() => {
    if (streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinking, steps, streaming]);

  const hasThinking = Boolean(thinking?.trim());
  const hasSteps = steps.length > 0;
  if (!hasThinking && !hasSteps && !streaming) return null;

  const stepCount = steps.length + (hasThinking ? 1 : 0);

  return (
    <div className="mb-3 rounded-lg border border-[#272B35] bg-[#12151C] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#181C26] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-[12px] text-[#9CA3AF]">
          {streaming ? (
            <Loader2 size={14} className="text-violet-400 shrink-0 animate-spin" />
          ) : (
            <Brain size={14} className="text-violet-400 shrink-0" />
          )}
          <span className="font-medium text-[#D1D5DB]">Thought process</span>
          {streaming ? (
            <span className="text-violet-300/80">{statusText || "Live…"}</span>
          ) : (
            <span className="text-[#6B7280]">({stepCount} {stepCount === 1 ? "entry" : "entries"})</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#6B7280] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={scrollRef}
          className="border-t border-[#272B35] px-3 py-3 space-y-3 max-h-[420px] overflow-y-auto"
        >
          {(hasThinking || streaming) && (
            <div>
              <p className="text-[11px] font-medium text-violet-300/90 mb-1.5">
                {streaming ? "Live reasoning" : "Summary reasoning"}
              </p>
              <div className="text-[12px] text-[#9CA3AF] leading-relaxed whitespace-pre-wrap break-words">
                {thinking || (streaming ? "…" : "")}
              </div>
            </div>
          )}

          {hasSteps && (
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={`${step.type}-${step.label}-${idx}`}
                  className="rounded-md border border-[#1E2230] bg-[#0F1117] px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-medium text-[#E5E7EB] truncate">
                      {step.label}
                    </span>
                    <StepBadge type={step.type} />
                  </div>
                  <pre className="text-[11px] text-[#8B909A] whitespace-pre-wrap break-words font-mono leading-relaxed max-h-48 overflow-y-auto">
                    {step.detail}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
