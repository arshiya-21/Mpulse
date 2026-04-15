import { useState, useCallback } from 'react';

// ── Colors ────────────────────────────────────────────────────
export const COLORS = ['#4f46e5','#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777'];
export const PIE_CLR = ['#4f46e5','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#2563eb'];

export const LICENSE_COLORS = {
  active:   { bg:'#d1fae5', color:'#065f46' },
  expired:  { bg:'#fee2e2', color:'#991b1b' },
  inactive: { bg:'#f3f4f6', color:'#6b7280' },
};

// ── Project statuses ──────────────────────────────────────────
export const ALL_STATUSES = ['Not Started','In Progress','On Hold','Completed','Cancelled'];
export const PSTATS = ['All','Not Started','In Progress','On Hold','Completed','Cancelled'];

export const STATUS_CFG = {
  'Not Started': { bg:'#f3f4f6',  color:'#374151' },
  'In Progress': { bg:'#dbeafe',  color:'#1e40af' },
  'On Hold':     { bg:'#fef9c3',  color:'#92400e' },
  'Completed':   { bg:'#d1fae5',  color:'#065f46' },
  'Cancelled':   { bg:'#fee2e2',  color:'#991b1b' },
};

// ── Visit constants ────────────────────────────────────────────
export const VISIT_STATUSES  = ['All','Scheduled','Completed','Cancelled','No Show'];
export const VISIT_CHANNELS  = ['In-Person','Phone','Video Call','Email','WhatsApp','Other'];
export const STATUS_STYLE = {
  'Scheduled':  { bg:'#dbeafe', c:'#1e40af' },
  'Completed':  { bg:'#d1fae5', c:'#065f46' },
  'Cancelled':  { bg:'#fee2e2', c:'#991b1b' },
  'No Show':    { bg:'#fef9c3', c:'#92400e' },
};

// ── Work log types ─────────────────────────────────────────────
export const WTYPES = ['All','Development','Testing','Meeting','Support','Design','Documentation','Other'];

// ── Common style helpers ───────────────────────────────────────
export const inputS = {
  width:'100%', padding:'8px 11px', fontSize:13,
  border:'1px solid #d1d5db', borderRadius:6, outline:'none',
  background:'#fff', color:'#111827', boxSizing:'border-box'
};

export const labelS = {
  fontSize:12, fontWeight:500, color:'#374151',
  display:'block', marginBottom:4
};

// ── selS (filter/select style) ────────────────────────────────
export const selS = {
  padding:'6px 9px', fontSize:12, border:'1px solid #e4e7ec',
  borderRadius:6, background:'#fff', color:'#111827',
  outline:'none', cursor:'pointer'
};

// ── SC2 / SC2C (section card) ──────────────────────────────────
export const SC2 = { background:'#fff', borderRadius:12, border:'1px solid #e4e7ec', padding:'18px 20px' };
export const SC2C = { background:'#fff', borderRadius:12, border:'1px solid #e4e7ec', padding:'18px 20px', marginBottom:16 };

// ── Toast ──────────────────────────────────────────────────────
export function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}

export function Toast({ toast }) {
  if (!toast) return null;
  const colors = {
    success: { bg:'#d1fae5', border:'#6ee7b7', color:'#065f46' },
    error:   { bg:'#fee2e2', border:'#fca5a5', color:'#991b1b' },
    info:    { bg:'#dbeafe', border:'#93c5fd', color:'#1e40af' },
  };
  const c = colors[toast.type] || colors.info;
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:9999,
      background:c.bg, border:`1px solid ${c.border}`, color:c.color,
      borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:500,
      boxShadow:'0 4px 16px rgba(0,0,0,0.10)', maxWidth:360,
      animation:'fadeIn 0.2s ease'
    }}>
      {toast.message}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ size = 20, color = '#4f46e5' }) {
  return (
    <div style={{
      width:size, height:size, border:`2px solid #e5e7eb`,
      borderTopColor:color, borderRadius:'50%',
      animation:'spin 0.7s linear infinite', display:'inline-block'
    }}/>
  );
}

// ── Pb (Progress bar) ──────────────────────────────────────────
export function Pb({ value, color = '#4f46e5', height = 6 }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div style={{background:'#e5e7eb', borderRadius:999, height, overflow:'hidden'}}>
      <div style={{width:`${pct}%`, background:color, height:'100%', borderRadius:999, transition:'width 0.3s ease'}}/>
    </div>
  );
}

// ── StatusDrop (project status dropdown) ──────────────────────
export function StatusDrop({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...selS, background: STATUS_CFG[value]?.bg || '#f3f4f6', color: STATUS_CFG[value]?.color || '#374151', fontWeight:600, fontSize:11, padding:'3px 8px', borderRadius:20 }}>
      {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
    </select>
  );
}

// ── Modal ──────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{background:'#fff',borderRadius:16,width,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid #e4e7ec'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#111827'}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:20,lineHeight:1,padding:'0 4px'}}>×</button>
        </div>
        <div style={{padding:'20px 22px'}}>{children}</div>
      </div>
    </div>
  );
}
