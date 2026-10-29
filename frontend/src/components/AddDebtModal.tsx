import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { DebtDirection, DebtDraft } from "../types";

interface AddDebtModalProps { onClose: () => void; onSubmit: (draft: DebtDraft) => void }

export function AddDebtModal({ onClose, onSubmit }: AddDebtModalProps) {
  const [personName, setPersonName] = useState("");
  const [direction, setDirection] = useState<DebtDirection>("owed_to_me");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [amountError, setAmountError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setAmountError("Enter an amount greater than zero.");
      return;
    }
    onSubmit({ personName: personName.trim(), direction, amount: numericAmount, description: description.trim(), dueDate, notes: notes.trim() || undefined });
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-debt-title">
      <div className="modal-heading"><div><span className="modal-eyebrow">NEW RECORD</span><h2 id="add-debt-title">Add a debt</h2><p>Keep a clear record of what is owed.</p></div><button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>
      <form onSubmit={handleSubmit}>
        <label className="form-field"><span>Person's name <b>*</b></span><input autoFocus required maxLength={80} placeholder="e.g. Chinedu Okafor" value={personName} onChange={(event) => setPersonName(event.target.value)} /></label>
        <fieldset className="form-field direction-field"><legend>Debt direction <b>*</b></legend><div className="direction-options">
          <label className={`direction-option ${direction === "owed_to_me" ? "selected" : ""}`}><input type="radio" name="direction" value="owed_to_me" checked={direction === "owed_to_me"} onChange={() => setDirection("owed_to_me")} /><span>They owe me</span></label>
          <label className={`direction-option ${direction === "i_owe" ? "selected" : ""}`}><input type="radio" name="direction" value="i_owe" checked={direction === "i_owe"} onChange={() => setDirection("i_owe")} /><span>I owe them</span></label>
        </div></fieldset>
        <div className="form-row"><label className="form-field"><span>Amount (NGN) <b>*</b></span><div className="amount-input"><span>₦</span><input type="number" required min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => { setAmount(event.target.value); setAmountError(""); }} /></div>{amountError && <small className="field-error">{amountError}</small>}</label>
          <label className="form-field"><span>Due date <b>*</b></span><input type="date" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
        <label className="form-field"><span>Description <b>*</b></span><input required maxLength={100} placeholder="What is this debt for?" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="form-field"><span>Notes <em>Optional</em></span><textarea rows={3} maxLength={400} placeholder="Add any helpful details..." value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Add debt</button></div>
      </form>
    </section>
  </div>;
}