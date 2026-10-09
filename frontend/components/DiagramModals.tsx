"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Loader2, Save, Trash2 } from "lucide-react";
import { DiagramSummary, useGraphStore } from "../lib/store";

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function SaveDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setError("");
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await useGraphStore.getState().saveDiagram(name);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-96 max-w-[90vw]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Save size={18} className="text-blue-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Save diagram</h3>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
          placeholder="e.g. Checkout architecture"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all mb-2"
        />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OpenDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [diagrams, setDiagrams] = useState<DiagramSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDiagrams(null);
    setError("");
    setConfirmId(null);
    useGraphStore
      .getState()
      .listDiagrams()
      .then(setDiagrams)
      .catch((err) => setError(errorText(err)));
  }, [open]);

  if (!open) return null;

  const openDiagram = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await useGraphStore.getState().openDiagram(id);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError("");
    try {
      await useGraphStore.getState().deleteDiagram(id);
      setDiagrams((prev) => (prev ?? []).filter((d) => d.id !== id));
      setConfirmId(null);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-[28rem] max-w-[90vw]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            {busy ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : <FolderOpen size={18} className="text-blue-500" />}
          </div>
          <h3 className="text-base font-semibold text-slate-900">Open diagram</h3>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="max-h-72 overflow-y-auto -mx-1">
          {diagrams === null && !error && (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading…
            </div>
          )}
          {diagrams?.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">No saved diagrams yet.</div>
          )}
          {diagrams?.map((d) => (
            <div
              key={d.id}
              onClick={() => openDiagram(d.id)}
              className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors mx-1"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{d.name}</div>
                <div className="text-xs text-slate-400">{new Date(d.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-medium text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {busy ? "Opening…" : "Open"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirmId === d.id) remove(d.id);
                    else setConfirmId(d.id);
                  }}
                  title={confirmId === d.id ? "Click again to delete" : "Delete"}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                    confirmId === d.id
                      ? "bg-red-50 text-red-600"
                      : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                  }`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
