import React, { useState } from "react";
import { X, Copy, Check, Radio, Link as LinkIcon, Share2, Users, ShieldCheck } from "lucide-react";
import type { Note, Project } from "../../../shared/types";

interface ShareModalProps {
  mode: "host" | "join";
  target: Note | Project | null;
  projects: Project[];
  tunnelUrl: string | null;
  isLoading: boolean;
  onClose: () => void;
  onHostNote?: (note: Note) => Promise<string | void>;
  onStopHostNote?: (note: Note) => Promise<void>;
  onJoinNote?: (note: Note, url: string) => Promise<void>;
}

export function ShareModal({
  mode,
  target,
  projects,
  tunnelUrl,
  isLoading,
  onClose,
  onStopHostNote,
  onJoinNote
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [joinUrlInput, setJoinUrlInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isNote = target && "title" in target;
  const targetTitle = isNote ? (target as Note).title || "Untitled Note" : (target as Project)?.name || "Project";
  const displayUrl = tunnelUrl || target?.syncUrl || "ws://127.0.0.1:1234";

  function handleCopy() {
    if (!displayUrl) return;
    navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = joinUrlInput.trim();
    if (!url) {
      setJoinError("Please enter a valid Tunnel URL");
      return;
    }
    if (!target || !onJoinNote) return;

    setIsSubmitting(true);
    setJoinError(null);
    try {
      await onJoinNote(target as Note, url);
      onClose();
    } catch (err) {
      setJoinError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="share-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <div className="share-modal-title">
            {mode === "host" ? (
              <>
                <Share2 className="header-icon" size={20} />
                <span>Share Note: {targetTitle}</span>
              </>
            ) : (
              <>
                <Users className="header-icon" size={20} />
                <span>Join Shared Note: {targetTitle}</span>
              </>
            )}
          </div>
          <button className="icon-button modal-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {mode === "host" ? (
          <div className="share-modal-body">
            <div className="status-banner active">
              <Radio size={16} className="pulse-icon" />
              <div>
                <strong>Live P2P Sync Active</strong>
                <p>Changes made in this project synchronize in real-time across peers.</p>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Project Tunnel Link</label>
              <div className="url-copy-row">
                <input
                  type="text"
                  className="url-input"
                  value={displayUrl}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  className={`copy-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="instruction-box">
              <div className="instruction-item">
                <span className="step-num">1</span>
                <span>Send this URL link to your friend or collaborator.</span>
              </div>
              <div className="instruction-item">
                <span className="step-num">2</span>
                <span>Have them click <strong>"Join Shared Project"</strong> in their Forma app.</span>
              </div>
              <div className="instruction-item">
                <span className="step-num">3</span>
                <span>Edit notes together with <strong>Live Cursors & Name Tags</strong>!</span>
              </div>
            </div>

            <div className="share-modal-footer">
              {target?.isShared && onStopHostNote && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={async () => {
                    await onStopHostNote(target as Note);
                    onClose();
                  }}
                >
                  Stop Sharing
                </button>
              )}
              <button type="button" className="primary-modal-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="share-modal-body" onSubmit={handleJoinSubmit}>
            <div className="status-banner info">
              <ShieldCheck size={16} />
              <div>
                <strong>Connect to Peer Session</strong>
                <p>Paste the live tunnel link shared by your host to connect seamlessly.</p>
              </div>
            </div>


            <div className="field-group">
              <label className="field-label">Shared Tunnel URL</label>
              <div className="input-with-icon">
                <LinkIcon size={15} className="input-icon" />
                <input
                  type="text"
                  className="url-input with-icon"
                  placeholder="https://...loca.lt or ws://127.0.0.1:1234"
                  value={joinUrlInput}
                  onChange={(e) => setJoinUrlInput(e.target.value)}
                  autoFocus
                />
              </div>
              {joinError && <div className="field-error">{joinError}</div>}
            </div>

            <div className="share-modal-footer">
              <button type="button" className="secondary-modal-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="primary-modal-btn"
                disabled={isSubmitting || !joinUrlInput.trim()}
              >
                {isSubmitting ? "Connecting..." : "Join & Sync"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
