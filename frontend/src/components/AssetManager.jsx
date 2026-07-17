import { useState, useMemo, useRef, useEffect } from "react";
import * as assetsApi from "../api/assets";
import * as employeesApi from "../api/employees";
import * as deptApi from "../api/departments";

// ─── STYLES ──────────────────────────────────────────────────────────────────
const inputS={width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e4e7ec",borderRadius:7,background:"#fff",color:"#111827",outline:"none",boxSizing:"border-box"};
const labelS={fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"};
const selS={padding:"6px 9px",fontSize:12,border:"1px solid #e4e7ec",borderRadius:6,background:"#fff",color:"#111827",outline:"none",cursor:"pointer"};

const DEFAULT_ASSET_TYPES=[
  {name:"Laptop",icon:"💻"},
  {name:"Desktop",icon:"🖥️"},
  {name:"Monitor",icon:"🖥️"},
  {name:"Mobile Phone",icon:"📱"},
  {name:"Tablet",icon:"📱"},
  {name:"Printer",icon:"🖨️"},
  {name:"UPS",icon:"🔋"},
  {name:"Keyboard",icon:"⌨️"},
  {name:"Other",icon:"📦"},
];
const CONDITIONS=["New","Good","Fair","Poor"];

const ICON_PALETTE=[
  "💻","📱","🔲","🖨️","🗂️","🌐","🔋","💾","📷","⌨️",
  "🎧","🪑","🖥️","❄️","📦","🔧","🖼️","📺","🎙️","🔌",
  "📶","🖌️","💡","📊","📅","💼","⚙️","🎨","🗄️","🚗"
];const STATUSES=["In Use","Available","Under Repair","Sent for Service","Disposed","Lost"];

function isExpired(dateStr){
  if(!dateStr) return false;
  return new Date(dateStr) < new Date();
}
function fmtINR(n){
  if(n==null||n==="") return "—";
  const v=Number(n);
  if(v>=100000) return "₹"+(v/100000).toFixed(v%100000===0?0:1)+"L";
  if(v>=1000) return "₹"+Math.round(v/1000)+"K";
  return "₹"+v;
}
function fmtFullINR(n){
  if(n==null||n==="") return "—";
  return "₹"+Number(n).toLocaleString("en-IN");
}
function initials(name){
  if(!name) return "?";
  return name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
}
function daysAgo(dateStr){
  if(!dateStr) return 0;
  return Math.max(0,Math.floor((Date.now()-new Date(dateStr).getTime())/86400000));
}
function todayStr(){
  return new Date().toISOString().slice(0,10);
}
function mapAssetFromApi(a){
  return {
    id:a.id, name:a.name, code:a.code, type:a.type, brand:a.brand, model:a.model,
    assignee:a.assignee, dept:a.department, status:a.status,
    purchased:a.purchased?String(a.purchased).slice(0,10):a.purchased,
    warranty:a.warranty?String(a.warranty).slice(0,10):a.warranty,
    value:a.cost, condition:a.condition, vendor:a.vendor,
    location:a.location, notes:a.notes,
    history:(a.history||[]).map(h=>({from:h.from_employee,to:h.to_employee,date:h.transfer_date?String(h.transfer_date).slice(0,10):h.transfer_date,reason:h.reason,by:h.transferred_by})),
    serviceLogs:(a.serviceLogs||[]).map(l=>({date:l.service_date?String(l.service_date).slice(0,10):l.service_date,issue:l.issue,action:l.action_taken,servicedBy:l.serviced_by,cost:l.cost})),
  };
}
function mapFormToApi(form){
  return {
    id:form.asset_id, name:form.name, code:form.serial, type:form.type,
    brand:form.brand, model:form.model, condition:form.condition,
    purchased:form.purchase_date||null, warranty:form.warranty_expiry||null,
    cost:Number(form.cost)||0, vendor:form.vendor, status:form.status,
    assignee:form.assigned_to||null, department:form.department||null,
    location:form.location||null, notes:form.notes||null,
  };
}

// ─── ADD / EDIT ASSET MODAL ───────────────────────────────────────────────────
function AssetModal({open,onClose,onSave,nextId,editing,types,employees,departments}){
    const blank={
    name:"",asset_id:nextId,type:"Laptop",brand:"",model:"",serial:"",condition:"New",
    purchase_date:"",cost:"",vendor:"",warranty_expiry:"",status:"Available",assigned_to:"",
    department:"",location:"",notes:""
  };
  const [form,setForm]=useState(editing||blank);

  useEffect(()=>{
    if(open){ setForm(editing||blank); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open,editing]);

  if(!open) return null;

  function set(k,v){ setForm(prev=>({...prev,[k]:v})); }

  function submit(){
    if(!form.name.trim()){ alert("Asset Name is required"); return; }
    onSave(form);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,17,23,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:820,maxWidth:"92vw",maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:"1px solid #f0f2f5"}}>
          <span style={{fontSize:17,fontWeight:700,color:"#111827"}}>{editing?"Edit Asset":"Add New Asset"}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>

        <div style={{padding:"20px 24px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:18}}>
          {/* ASSET INFORMATION */}
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#4f46e5",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Asset Information</div>
            <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:14}}>
              <label style={labelS}>Asset Name *</label>
              <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Dell Latitude 5520 — Ravi's Laptop" style={inputS}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Asset ID</label>
                <input value={form.asset_id} readOnly style={{...inputS,background:"#f8f9fb",color:"#9ca3af"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Asset Type</label>
                <select value={form.type} onChange={e=>set("type",e.target.value)} style={inputS}>
                  {types.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Brand</label>
                <input value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder="e.g. Dell" style={inputS}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Model</label>
                <input value={form.model} onChange={e=>set("model",e.target.value)} placeholder="e.g. Latitude 5520" style={inputS}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Serial Number</label>
                <input value={form.serial} onChange={e=>set("serial",e.target.value)} style={inputS}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Condition</label>
                <select value={form.condition} onChange={e=>set("condition",e.target.value)} style={inputS}>
                  {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* PURCHASE & WARRANTY */}
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#4f46e5",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12,paddingTop:6,borderTop:"1px solid #f0f2f5"}}>Purchase & Warranty</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Purchase Date</label>
                <input type="date" value={form.purchase_date} onChange={e=>set("purchase_date",e.target.value)} style={inputS}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Cost (₹)</label>
                <input type="number" value={form.cost} onChange={e=>set("cost",e.target.value)} placeholder="0" style={inputS}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Vendor</label>
                <input value={form.vendor} onChange={e=>set("vendor",e.target.value)} style={inputS}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Warranty Expiry</label>
                <input type="date" value={form.warranty_expiry} onChange={e=>set("warranty_expiry",e.target.value)} style={inputS}/>
              </div>
            </div>
          </div>

          {/* ASSIGNMENT */}
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#4f46e5",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12,paddingTop:6,borderTop:"1px solid #f0f2f5"}}>Assignment</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Status</label>
                <select value={form.status} onChange={e=>set("status",e.target.value)} style={inputS}>
                  {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Assigned To</label>
                <select value={form.assigned_to} onChange={e=>set("assigned_to",e.target.value)} style={inputS}>
                  <option value="">Unassigned</option>
                  {employees.map(e=><option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Department</label>
                <select value={form.department} onChange={e=>set("department",e.target.value)} style={inputS}>
                  <option value="">-- Select --</option>
                  {(departments||[]).map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Location</label>
                <input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="e.g. Chennai Office" style={inputS}/>
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#4f46e5",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12,paddingTop:6,borderTop:"1px solid #f0f2f5"}}>Notes</div>
            <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Any additional notes about this asset…" style={{...inputS,resize:"vertical",fontFamily:"inherit"}}/>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={onClose} style={{padding:"9px 16px",borderRadius:7,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={submit} style={{padding:"9px 18px",borderRadius:7,border:"none",background:"#2563eb",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{editing?"Save Changes":"Add Asset"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ASSET TYPE MASTER MODAL ───────────────────────────────────────────────
function TypeMasterModal({open,onClose,types,setTypes}){
  const [editIdx,setEditIdx]=useState(null);
  const [adding,setAdding]=useState(false);
  const [tempName,setTempName]=useState("");
  const [tempIcon,setTempIcon]=useState("");
  const [customIcons,setCustomIcons]=useState([]);
  const [customInput,setCustomInput]=useState("");

  // ── auto-scroll refs ──────────────────────────────────────────────────
  const listContainerRef=useRef(null);   // the scrollable area holding the type rows + panel
  const lastItemRef=useRef(null);        // ref attached to the last row in the list
  const prevLengthRef=useRef(types.length);
  const justAddedRef=useRef(false);      // flips true right after a successful "Add Type"

  useEffect(()=>{
    if(types.length>prevLengthRef.current && justAddedRef.current){
      // a new type was appended — scroll it into view
      requestAnimationFrame(()=>{
        if(lastItemRef.current){
          lastItemRef.current.scrollIntoView({behavior:"smooth",block:"nearest"});
        } else if(listContainerRef.current){
          listContainerRef.current.scrollTop=listContainerRef.current.scrollHeight;
        }
      });
      justAddedRef.current=false;
    }
    prevLengthRef.current=types.length;
  },[types.length]);

  if(!open) return null;

  const panelOpen = adding || editIdx!==null;

  function startEdit(i){ setEditIdx(i); setAdding(false); setTempName(types[i].name); setTempIcon(types[i].icon); }
  function startAdd(){ setAdding(true); setEditIdx(null); setTempName(""); setTempIcon("📦"); }
  function cancelPanel(){ setEditIdx(null); setAdding(false); }
  function savePanel(){
    if(!tempName.trim()){ alert("Type name is required"); return; }
    if(adding){
      justAddedRef.current=true; // signal the effect above to scroll once the new row renders
      setTypes(prev=>[...prev,{name:tempName.trim(),icon:tempIcon||"📦"}]);
    } else {
      setTypes(prev=>prev.map((t,i)=>i===editIdx?{name:tempName.trim(),icon:tempIcon||"📦"}:t));
    }
    setEditIdx(null); setAdding(false);
  }
  function removeType(i){
    if(!confirm(`Remove "${types[i].name}"? Existing assets already using this type won't be changed.`)) return;
    setTypes(prev=>prev.filter((_,idx)=>idx!==i));
  }
  function addCustomIcon(){
    const v=customInput.trim();
    if(!v) return;
    setCustomIcons(prev=>[...new Set([v,...prev])].slice(0,6));
    setTempIcon(v);
    setCustomInput("");
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,17,23,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:600,maxWidth:"92vw",maxHeight:"86vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:"1px solid #f0f2f5"}}>
          <span style={{fontSize:17,fontWeight:700,color:"#111827"}}>Asset Type Master</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>

        <div ref={listContainerRef} style={{padding:"6px 24px 16px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12.5,color:"#6b7280",padding:"8px 0 4px"}}>
            Add, edit or remove asset type categories. Changes apply to all asset dropdowns immediately.
          </div>
          {types.map((t,i)=>(
            <div key={i} ref={i===types.length-1?lastItemRef:null} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",border:editIdx===i?"1px solid #93c5fd":"1px solid #f0f2f5",background:editIdx===i?"#eff6ff":"#fff",borderRadius:8}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:20}}>{t.icon}</span>
                <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>{t.name}</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>startEdit(i)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer"}}>Edit</button>
                <button onClick={()=>removeType(i)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #fca5a5",background:"#fff",color:"#dc2626",fontSize:12,fontWeight:600,cursor:"pointer"}}>Remove</button>
              </div>
            </div>
          ))}

          {panelOpen && (
            <div style={{marginTop:8,border:"1px solid #e4e7ec",borderRadius:10,padding:16,background:"#fafbfc"}}>
              <div style={{...labelS,marginBottom:10}}>{adding?"Add Type":"Edit Type"}</div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:6,maxHeight:130,overflowY:"auto",marginBottom:12}}>
                {ICON_PALETTE.map(ic=>(
                  <button key={ic} onClick={()=>setTempIcon(ic)} style={{
                    fontSize:17,padding:"7px 0",borderRadius:7,cursor:"pointer",
                    border:tempIcon===ic?"2px solid #2563eb":"1px solid #e4e7ec",
                    background:tempIcon===ic?"#dbeafe":"#fff"
                  }}>{ic}</button>
                ))}
              </div>

              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:6}}>Custom icon:</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                {customIcons.map(ic=>(
                  <button key={ic} onClick={()=>setTempIcon(ic)} style={{
                    fontSize:17,width:36,height:36,borderRadius:7,cursor:"pointer",
                    border:tempIcon===ic?"2px solid #2563eb":"1px solid #e4e7ec",
                    background:tempIcon===ic?"#dbeafe":"#fff"
                  }}>{ic}</button>
                ))}
                <input value={customInput} onChange={e=>setCustomInput(e.target.value)} placeholder="Paste an emoji"
                  style={{...inputS,width:140,padding:"7px 10px"}}/>
                <button onClick={addCustomIcon} style={{padding:"7px 12px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer"}}>Use</button>
              </div>

              <div style={{...labelS,marginBottom:4}}>Type Name *</div>
              <input value={tempName} onChange={e=>setTempName(e.target.value)} placeholder="e.g. Office Chair" style={{...inputS,marginBottom:14}} autoFocus/>

              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={cancelPanel} style={{padding:"9px 16px",borderRadius:7,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                <button onClick={savePanel} style={{padding:"9px 18px",borderRadius:7,border:"none",background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save Changes</button>
              </div>
            </div>
          )}
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",borderTop:"1px solid #f0f2f5"}}>
          <span style={{fontSize:12.5,color:"#6b7280",fontWeight:600}}>{types.length} types</span>
          <div style={{display:"flex",gap:8}}>
            {!panelOpen && <button onClick={startAdd} style={{padding:"9px 16px",borderRadius:7,border:"none",background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add New Type</button>}
            <button onClick={onClose} style={{padding:"9px 16px",borderRadius:7,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TRANSFER ASSET MODAL ───────────────────────────────────────────────────
function TransferModal({open,asset,employees,typeIcon,onClose,onSubmit}){
  const [to,setTo]=useState("");
  const [date,setDate]=useState(todayStr());
  const [reason,setReason]=useState("");

  useEffect(()=>{
    if(open){ setTo(""); setDate(todayStr()); setReason(""); }
  },[open,asset&&asset.id]);

  if(!open||!asset) return null;

  function submit(){
    if(!to){ alert("Please select an employee to transfer to"); return; }
    onSubmit({to,date,reason:reason.trim()});
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,17,23,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:520,maxWidth:"92vw",boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:"1px solid #f0f2f5"}}>
          <span style={{fontSize:17,fontWeight:700,color:"#111827"}}>Transfer Asset — {asset.id}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,background:"#f8f9fb",border:"1px solid #f0f2f5",borderRadius:8,padding:12}}>
            <div style={{width:40,height:40,borderRadius:8,background:"#eef2ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{typeIcon}</div>
            <div>
              <div style={{fontWeight:700,color:"#111827",fontSize:14}}>{asset.name}</div>
              <div style={{fontSize:12,color:"#6b7280"}}>{asset.id} · Currently with: {asset.assignee||"Unassigned"}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Transfer To *</label>
            <select value={to} onChange={e=>setTo(e.target.value)} style={inputS}>
              <option value="">-- Select Employee --</option>
              {employees.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Transfer Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputS}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Reason</label>
            <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="e.g. Role change, Department transfer..." style={{...inputS,resize:"vertical",fontFamily:"inherit"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={onClose} style={{padding:"9px 16px",borderRadius:7,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={submit} style={{padding:"9px 18px",borderRadius:7,border:"none",background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Transfer</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOG SERVICE MODAL ──────────────────────────────────────────────────────
function ServiceModal({open,asset,onClose,onSubmit}){
  const [date,setDate]=useState(todayStr());
  const [issue,setIssue]=useState("");
  const [action,setAction]=useState("");
  const [servicedBy,setServicedBy]=useState("");
  const [cost,setCost]=useState("");

  useEffect(()=>{
    if(open){ setDate(todayStr()); setIssue(""); setAction(""); setServicedBy(""); setCost(""); }
  },[open,asset&&asset.id]);

  if(!open||!asset) return null;

  function submit(){
    if(!issue.trim()){ alert("Issue is required"); return; }
    onSubmit({date,issue:issue.trim(),action:action.trim(),servicedBy:servicedBy.trim(),cost:Number(cost)||0});
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,17,23,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:520,maxWidth:"92vw",boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:"1px solid #f0f2f5"}}>
          <span style={{fontSize:17,fontWeight:700,color:"#111827"}}>Log Service — {asset.id}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"#f8f9fb",border:"1px solid #f0f2f5",borderRadius:8,padding:12}}>
            <div style={{fontWeight:700,color:"#111827",fontSize:14}}>{asset.name}</div>
            <div style={{fontSize:12,color:"#6b7280"}}>{asset.id} · {asset.type}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputS}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Issue *</label>
            <textarea value={issue} onChange={e=>setIssue(e.target.value)} rows={2} style={{...inputS,resize:"vertical",fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Action Taken</label>
            <textarea value={action} onChange={e=>setAction(e.target.value)} rows={2} style={{...inputS,resize:"vertical",fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Serviced By</label>
              <input value={servicedBy} onChange={e=>setServicedBy(e.target.value)} placeholder="IT Team" style={inputS}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Cost (₹)</label>
              <input type="number" value={cost} onChange={e=>setCost(e.target.value)} placeholder="0 if internal" style={inputS}/>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={onClose} style={{padding:"9px 16px",borderRadius:7,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={submit} style={{padding:"9px 18px",borderRadius:7,border:"none",background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save Service Log</button>
        </div>
      </div>
    </div>
  );
}

// ─── ASSET DETAIL PANEL ─────────────────────────────────────────────────────
function AssetDetailPanel({asset,typeIcon,statusStyle,tab,setTab,onClose,onTransfer,onLogService,onEdit}){
  if(!asset) return null;
  const expired=isExpired(asset.warranty);
  const rawHistory=asset.history||[];
  const history = rawHistory.length>0
    ? rawHistory
    : (asset.assignee ? [{from:null,to:asset.assignee,date:asset.purchased||"—",reason:"Initial Assignment",by:"Admin"}] : []);
  const logs=asset.serviceLogs||[];
  const totalServiceCost=logs.reduce((s,l)=>s+(Number(l.cost)||0),0);

  const tabBtn=(key,label)=>(
    <div onClick={()=>setTab(key)} style={{padding:"8px 2px",cursor:"pointer",borderBottom:tab===key?"2px solid #2563eb":"2px solid transparent"}}>
      <span style={{fontSize:12.5,fontWeight:tab===key?700:500,color:tab===key?"#2563eb":"#6b7280"}}>{label}</span>
    </div>
  );

  const field=(label,value)=>(
    <div>
      <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:3}}>{label}</div>
      <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{value}</div>
    </div>
  );

  return(
    <div style={{width:380,flexShrink:0,background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:16,display:"flex",flexDirection:"column",gap:14,height:"100%",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:8,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{typeIcon}</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <span style={{fontSize:12,fontWeight:700,color:"#2563eb"}}>{asset.id}</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700,background:statusStyle.bg,color:statusStyle.c,width:"fit-content"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:statusStyle.dot}}/>{asset.status}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af"}}>✕</button>
      </div>

      <div style={{fontSize:17,fontWeight:800,color:"#111827"}}>{asset.name}</div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={onTransfer} style={{flex:1,padding:"8px 0",borderRadius:7,border:"1px solid #e4e7ec",background:"#fff",color:"#374151",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Transfer</button>
        <button onClick={onLogService} style={{flex:1,padding:"8px 0",borderRadius:7,border:"1px solid #e4e7ec",background:"#fff",color:"#374151",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Log Service</button>
        <button onClick={onEdit} style={{flex:1,padding:"8px 0",borderRadius:7,border:"1px solid #2563eb",background:"#fff",color:"#2563eb",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Edit</button>
      </div>

      <div style={{display:"flex",gap:18,borderBottom:"1px solid #e4e7ec",flexShrink:0}}>
        {tabBtn("details","Details")}
        {tabBtn("history","Transfer History")}
        {tabBtn("service","Service Log")}
      </div>

      <div style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingRight:4}}>

      {tab==="details" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {expired && (
            <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 12px",color:"#dc2626",fontSize:12.5,fontWeight:700}}>
              ⚠ Warranty expired {daysAgo(asset.warranty)} days ago
            </div>
          )}
          <div style={{background:"#f8f9fb",border:"1px solid #f0f2f5",borderRadius:8,padding:12}}>
            <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:8}}>Currently With</div>
            {asset.assignee ? (
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"#1e293b",color:"#e2e8f0",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{initials(asset.assignee)}</div>
                <div>
                  <div style={{fontWeight:700,color:"#111827",fontSize:13}}>{asset.assignee}</div>
                  {asset.dept && <div style={{fontSize:11,color:"#9ca3af"}}>{asset.dept}</div>}
                </div>
              </div>
            ):<div style={{color:"#9ca3af",fontStyle:"italic",fontSize:13}}>Unassigned</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {field("Brand",asset.brand||"—")}
            {field("Model",asset.model||"—")}
            {field("Serial No.",asset.code||"—")}
            {field("Location",asset.location||"—")}
            {field("Condition",asset.condition||"—")}
            {field("Purchased",asset.purchased||"—")}
            {field("Cost",fmtFullINR(asset.value))}
            {field("Vendor",asset.vendor||"—")}
            {field("Warranty",asset.warranty||"—")}
            {field("Service Cost",totalServiceCost>0?fmtFullINR(totalServiceCost):"Nil")}
          </div>
          {asset.notes && (
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:3}}>Notes</div>
              <div style={{fontSize:12.5,color:"#374151"}}>{asset.notes}</div>
            </div>
          )}
        </div>
      )}

      {tab==="history" && (
        history.length===0 ? (
          <div style={{color:"#9ca3af",fontSize:13,textAlign:"center",padding:"24px 0"}}>No transfers yet.</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {history.slice().reverse().map((h,i)=>(
              <div key={i} style={{display:"flex",gap:10}}>
                <div style={{width:28,height:28,borderRadius:6,background:"#eff6ff",color:"#2563eb",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:700}}>→</div>
                <div style={{flex:1,borderBottom:"1px solid #f0f2f5",paddingBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                    <span style={{fontWeight:700,fontSize:13,color:"#111827"}}>{h.from||"—"} → {h.to}</span>
                    <span style={{fontSize:11,color:"#9ca3af",whiteSpace:"nowrap"}}>{h.date}</span>
                  </div>
                  {h.reason && <div style={{fontSize:12,color:"#6b7280",fontStyle:"italic",marginTop:2}}>{h.reason}</div>}
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>by {h.by||"Admin"}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab==="service" && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 12px",fontSize:12.5,fontWeight:700,color:"#b45309"}}>
            Total service cost: {fmtFullINR(totalServiceCost)}
          </div>
          {logs.length===0 ? (
            <div style={{color:"#9ca3af",fontSize:13,textAlign:"center",padding:"24px 0"}}>No service records.</div>
          ) : logs.slice().reverse().map((l,i)=>(
            <div key={i} style={{borderBottom:"1px solid #f0f2f5",paddingBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                <span style={{fontWeight:700,fontSize:13,color:"#111827"}}>{l.issue}</span>
                <span style={{fontSize:11,color:"#9ca3af",whiteSpace:"nowrap"}}>{l.date}</span>
              </div>
              {l.action && <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{l.action}</div>}
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>By: {l.servicedBy||"—"}{l.cost?` · ₹${Number(l.cost).toLocaleString("en-IN")}`:""}</div>
            </div>
          ))}
        </div>
      )}

      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AssetManager(){
  const [assets,setAssets]=useState([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("all");
  const [search,setSearch]=useState("");
  const [typeF,setTypeF]=useState("");
  const [statusF,setStatusF]=useState("");
  const [empF,setEmpF]=useState("");
  const [modalOpen,setModalOpen]=useState(false);
  const [editing,setEditing]=useState(null);
  const [assetTypes,setAssetTypes]=useState([]);
  const [typeModalOpen,setTypeModalOpen]=useState(false);
  const [selectedId,setSelectedId]=useState(null);
  const [detailTab,setDetailTab]=useState("details");
  const [transferAssetId,setTransferAssetId]=useState(null);
  const [serviceAssetId,setServiceAssetId]=useState(null);
  const [assetPage,setAssetPage]=useState(1);
  const ASSET_PAGE_SIZE=10;
  const [employeeList,setEmployeeList]=useState([]);
  const [departmentList,setDepartmentList]=useState([]);

  useEffect(()=>{
    (async()=>{
      try{
        const [{data:assetRows},{data:typeRows},{data:empRows},{data:deptRows}] = await Promise.all([assetsApi.getAll(), assetsApi.getTypes(), employeesApi.getAll(), deptApi.getAll()]);
        setAssets(assetRows.map(mapAssetFromApi));
        setEmployeeList(empRows.map(e=>e.name).filter(Boolean));
        setDepartmentList(deptRows.map(d=>d.name).filter(Boolean));
        if(typeRows.length){
          setAssetTypes(typeRows);
        } else {
          await Promise.all(DEFAULT_ASSET_TYPES.map(t => assetsApi.createType(t)));
          setAssetTypes(DEFAULT_ASSET_TYPES);
        }
      }catch(err){
        console.error("Failed to load assets:",err);
        alert("Failed to load assets from server.");
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  const TYPES=useMemo(()=>assetTypes.map(t=>t.name),[assetTypes]);
  const TYPE_ICON=useMemo(()=>Object.fromEntries(assetTypes.map(t=>[t.name,t.icon])),[assetTypes]);

  const employees=employeeList;
  const nextId=useMemo(()=>{
    const nums=assets.map(a=>parseInt(a.id.split("-")[1],10)).filter(n=>!isNaN(n));
    const next=(nums.length?Math.max(...nums):0)+1;
    return "AST-"+String(next).padStart(4,"0");
  },[assets]);

  const warrantyAlerts=assets.filter(a=>isExpired(a.warranty));
  const availableAssets=assets.filter(a=>a.status==="Available");

  const base = tab==="available" ? availableAssets : tab==="warranty" ? warrantyAlerts : assets;
  const filtered = base.filter(a=>{
    if(search && !(a.name.toLowerCase().includes(search.toLowerCase()) || (a.code||"").toLowerCase().includes(search.toLowerCase()))) return false;
    if(typeF && a.type!==typeF) return false;
    if(statusF && a.status!==statusF) return false;
    if(empF && a.assignee!==empF) return false;
    return true;
  });

  const totalPages=Math.max(1,Math.ceil(filtered.length/ASSET_PAGE_SIZE));
  const safePage=Math.min(assetPage,totalPages);
  const paged=filtered.slice((safePage-1)*ASSET_PAGE_SIZE,safePage*ASSET_PAGE_SIZE);

  const totalValue=assets.reduce((s,a)=>s+(Number(a.value)||0),0);
  const inUseCount=assets.filter(a=>a.status==="In Use").length;
  const repairCount=assets.filter(a=>a.status==="Under Repair").length;

  function openAdd(){ setEditing(null); setModalOpen(true); }
  function openEdit(a){
    setEditing({
      name:a.name, asset_id:a.id, type:a.type, brand:a.brand||"", model:a.model||"", serial:a.code,
      condition:a.condition||"Good", purchase_date:a.purchased, cost:a.value,
      vendor:a.vendor||"", warranty_expiry:a.warranty, status:a.status, assigned_to:a.assignee||"",
      department:a.dept||"", location:a.location||"", notes:a.notes||""
    });
    setModalOpen(true);
  }
  async function saveAsset(form){
    const payload=mapFormToApi(form);
    try{
      if(editing){
        const { data } = await assetsApi.update(form.asset_id, payload);
        setAssets(prev=>prev.map(a=>a.id===data.id?mapAssetFromApi(data):a));
      } else {
        const { data } = await assetsApi.create(payload);
        setAssets(prev=>[...prev, mapAssetFromApi(data)]);
      }
      setModalOpen(false); setEditing(null);
    }catch(err){
      console.error("Failed to save asset:",err);
      alert("Failed to save asset. Please try again.");
    }
  }
  async function delAsset(id){
    if(!confirm("Delete this asset?")) return;
    try{
      await assetsApi.remove(id);
      setAssets(prev=>prev.filter(a=>a.id!==id));
      if(selectedId===id) setSelectedId(null);
    }catch(err){
      console.error("Failed to delete asset:",err);
      alert("Failed to delete asset.");
    }
  }

  async function doTransfer(form){
    try{
      await assetsApi.transfer(transferAssetId, form);
      const { data } = await assetsApi.getOne(transferAssetId);
      setAssets(prev=>prev.map(a=>a.id===transferAssetId?mapAssetFromApi(data):a));
    }catch(err){
      console.error("Failed to transfer asset:",err);
      alert("Failed to transfer asset.");
    }
    setTransferAssetId(null);
  }
  async function doService(form){
    try{
      await assetsApi.logService(serviceAssetId, form);
      const { data } = await assetsApi.getOne(serviceAssetId);
      setAssets(prev=>prev.map(a=>a.id===serviceAssetId?mapAssetFromApi(data):a));
    }catch(err){
      console.error("Failed to log service:",err);
      alert("Failed to log service.");
    }
    setServiceAssetId(null);
  }

  const selectedAsset=assets.find(a=>a.id===selectedId)||null;
  const transferAsset=assets.find(a=>a.id===transferAssetId)||null;
  const serviceAsset=assets.find(a=>a.id===serviceAssetId)||null;

  const STATUS_STYLE={
    "In Use":{bg:"#ecfdf5",c:"#059669",dot:"#059669"},
    "Available":{bg:"#eff6ff",c:"#2563eb",dot:"#2563eb"},
    "Under Repair":{bg:"#fffbeb",c:"#d97706",dot:"#d97706"},
    "Sent for Service":{bg:"#fef3c7",c:"#b45309",dot:"#b45309"},
    "Disposed":{bg:"#f3f4f6",c:"#6b7280",dot:"#6b7280"},
    "Lost":{bg:"#fee2e2",c:"#dc2626",dot:"#dc2626"},
  };

  const kpis=[
    {label:"Total",value:assets.length},
    {label:"In Use",value:inUseCount,color:"#059669"},
    {label:"Available",value:availableAssets.length,color:"#2563eb"},
    {label:"Under Repair",value:repairCount,color:"#d97706"},
    {label:"Value",value:fmtINR(totalValue),color:"#111827"},
    {label:"Warranty Alerts",value:warrantyAlerts.length,color:"#dc2626"},
  ];

  if(loading){
    return <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Loading assets…</div>;
  }

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",fontFamily:"system-ui, -apple-system, sans-serif"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"flex-end",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {kpis.map(k=>(
            <div key={k.label} style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:9,padding:"8px 14px",textAlign:"center",minWidth:64}}>
              <div style={{fontSize:17,fontWeight:800,color:k.color||"#111827"}}>{k.value}</div>
              <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,whiteSpace:"nowrap"}}>{k.label}</div>
            </div>
          ))}
          <button onClick={()=>setTypeModalOpen(true)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid #e4e7ec",background:"#fff",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Manage Types</button>
          <button onClick={openAdd} style={{padding:"10px 18px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>+ New Asset</button>
        </div>
      </div>

      <div style={{display:"flex",gap:20,borderBottom:"1px solid #e4e7ec",marginBottom:16}}>
        {[
          {key:"all",label:"All Assets",count:assets.length},
          {key:"available",label:"Available",count:availableAssets.length},
          {key:"warranty",label:"Warranty Alerts",count:warrantyAlerts.length},
        ].map(t=>(
          <div key={t.key} onClick={()=>{setTab(t.key);setAssetPage(1);}}
          style={{padding:"10px 2px",cursor:"pointer",borderBottom:tab===t.key?"2px solid #2563eb":"2px solid transparent",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13,fontWeight:tab===t.key?700:500,color:tab===t.key?"#2563eb":"#6b7280"}}>{t.label}</span>
            <span style={{fontSize:11,fontWeight:700,color:tab===t.key?"#2563eb":"#9ca3af",background:tab===t.key?"#eff6ff":"#f3f4f6",padding:"1px 7px",borderRadius:20}}>{t.count}</span>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setAssetPage(1);}} placeholder="🔍 Search assets, serial, employee…" style={{...selS,flex:1,minWidth:220,padding:"9px 12px"}}/>
        <select value={typeF} onChange={e=>{setTypeF(e.target.value);setAssetPage(1);}} style={selS}>
          <option value="">All Types</option>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusF} onChange={e=>{setStatusF(e.target.value);setAssetPage(1);}} style={selS}>
          <option value="">All Status</option>
          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={empF} onChange={e=>{setEmpF(e.target.value);setAssetPage(1);}} style={selS}>
          <option value="">All Employees</option>
          {employees.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
        <span style={{fontSize:12,color:"#9ca3af",marginLeft:"auto"}}>{filtered.length} records</span>
      </div>

      <div style={{display:"flex",gap:16,alignItems:"stretch",flex:1,minHeight:0}}>
      <div style={{flex:1,minWidth:0,background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.05)",display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
        <div style={{overflow:"auto",flex:1,minHeight:0}}>
          <table style={{width:"100%",minWidth:920,borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"#f8f9fb"}}>
              {["Asset ID","Asset Name","Type","Assigned To","Status","Purchased","Warranty","Value",""].map(h=>(
               <th key={h} style={{padding:"12px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap",position:"sticky",top:0,background:"#f8f9fb",zIndex:1}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paged.map(a=>{
                const expired=isExpired(a.warranty);
                const st=STATUS_STYLE[a.status]||STATUS_STYLE["Disposed"];
                const isSelected=a.id===selectedId;
                return(
                  <tr key={a.id} onClick={()=>{setSelectedId(a.id);setDetailTab("details");}} style={{cursor:"pointer",background:isSelected?"#eff6ff":undefined,boxShadow:isSelected?"inset 3px 0 0 #2563eb":"none"}}>
                    <td style={{padding:"12px 12px",borderBottom:"1px solid #f0f2f5",fontWeight:700,color:"#2563eb",fontSize:12}}>{a.id}</td>
                    <td style={{padding:"12px 12px",borderBottom:"1px solid #f0f2f5",maxWidth:160}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                        <span style={{fontSize:16,flexShrink:0}}>{TYPE_ICON[a.type]||"📦"}</span>
                        <div style={{minWidth:0,overflow:"hidden"}}>
                          <div style={{fontWeight:600,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.name}</div>
                          <div style={{fontSize:11,color:"#9ca3af",fontFamily:"monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.code}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:"12px 12px",borderBottom:"1px solid #f0f2f5",color:"#4b5563"}}>{a.type}</td>
                   <td style={{padding:"12px 12px",borderBottom:"1px solid #f0f2f5",maxWidth:120}}>
                      {a.assignee?(
                        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                          <div style={{width:26,height:26,borderRadius:"50%",background:"#1e293b",color:"#e2e8f0",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{a.assignee[0]}</div>
                          <div style={{minWidth:0,overflow:"hidden"}}>
                            <div style={{fontWeight:600,color:"#111827",fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.assignee}</div>
                            {a.dept&&<div style={{fontSize:11,color:"#9ca3af",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.dept}</div>}
                          </div>
                        </div>
                      ):<span style={{color:"#9ca3af",fontStyle:"italic",fontSize:12}}>Unassigned</span>}
                    </td>
                    <td style={{padding:"12px 12px",borderBottom:"1px solid #f0f2f5"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.c}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:st.dot}}/>{a.status}
                      </span>
                    </td>
                    <td style={{padding:"12px 12px",borderBottom:"1px solid #f0f2f5",color:"#6b7280",fontSize:12}}>{a.purchased||"—"}</td>
                    <td style={{padding:"12px 12px",borderBottom:"1px solid #f0f2f5",whiteSpace:"nowrap"}}>
                      <div style={{fontSize:12,fontWeight:700,color:expired?"#dc2626":"#374151",whiteSpace:"nowrap"}}>{a.warranty||"—"}</div>
                      {expired&&<div style={{fontSize:10,fontWeight:700,color:"#dc2626",whiteSpace:"nowrap"}}>EXPIRED</div>}
                    </td>
                    <td style={{padding:"12px 12px",borderBottom:"1px solid #f0f2f5",fontWeight:700,color:"#111827"}}>{fmtINR(a.value)}</td>
                    <td style={{padding:"12px 8px",borderBottom:"1px solid #f0f2f5",whiteSpace:"nowrap"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={(e)=>{e.stopPropagation();setSelectedId(a.id);setTransferAssetId(a.id);}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#374151",fontSize:11,fontWeight:600,cursor:"pointer"}}>Transfer</button>
                        <button onClick={(e)=>{e.stopPropagation();openEdit(a);}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#374151",fontSize:11,fontWeight:600,cursor:"pointer"}}>Edit</button>
                        <button onClick={(e)=>{e.stopPropagation();delAsset(a.id);}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #fca5a5",background:"#fff",color:"#dc2626",fontSize:11,fontWeight:600,cursor:"pointer"}}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0&&<tr><td colSpan={9} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No assets found.</td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length>ASSET_PAGE_SIZE && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid #f0f2f5"}}>
            <span style={{fontSize:12,color:"#9ca3af"}}>
              Showing {(safePage-1)*ASSET_PAGE_SIZE+1}–{Math.min(safePage*ASSET_PAGE_SIZE,filtered.length)} of {filtered.length}
            </span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setAssetPage(p=>Math.max(1,p-1))} disabled={safePage===1} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:safePage===1?"#d1d5db":"#374151",fontSize:12,fontWeight:600,cursor:safePage===1?"default":"pointer"}}>Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                <button key={p} onClick={()=>setAssetPage(p)} style={{
                  width:30,height:30,borderRadius:6,
                  border:p===safePage?"1px solid #2563eb":"1px solid #e4e7ec",
                  background:p===safePage?"#2563eb":"#fff",
                  color:p===safePage?"#fff":"#374151",
                  fontSize:12,fontWeight:700,cursor:"pointer"
                }}>{p}</button>
              ))}
              <button onClick={()=>setAssetPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:safePage===totalPages?"#d1d5db":"#374151",fontSize:12,fontWeight:600,cursor:safePage===totalPages?"default":"pointer"}}>Next</button>
            </div>
          </div>
        )}
      </div>

      {selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          typeIcon={TYPE_ICON[selectedAsset.type]||"📦"}
          statusStyle={STATUS_STYLE[selectedAsset.status]||STATUS_STYLE["Disposed"]}
          tab={detailTab}
          setTab={setDetailTab}
          onClose={()=>setSelectedId(null)}
          onTransfer={()=>setTransferAssetId(selectedAsset.id)}
          onLogService={()=>setServiceAssetId(selectedAsset.id)}
          onEdit={()=>openEdit(selectedAsset)}
        />
      )}
      </div>

      <AssetModal open={modalOpen} onClose={()=>{setModalOpen(false);setEditing(null);}} onSave={saveAsset} nextId={nextId} editing={editing} types={TYPES} employees={employees} departments={departmentList}/>
      <TypeMasterModal open={typeModalOpen} onClose={()=>setTypeModalOpen(false)} types={assetTypes} setTypes={setAssetTypes}/>
      <TransferModal open={!!transferAssetId} asset={transferAsset} employees={employees} typeIcon={transferAsset?TYPE_ICON[transferAsset.type]||"📦":"📦"} onClose={()=>setTransferAssetId(null)} onSubmit={doTransfer}/>
      <ServiceModal open={!!serviceAssetId} asset={serviceAsset} onClose={()=>setServiceAssetId(null)} onSubmit={doService}/>
    </div>
  );
}