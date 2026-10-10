import React, { useState } from "react";
import {
  CreditCard,
  Wallet,
  DollarSign,
  Check,
  Plus,
  X,
  ShieldCheck,
  Building,
  Smartphone,
} from "lucide-react";
import { PaymentMethod } from "../types";

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}

export const PaymentMethodsModal: React.FC<PaymentMethodsModalProps> = ({
  isOpen,
  onClose,
  selectedMethod,
  onSelectMethod,
}) => {
  const [walletNumber, setWalletNumber] = useState("+92 300 1234567");

  if (!isOpen) return null;

  const paymentOptions = [
    {
      id: "jazzcash" as PaymentMethod,
      name: "JazzCash Mobile Account",
      subtitle: "Direct deduction via MPIN prompt",
      badge: "Most Popular in PK",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
      icon: Smartphone,
    },
    {
      id: "easypaisa" as PaymentMethod,
      name: "Easypaisa Wallet",
      subtitle: "Instant OTP 1-click payment",
      badge: "Instant Approval",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      icon: Wallet,
    },
    {
      id: "abhi_pay" as PaymentMethod,
      name: "Abhi Pay SafeWallet™",
      subtitle: "Rs. 1,450 balance available (with 5% ride cashback)",
      badge: "Abhi Promo",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      icon: ShieldCheck,
    },
    {
      id: "credit_card" as PaymentMethod,
      name: "Debit / Credit Card (Visa / Mastercard / PayPak)",
      subtitle: "Encrypted 3D Secure checkout",
      badge: "Bank Grade",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      icon: CreditCard,
    },
    {
      id: "cash" as PaymentMethod,
      name: "Cash to Driver",
      subtitle: "Pay physical Pakistani Rupees upon trip completion",
      badge: "Standard",
      badgeColor: "bg-slate-700 text-slate-300 border-slate-600",
      icon: DollarSign,
    },
  ];

  return (
    <div
      id="payment-methods-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Payment Preferences
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pakistan Wallets, Cards, and Cash options for Abhi Rides
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

        {/* Options */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {paymentOptions.map((opt) => {
            const isSelected = selectedMethod === opt.id;
            const Icon = opt.icon;
            return (
              <div
                key={opt.id}
                onClick={() => onSelectMethod(opt.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-slate-800 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/30"
                    : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {opt.name}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${opt.badgeColor}`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {opt.subtitle}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-cyan-500 border-cyan-400 text-slate-950"
                      : "border-slate-700"
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Current Default:{" "}
            <strong className="text-white capitalize">
              {selectedMethod.replace("_", " ")}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl transition-all"
          >
            Confirm Method
          </button>
        </div>
      </div>
    </div>
  );
};
