import React, { useState } from "react";
import {
  Sparkles,
  Star,
  ShieldCheck,
  Volume2,
  CheckCircle2,
  X,
  Send,
  ThumbsUp,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { AIFeedbackRecord } from "../types";

interface AIFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: AIFeedbackRecord) => void;
}

export const AIFeedbackModal: React.FC<AIFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmitFeedback,
}) => {
  const [rating, setRating] = useState(5);
  const [usefulnessScore, setUsefulnessScore] = useState(9);
  const [speechAccuracy, setSpeechAccuracy] = useState<"exceptional" | "accurate" | "needs_improvement">("exceptional");
  const [noiseFiltering, setNoiseFiltering] = useState<"effective" | "moderate" | "false_positives">("effective");
  const [comments, setComments] = useState("");
  const [scenario, setScenario] = useState("Night Commute / Khwateen Ride");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: AIFeedbackRecord = {
      id: `fb_${Date.now()}`,
      timestamp: new Date().toISOString(),
      rating,
      usefulnessScore,
      speechAccuracy,
      noiseFilteringRating: noiseFiltering,
      comments: comments.trim(),
      scenarioEncountered: scenario,
    };
    onSubmitFeedback(record);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div
      id="ai-feedback-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Safety Usefulness Feedback
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  RideShield™ AI
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Help us refine speech detection, acoustic noise filtering, and passenger safety
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Shukriya! Thank You!</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Your feedback helps our AI models differentiate Pakistani street acoustics, Rickshaw noise, and distress vocalizations even more accurately.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Overall Rating Stars */}
            <div className="space-y-1.5 text-center p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <label className="block text-xs font-semibold text-slate-300">
                How useful is Abhi AI Audio Safety for your peace of mind?
              </label>
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-cyan-400 font-medium">
                {rating === 5
                  ? "Essential Safety Feature (5/5)"
                  : rating === 4
                  ? "Very Helpful & Reassuring (4/5)"
                  : rating === 3
                  ? "Moderately Useful (3/5)"
                  : "Needs Tuning (2/5)"}
              </span>
            </div>

            {/* Usefulness Slider (1 to 10) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>AI Usefulness Index:</span>
                <span className="font-bold text-cyan-400">{usefulnessScore} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={usefulnessScore}
                onChange={(e) => setUsefulnessScore(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Low Impact</span>
                <span>Life-Saving Essential</span>
              </div>
            </div>

            {/* Speech Accuracy & Tone Detection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Urdu & English Distress Keyword Detection:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: "exceptional", label: "Very Accurate" },
                  { id: "accurate", label: "Good" },
                  { id: "needs_improvement", label: "Missed Words" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSpeechAccuracy(item.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-center font-medium transition-all ${
                      speechAccuracy === item.id
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                        : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Noise Filtering (Traffic Horns & Rickshaws) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Acoustic Filter (Rickshaws, Horns, Engine):
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: "effective", label: "Zero False Alarms" },
                  { id: "moderate", label: "Mostly Filtered" },
                  { id: "false_positives", label: "False Triggers" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNoiseFiltering(item.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-center font-medium transition-all ${
                      noiseFiltering === item.id
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ride Context / Scenario */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Scenario Tested / Encountered:
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Night Commute / Khwateen Ride">Night Commute / Khwateen Ride</option>
                <option value="Gulberg / Canal Road Rush Hour Traffic">Gulberg / Canal Road Rush Hour Traffic</option>
                <option value="Airport Inter-city Route">Airport Inter-city Route</option>
                <option value="Solo Female Passenger Commute">Solo Female Passenger Commute</option>
                <option value="Emergency Simulation Test">Emergency Simulation Test</option>
              </select>
            </div>

            {/* User Suggestions Comments */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Suggestions or Thoughts for Improving Passenger Safety:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Punjabi keyword support, direct SOS to family WhatsApp, even faster auto-dial..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Submit Safety Feedback</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
