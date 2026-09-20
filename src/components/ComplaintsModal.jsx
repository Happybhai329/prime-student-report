import React, { useState } from 'react';
import { X, AlertCircle, Send, CheckCircle2 } from 'lucide-react';

export default function ComplaintsModal({
  isOpen,
  onClose,
  student,
  teacher,
  onComplaintSubmitted,
  onShowToast
}) {
  if (!isOpen || !student) return null;

  const today = new Date().toISOString().split('T')[0];
  const [complaintText, setComplaintText] = useState('');
  const [status, setStatus] = useState('Pending');
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complaintText.trim()) {
      setError('Please enter remarks or complaint details.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        studentId: student.studentId,
        studentName: student.studentName,
        batch: student.batch,
        teacherName: teacher?.name || 'Faculty',
        teacherEmployeeId: teacher?.employeeId || '',
        department: teacher?.department || 'Academic',
        complaintText: complaintText.trim(),
        status,
        date
      };

      const res = await fetch(`/api/students/${encodeURIComponent(student.studentId)}/complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit complaint.');
      }

      onShowToast?.('Complaint recorded and queued for Google Sheets sync!', 'success');
      onComplaintSubmitted?.(data.complaint);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Record Complaint / Remark</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              For {student.studentName} (ID: {student.studentId})
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            style={{ width: '36px', height: '36px' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--danger-light)',
                  border: '1px solid var(--danger-stroke)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Incident Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Action Taken">Action Taken</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Complaint / Observation Remarks</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Describe the disciplinary issue, academic deficiency, or observation note..."
                value={complaintText}
                onChange={(e) => {
                  setComplaintText(e.target.value);
                  if (error) setError('');
                }}
                style={{ resize: 'vertical', minHeight: '100px' }}
                required
              />
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                background: 'var(--surface)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)'
              }}
            >
              Reporting Faculty: <strong>{teacher?.name || 'Staff'}</strong> ({teacher?.employeeId || 'N/A'}) &bull; Department: {teacher?.department || 'Academic'}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit & Outbox Sync</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
