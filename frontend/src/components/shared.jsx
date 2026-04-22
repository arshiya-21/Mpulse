import { useState, useCallback, useRef, useEffect } from 'react';

export const PAGE_SIZE = 10;
export function Pager({page,setPage,total,pageSize:ps}){
  const sz=ps||PAGE_SIZE;
  const pages=Math.ceil(total/sz);
  if(pages<=1)return null;
  const from=(page-1)*sz+1;
  const to=Math.min(page*sz,total);
  const btn={width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5,border:"1px solid #e4e7ec",background:"#fff",cursor:"pointer",color:"#4b5563",fontWeight:700,fontSize:12,flexShrink:0};
  const dis={...btn,background:"#f8f9fb",color:"#d1d5db",cursor:"default"};
  const first=page===1,last=page===pages;
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,padding:"8px 14px",borderTop:"1px solid #f0f2f5"}}>
      <span style={{fontSize:12,color:"#6b7280",marginRight:6}}>{from}–{to} of {total}</span>
      <button style={first?dis:btn} disabled={first} onClick={()=>setPage(1)} title="First">⏮</button>
      <button style={first?dis:btn} disabled={first} onClick={()=>setPage(p=>p-1)} title="Previous">◀</button>
      <button style={last?dis:btn} disabled={last} onClick={()=>setPage(p=>p+1)} title="Next">▶</button>
      <button style={last?dis:btn} disabled={last} onClick={()=>setPage(pages)} title="Last">⏭</button>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────
export function Tooltip({ text, children, placement = 'top' }) {
  const [show, setShow] = useState(false);
  const above = placement !== 'bottom';
  const tipStyle = {
    position:"absolute",
    [above ? "bottom" : "top"]: "calc(100% + 7px)",
    left:"50%",
    transform:"translateX(-50%)",
    background:"#1f2937",
    color:"#fff",
    padding:"4px 10px",
    borderRadius:5,
    fontSize:11,
    fontWeight:500,
    whiteSpace:"nowrap",
    pointerEvents:"none",
    zIndex:200,
    boxShadow:"0 2px 8px rgba(0,0,0,.22)",
  };
  const arrowStyle = {
    position:"absolute",
    [above ? "top" : "bottom"]:"100%",
    left:"50%",
    transform:"translateX(-50%)",
    borderLeft:"5px solid transparent",
    borderRight:"5px solid transparent",
    [above ? "borderTop" : "borderBottom"]:"5px solid #1f2937",
  };
  return (
    <div style={{position:"relative",display:"inline-flex"}}
      onMouseEnter={()=>setShow(true)}
      onMouseLeave={()=>setShow(false)}
    >
      {children}
      {show&&text&&(
        <div style={tipStyle}>
          {text}
          <div style={arrowStyle}/>
        </div>
      )}
    </div>
  );
}

// ── Formula evaluator ─────────────────────────────────────────
// Safely evaluates a math expression string with named variables.
// e.g. evalFormula("spent_mins / daily_target * 100", {spent_mins:300, daily_target:510}) → 58.82
export function evalFormula(expr, vars = {}) {
  try {
    const result = new Function(...Object.keys(vars), `"use strict"; return +(${expr});`)(...Object.values(vars));
    return isFinite(result) && !isNaN(result) ? Math.round(result * 100) / 100 : 0;
  } catch { return 0; }
}

// ── Searchable Select ─────────────────────────────────────────
// options: [{value, label}]
// groups:  [{label, options:[{value, label}]}]  (optional, appended after options)
export function SearchSelect({value,onChange,options=[],groups=[],placeholder="Select",disabledPlaceholder,disabled,style={}}){
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const ref=useRef(null);

  useEffect(()=>{
    function handler(e){ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[]);

  const allOpts=[...options,...groups.flatMap(g=>g.options)];
  const selected=allOpts.find(o=>String(o.value)===String(value));
  const ql=q.toLowerCase();

  const filtOpts=options.filter(o=>o.label.toLowerCase().includes(ql));
  const filtGroups=groups.map(g=>({...g,options:g.options.filter(o=>o.label.toLowerCase().includes(ql))})).filter(g=>g.options.length>0);

  const baseStyle={
    position:"relative",width:"100%",boxSizing:"border-box",
    border:"1px solid #d1d5db",borderRadius:6,background:disabled?"#f9fafb":"#fff",
    cursor:disabled?"not-allowed":"pointer",fontSize:13,...style,
    padding:0,
  };
  const rowStyle={padding:"7px 10px",cursor:"pointer",fontSize:13,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"};
  const groupLabelStyle={padding:"5px 10px 3px",fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",background:"#f8f9fb",borderTop:"1px solid #f0f2f5",borderBottom:"1px solid #f0f2f5"};

  return(
    <div ref={ref} style={baseStyle}>
      <div
        onClick={()=>{ if(!disabled){setOpen(o=>!o); setQ("");} }}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",minHeight:36,color:selected?"#111827":"#9ca3af",userSelect:"none"}}
      >
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
          {disabled?(disabledPlaceholder||placeholder):selected?selected.label:placeholder}
        </span>
        <span style={{marginLeft:6,fontSize:10,color:"#9ca3af",flexShrink:0}}>{open?"▲":"▼"}</span>
      </div>
      {open&&!disabled&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:9999,background:"#fff",border:"1px solid #d1d5db",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,.12)",marginTop:2,maxHeight:240,overflowY:"auto"}}>
          <div style={{padding:"6px 8px",borderBottom:"1px solid #f0f2f5",position:"sticky",top:0,background:"#fff",zIndex:1}}>
            <input
              autoFocus
              value={q}
              onChange={e=>setQ(e.target.value)}
              onClick={e=>e.stopPropagation()}
              placeholder="Search..."
              style={{width:"100%",boxSizing:"border-box",border:"1px solid #e4e7ec",borderRadius:5,padding:"5px 8px",fontSize:12,outline:"none"}}
            />
          </div>
          {filtOpts.length===0&&filtGroups.length===0&&(
            <div style={{padding:"10px",color:"#9ca3af",fontSize:12,textAlign:"center"}}>No results</div>
          )}
          {filtOpts.map(o=>(
            <div key={o.value} onMouseDown={()=>{onChange(o.value);setOpen(false);setQ("");}}
              style={{...rowStyle,background:String(o.value)===String(value)?"#ede9fe":"transparent"}}
              onMouseEnter={e=>e.currentTarget.style.background=String(o.value)===String(value)?"#ede9fe":"#f5f3ff"}
              onMouseLeave={e=>e.currentTarget.style.background=String(o.value)===String(value)?"#ede9fe":"transparent"}
            >{o.label}</div>
          ))}
          {filtGroups.map(g=>(
            <div key={g.label}>
              <div style={groupLabelStyle}>{g.label}</div>
              {g.options.map(o=>(
                <div key={o.value} onMouseDown={()=>{onChange(o.value);setOpen(false);setQ("");}}
                  style={{...rowStyle,paddingLeft:16,color:"#6b7280",background:String(o.value)===String(value)?"#ede9fe":"transparent"}}
                  onMouseEnter={e=>e.currentTarget.style.background=String(o.value)===String(value)?"#ede9fe":"#f5f3ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=String(o.value)===String(value)?"#ede9fe":"transparent"}
                >{o.label}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
export const VISIT_STATUSES  = ['Planned','In Progress','Completed','Pending','Rescheduled','Cancelled'];
export const VISIT_CHANNELS  = ['Email','WhatsApp','Phone Call','SMS','On-Site Request'];
export const STATUS_STYLE = {
  'Planned':     { bg:'#dbeafe', c:'#1e40af' },
  'In Progress': { bg:'#fff7ed', c:'#c2410c' },
  'Completed':   { bg:'#d1fae5', c:'#065f46' },
  'Pending':     { bg:'#fef9c3', c:'#92400e' },
  'Rescheduled': { bg:'#ede9fe', c:'#5b21b6' },
  'Cancelled':   { bg:'#fee2e2', c:'#991b1b' },
};

// ── Work log types ─────────────────────────────────────────────
export const WTYPES = ['On Demand','Planned','Ad-hoc','Maintenance'];

// ── Shared date formatter → dd-mm-yyyy ────────────────────────
export function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${dt.getUTCFullYear()}`;
  } catch { return String(d).slice(0, 10); }
}

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
  const [msg, setMsg] = useState(null);
  const show = useCallback((message, type = 'success') => {
    setMsg({ message, type });
    setTimeout(() => setMsg(null), 3000);
  }, []);
  return { msg, show };
}

export function Toast({ msg }) {
  if (!msg) return null;
  const colors = {
    success: { bg:'#d1fae5', border:'#6ee7b7', color:'#065f46' },
    error:   { bg:'#fee2e2', border:'#fca5a5', color:'#991b1b' },
    info:    { bg:'#dbeafe', border:'#93c5fd', color:'#1e40af' },
  };
  const c = colors[msg.type] || colors.info;
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:9999,
      background:c.bg, border:`1px solid ${c.border}`, color:c.color,
      borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:500,
      boxShadow:'0 4px 16px rgba(0,0,0,0.10)', maxWidth:360,
      animation:'fadeIn 0.2s ease'
    }}>
      {msg.message}
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

// ── LoadingBox (centered loading state for tables/sections) ────
export function LoadingBox({ text = 'Loading…' }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:12, padding:'48px 24px',
      background:'#fff', borderRadius:10, border:'1px solid #e4e7ec',
      color:'#6b7280', fontSize:13, fontWeight:500
    }}>
      <Spinner size={32} />
      <span>{text}</span>
    </div>
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
