import React, { useState } from "react";
import {
  Phone,
  Heart,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { EmergencyContact } from "../types";

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: EmergencyContact[];
  onSaveContacts: (contacts: EmergencyContact[]) => void;
  onTestSosSignal?: (contact: EmergencyContact) => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onSaveContacts,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("Ammi (Mother)");
  const [newPhone, setNewPhone] = useState("+92 3");

  if (!isOpen) return null;

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPhone.trim().length < 10) return;

    const newContact: EmergencyContact = {
      id: `ec_${Date.now()}`,
      name: newName.trim(),
      relationship: newRelationship,
      phone: newPhone.trim(),
      isPrimary: contacts.length === 0,
      autoCallOnSos: true,
      autoSmsGpsOnSos: true,
    };

    onSaveContacts([...contacts, newContact]);
    setNewName("");
    setNewPhone("+92 3");
    setIsAddingNew(false);
  };

  const handleDeleteContact = (id: string) => {
    onSaveContacts(contacts.filter((c) => c.id !== id));
  };

  return (
    <div
      id="emergency-contacts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <Heart className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Who to alert in emergency?</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                They get your location & driver details automatically
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

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Existing contacts */}
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300 shrink-0">
                  {contact.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{contact.name}</span>
                    {contact.isPrimary && (
                      <span className="text-[9px] font-bold text-red-300 bg-red-950 px-1.5 py-0.5 rounded border border-red-800 shrink-0">
                        SOS
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {contact.phone}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteContact(contact.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {contacts.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs">
              Add someone you trust. They'll be alerted if you need help.
            </div>
          )}

          {/* Add new contact */}
          {!isAddingNew ? (
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full py-3 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-dashed border-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-red-400" />
              <span>Add Person</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddContact}
              className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">New Contact</span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <input
                type="text"
                required
                placeholder="Name (e.g., Ammi, Bhai)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-400"
                >
                  <option value="Ammi (Mother)">Ammi</option>
                  <option value="Abu (Father)">Abu</option>
                  <option value="Bhai (Brother)">Bhai</option>
                  <option value="Behan (Sister)">Behan</option>
                  <option value="Husband">Husband</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Save
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
