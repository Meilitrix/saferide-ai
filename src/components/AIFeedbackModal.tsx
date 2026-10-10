import React, { useState } from "react";
import { Star, X, Send, CheckCircle2 } from "lucide-react";
import { AIFeedbackRecord } from "../types";

interface AIFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: AIFeedbackRecord) => void;
}

const CHOICE =
  "py-2 px-2.5 rounded-xl border text-center font-medium transition-all ";

/*
 * Three questions, all answerable from lived experience:
 * how was the ride, did it alarm you for nothing, did the dial make sense.
 * Anything about detection accuracy would be a guess by the rider, so it is
 * not asked - that is measured by labelling chunks in the analysis dashboard.
 */
export const AIFeedbackModal: React.FC<AIFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmitFeedback,
}) => {
  const [rating, setRating] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState<"none" | "once" | "repeatedly">("none");
  const [dialClarity, setDialClarity] = useState<"clear" | "somewhat" | "confusing">("clear");
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitFeedback({
      id: `fb_${Date.now()}`,
      timestamp: new Date().toISOString(),
      rating: rating || 5,
      falseAlarms,
      dialClarity,
      comments: comments.trim(),
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1600);
  };

  return (
    <div
      id="ai-feedback-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">How was this ride?</h3>
            <p className="text-xs text-slate-400 mt-0.5">Three quick taps</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Thanks</h4>
            <p className="text-xs text-slate-300">That is the kind of note we can act on.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
            <div className="space-y-1.5 text-center">
              <label className="block text-xs font-semibold text-slate-300">
                Rate the ride
              </label>
              <div className="flex items-center justify-center gap-1 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="p-1 hover:scale-110 transition-transform">
                    <Star
                      className={`w-7 h-7 ${
                        star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Did it alarm you when nothing was happening?
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: "none", label: "No, stayed calm" },
                  { id: "once", label: "Jumped once" },
                  { id: "repeatedly", label: "Went off often" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFalseAlarms(item.id as any)}
                    className={
                      CHOICE +
                      (falseAlarms === item.id
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200")
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Did the risk dial make sense to you?
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: "clear", label: "Clear" },
                  { id: "somewhat", label: "Sort of" },
                  { id: "confusing", label: "Confusing" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDialClarity(item.id as any)}
                    className={
                      CHOICE +
                      (dialClarity === item.id
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                        : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200")
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Anything else?
                <span className="text-slate-500 font-normal"> (optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="What would have made you feel safer"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Send feedback</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
