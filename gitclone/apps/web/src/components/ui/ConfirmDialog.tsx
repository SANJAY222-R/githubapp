import { useState } from "react";

type Props = {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  requireTyping?: string;
};

export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Confirm", requireTyping }: Props) {
  const [typed, setTyped] = useState("");
  const ready = !requireTyping || typed === requireTyping;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 8, maxWidth: 480, width: "100%" }}>
        <h2 style={{ margin: "0 0 8px" }}>{title}</h2>
        <p style={{ margin: "0 0 16px", color: "#555" }}>{message}</p>
        {requireTyping && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13 }}>Type <strong>{requireTyping}</strong> to confirm:</p>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} style={{ width: "100%", padding: "6px 8px", boxSizing: "border-box" }} autoFocus />
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "6px 16px" }}>Cancel</button>
          <button onClick={onConfirm} disabled={!ready} style={{ padding: "6px 16px", background: "#d73a49", color: "#fff", border: "none", borderRadius: 4, cursor: ready ? "pointer" : "not-allowed" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
