type FeedbackTone = "success" | "error" | "info";

type FormFeedbackProps = {
  message: string;
  tone?: FeedbackTone;
};

export function FormFeedback({ message, tone = "info" }: FormFeedbackProps) {
  const toneClass = {
    success: "border-emerald-700/60 bg-emerald-950/40 text-emerald-100",
    error: "border-rose-900/60 bg-rose-950/30 text-rose-100",
    info: "border-slate-800 bg-slate-950/30 text-zinc-300",
  } as const;

  return (
    <p className={`mt-4 border px-3 py-3 text-sm leading-6 ${toneClass[tone]}`}>
      {message}
    </p>
  );
}
