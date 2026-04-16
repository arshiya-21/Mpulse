import { useState, useEffect, useRef } from "react";
import * as visitsApi   from "../api/visits.js";
import * as custApi     from "../api/customers.js";
import * as empApi      from "../api/employees.js";
import * as settingsApi from "../api/settings.js";
import { uploadFile }   from "../api/uploads.js";
import { useToast, Toast, Spinner, Modal, selS, inputS, labelS, VISIT_STATUSES, VISIT_CHANNELS, STATUS_STYLE, fmtDate } from "./shared.jsx";

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
function fileUrl(p)  { return p ? `${API_ORIGIN}${p}` : ''; }
function fileName(p) { return p ? decodeURIComponent(p.split('/').pop().replace(/^\d+_/, '')) : ''; }

const BLANK = { customer_id:"", contact_person:"", channel:"Email", agenda:"", planned_date:"", duration:"1 Day", assigned_to:"", proof_file:"", status:"Planned" };

export default function CustomerVisits(){
  const [visits,setVisits]       = useState([]);
  const [customers,setCustomers] = useState([]);
  const [employees,setEmployees] = useState([]);
  const [adminEmail,setAdminEmail]= useState("");
  const [loading,setLoading]     = useState(true);

  // Schedule / Edit modal
  const [modal,setModal]         = useState(false);
  const [editing,setEditing]     = useState(null);
  const [form,setForm]           = useState(BLANK);
  const [uploading,setUploading] = useState(false);
  const fileRef = useRef(null);

  // Notification popup (after create)
  const [notifyModal,setNotifyModal] = useState(false);
  const [notifyVisit,setNotifyVisit] = useState(null); // { id, customerName, … }
  const [ccTags,setCcTags]           = useState([]);
  const [ccInput,setCcInput]         = useState("");
  const [sending,setSending]         = useState(false);

  // Close / outcome modal
  const [closeModal,setCloseModal]   = useState(false);
  const [closeForm,setCloseForm]     = useState({status:"Completed",work_done:"",issues_resolved:"",additional_reqs:""});

  const [delId,setDelId]   = useState(null);
  const [search,setSearch] = useState("");
  const [statusF,setStatusF]= useState("");
  const {msg,show}          = useToast();
  const taS = {...inputS, resize:"vertical", minHeight:72};

  useEffect(()=>{ loadAll(); },[]);

  async function loadAll(){
    try{
      const [vR,cR,eR,sR] = await Promise.all([
        visitsApi.getAll(), custApi.getAll(), empApi.getAll(), settingsApi.get()
      ]);
      setVisits(vR.data||[]);
      setCustomers(cR.data||[]);
      setEmployees(eR.data||[]);
      setAdminEmail(sR.data?.admin_email||"");
    }catch{ show("Failed to load"); }
    finally{ setLoading(false); }
  }

  async function save(){
    try{
      if(editing){
        await visitsApi.update(editing.id, form);
        setModal(false);
        show("Visit updated");
        loadAll();
      } else {
        const res = await visitsApi.create(form);
        setModal(false);
        // Build preview for notification popup
        const cust = customers.find(c=>String(c.id)===String(form.customer_id));
        const emp  = employees.find(e=>String(e.id)===String(form.assigned_to));
        setNotifyVisit({
          id:            res.data.id,
          customerName:  cust?.name || "",
          contactPerson: form.contact_person,
          agenda:        form.agenda,
          plannedDate:   form.planned_date,
          duration:      form.duration,
          assignedTo:    emp?.name || "",
          channel:       form.channel,
        });
        setCcTags([]);
        setCcInput("");
        setNotifyModal(true);
      }
    }catch(e){ show(e?.response?.data?.error||"Error"); }
  }

  async function sendNotification(){
    setSending(true);
    try{
      await visitsApi.notify(notifyVisit.id, ccTags);
      show("Notification sent successfully");
      setNotifyModal(false);
    }catch(e){
      show(e?.response?.data?.error||"Failed to send notification");
    }finally{ setSending(false); }
  }

  async function saveClose(){
    if(!closeForm.work_done){ show("Work done is required"); return; }
    try{
      await visitsApi.close(editing.id, closeForm);
      setCloseModal(false);
      show("Outcome updated");
      loadAll();
    }catch{ show("Update failed"); }
  }

  async function del(){
    try{ await visitsApi.remove(delId); setDelId(null); show("Deleted"); loadAll(); }
    catch(e){ show(e?.response?.data?.error||"Cannot delete"); }
  }

  async function handleFile(e){
    const file = e.target.files?.[0];
    if(!file) return;
    setUploading(true);
    try{
      const res = await uploadFile(file);
      setForm(f=>({...f, proof_file: res.data.url}));
      show("File attached");
    }catch{ show("Upload failed — max 10 MB"); }
    finally{ setUploading(false); if(fileRef.current) fileRef.current.value=""; }
  }

  function openAdd(){
    setEditing(null);
    setForm(BLANK);
    setModal(true);
  }

  function openEdit(v){
    setEditing(v);
    setForm({
      customer_id:   String(v.customer_id  || ""),
      contact_person: v.contact_person || "",
      channel:        v.channel        || "Email",
      agenda:         v.agenda         || "",
      planned_date:   v.planned_date   ? String(v.planned_date).slice(0,10) : "",
      duration:       v.duration ? String(v.duration) : "1 Day",
      assigned_to:    String(v.assigned_to || ""),
      proof_file:     v.proof_file     || "",
      status:         v.status         || "Planned",
    });
    setModal(true);
  }

  function openClose(v){
    setEditing(v);
    setCloseForm({ status:"Completed", work_done:v.work_done||"", issues_resolved:v.issues_resolved||"", additional_reqs:v.additional_reqs||"" });
    setCloseModal(true);
  }

  // CC tag helpers
  function addCcTag(){
    const email = ccInput.trim().replace(/,+$/, '');
    if(!email) return;
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if(!valid){ show("Invalid email format"); return; }
    if(!ccTags.includes(email)) setCcTags(t=>[...t, email]);
    setCcInput("");
  }
  function handleCcKey(e){
    if(e.key==="Enter"||e.key===","){ e.preventDefault(); addCcTag(); }
  }
  function removeTag(email){ setCcTags(t=>t.filter(x=>x!==email)); }

  const filtered = visits.filter(v=>{
    if(search && !v.customer_name?.toLowerCase().includes(search.toLowerCase()) && !v.assigned_to_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if(statusF && v.status!==statusF) return false;
    return true;
  });

  const kpi={
    total:visits.length, planned:visits.filter(v=>v.status==="Planned").length,
    inprog:visits.filter(v=>v.status==="In Progress").length,
    done:visits.filter(v=>v.status==="Completed").length,
    cancelled:visits.filter(v=>v.status==="Cancelled").length,
  };
  const kpis=[
    {label:"Total",       value:kpi.total,     icon:"🗂️",accent:"#4f46e5",bg:"#ede9fe"},
    {label:"Planned",     value:kpi.planned,   icon:"📅",accent:"#1d4ed8",bg:"#dbeafe"},
    {label:"In Progress", value:kpi.inprog,    icon:"🚗",accent:"#c2410c",bg:"#fff7ed"},
    {label:"Completed",   value:kpi.done,      icon:"✅",accent:"#059669",bg:"#ecfdf5"},
    {label:"Cancelled",   value:kpi.cancelled, icon:"🚫",accent:"#64748b",bg:"#f1f5f9"},
  ];
  const chIcon={"Email":"📧","WhatsApp":"💬","Phone Call":"📞","SMS":"📱","On-Site Request":"🏢"};

  const notifySubject = notifyVisit
    ? `New Visit Scheduled – ${notifyVisit.customerName} on ${notifyVisit.plannedDate}`
    : "";

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:16}}>
        <button onClick={openAdd} style={{padding:"8px 16px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Schedule Visit</button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:9,padding:"12px 14px",boxShadow:"0 1px 2px rgba(0,0,0,.05)",borderLeft:"3px solid "+k.accent,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,borderRadius:7,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{k.icon}</div>
            <div><div style={{fontSize:10,color:"#6b7280",fontWeight:500}}>{k.label}</div><div style={{fontSize:20,fontWeight:700,color:k.accent,lineHeight:1.2}}>{k.value}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"12px 14px",marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:200}}><div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:3}}>Search</div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Customer or employee…" style={{...selS,width:"100%"}}/></div>
          <div style={{minWidth:150}}><div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:3}}>Status</div>
            <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={selS}>
              <option value="">All Statuses</option>
              {VISIT_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          {(search||statusF)&&<button onClick={()=>{setSearch("");setStatusF("");}} style={{padding:"6px 12px",fontSize:12,borderRadius:6,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontWeight:600,alignSelf:"flex-end"}}>✕ Clear</button>}
        </div>
      </div>

      {/* Table */}
      {loading?<Spinner/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["Customer","Contact","Channel","Agenda","Date","Duration","Assigned To","Status",""].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((v,i)=>{
                  const ss=STATUS_STYLE[v.status]||{bg:"#f0f2f5",c:"#374151"};
                  return(
                    <tr key={v.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",color:"#bfdbfe",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{v.customer_name?.[0]||"?"}</div>
                          <span style={{fontWeight:600,color:"#111827"}}>{v.customer_name||"—"}</span>
                        </div>
                      </td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#6b7280",fontSize:12}}>{v.contact_person||"—"}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontSize:12}}>{chIcon[v.channel]||"📋"} {v.channel}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#374151",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.agenda}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#6b7280",fontSize:12,whiteSpace:"nowrap"}}>{fmtDate(v.planned_date)}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#6b7280",fontSize:12}}>{v.duration||"—"}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontSize:12}}>{v.assigned_to_name||"—"}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:ss.bg,color:ss.c}}>{v.status}</span></td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        <div style={{display:"flex",gap:2,alignItems:"center"}}>
                          {v.proof_file&&(
                            <a href={fileUrl(v.proof_file)} target="_blank" rel="noreferrer"
                              style={{padding:"3px 6px",borderRadius:5,border:"1px solid #d1d5db",background:"#f9fafb",color:"#4f46e5",fontSize:11,textDecoration:"none",fontWeight:600}} title={fileName(v.proof_file)}>📎</a>
                          )}
                          {(v.status==="Planned"||v.status==="In Progress"||v.status==="Pending")&&(
                            <button onClick={()=>openClose(v)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #a7f3d0",background:"#ecfdf5",color:"#059669",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓</button>
                          )}
                          <button onClick={()=>openEdit(v)} style={{padding:4,borderRadius:5,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>✏️</button>
                          <button onClick={()=>setDelId(v.id)} style={{padding:4,borderRadius:5,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={9} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No visits found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Schedule / Edit Modal (wider) ── */}
      <Modal open={modal} onClose={()=>setModal(false)} title={(editing?"Edit":"Schedule")+" Visit"} width={820}>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto",flex:1}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Customer *</label>
              <select value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})} style={inputS}>
                <option value="">Select customer</option>
                {customers.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Contact Person</label>
              <input value={form.contact_person} onChange={e=>setForm({...form,contact_person:e.target.value})} placeholder="e.g. Rajesh K" style={inputS}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Channel</label>
              <select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})} style={inputS}>
                {VISIT_CHANNELS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Assigned To</label>
              <select value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})} style={inputS}>
                <option value="">Select employee</option>
                {employees.map(e=><option key={e.id} value={String(e.id)}>{e.name}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Planned Date *</label>
              <input type="date" value={form.planned_date} onChange={e=>setForm({...form,planned_date:e.target.value})} style={inputS}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Duration</label>
              <input type="text" value={form.duration ?? ""} onChange={e=>setForm({...form,duration:e.target.value})} placeholder="e.g. 1 Day, 2 Days" style={inputS}/>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Agenda *</label>
            <textarea value={form.agenda} onChange={e=>setForm({...form,agenda:e.target.value})} placeholder="Reason for visit…" style={taS}/>
          </div>

          {/* Proof File */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={labelS}>Proof File <span style={{fontWeight:400,color:"#9ca3af"}}>(image, PDF, Office, ZIP — max 10 MB)</span></label>
            {form.proof_file&&(
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:8,background:"#f0f9ff",border:"1px solid #93c5fd"}}>
                <span style={{fontSize:16}}>📎</span>
                <a href={fileUrl(form.proof_file)} target="_blank" rel="noreferrer"
                  style={{flex:1,fontSize:12,color:"#1d4ed8",fontWeight:600,textDecoration:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {fileName(form.proof_file)}
                </a>
                <button onClick={()=>setForm(f=>({...f,proof_file:""}))} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:14,padding:"0 2px"}}>✕</button>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input ref={fileRef} type="file" id="proof-file-input" style={{display:"none"}}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                onChange={handleFile}/>
              <label htmlFor="proof-file-input"
                style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:7,border:"1px dashed #d1d5db",background:"#fafafa",color:"#4b5563",fontSize:12,fontWeight:600,cursor:uploading?"not-allowed":"pointer",opacity:uploading?0.6:1}}>
                {uploading?"⏳ Uploading…":"📁 Choose File"}
              </label>
              {form.proof_file&&<span style={{fontSize:11,color:"#9ca3af"}}>Choose again to replace</span>}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} style={{padding:"9px 16px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} disabled={uploading} style={{padding:"9px 18px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:uploading?"not-allowed":"pointer",opacity:uploading?0.6:1}}>
            {editing?"Save Changes":"Schedule Visit"}
          </button>
        </div>
      </Modal>

      {/* ── Email Notification Popup ── */}
      <Modal open={notifyModal} onClose={()=>setNotifyModal(false)} title="Email Notification" width={820}>
        {notifyVisit&&(
          <>
            {/* Scrollable body */}
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px",display:"flex",flexDirection:"column",gap:14,minHeight:0}}>

              {/* Success banner */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:"linear-gradient(135deg,#f0f9ff,#e0f2fe)",border:"1px solid #7dd3fc",flexShrink:0}}>
                <span style={{fontSize:18}}>📧</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#0369a1"}}>Visit scheduled successfully!</div>
                  <div style={{fontSize:11,color:"#0284c7",marginTop:1}}>Send an email notification to keep everyone informed.</div>
                </div>
              </div>

              {/* Two-column layout */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>

                {/* Left: To / Subject / CC */}
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <label style={labelS}>To <span style={{fontWeight:400,color:"#9ca3af"}}>(fixed — admin)</span></label>
                    <div style={{...inputS,background:"#f8f9fb",color:"#374151",display:"flex",alignItems:"center",gap:6,cursor:"default",minHeight:38}}>
                      <span>👤</span>
                      {adminEmail
                        ? <span style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{adminEmail}</span>
                        : <span style={{color:"#dc2626",fontSize:12}}>⚠️ Admin email not set — Master Data → Email Config</span>}
                    </div>
                  </div>

                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <label style={labelS}>Subject</label>
                    <div style={{...inputS,background:"#f8f9fb",color:"#374151",fontSize:13,cursor:"default",wordBreak:"break-word"}}>{notifySubject}</div>
                  </div>

                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <label style={labelS}>CC <span style={{fontWeight:400,color:"#9ca3af"}}>(Enter or comma to add)</span></label>
                    {ccTags.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,padding:"7px 10px",borderRadius:7,border:"1px solid #e4e7ec",background:"#f8f9fb"}}>
                        {ccTags.map(t=>(
                          <span key={t} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,background:"#ede9fe",color:"#4f46e5",fontSize:12,fontWeight:600}}>
                            {t}
                            <button onClick={()=>removeTag(t)} style={{background:"none",border:"none",cursor:"pointer",color:"#7c3aed",fontSize:13,padding:0,lineHeight:1}}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{display:"flex",gap:6}}>
                      <input value={ccInput} onChange={e=>setCcInput(e.target.value)} onKeyDown={handleCcKey}
                        placeholder="email@example.com" style={{...inputS,flex:1}}/>
                      <button onClick={addCcTag} style={{padding:"0 12px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
                    </div>
                  </div>
                </div>

                {/* Right: Message Preview */}
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <label style={labelS}>Message Preview</label>
                  <div style={{background:"#f8f9fb",border:"1px solid #e4e7ec",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#4b5563",lineHeight:1.8}}>
                    <p style={{margin:"0 0 6px",fontWeight:700,color:"#111827"}}>Hi Admin,</p>
                    <p style={{margin:"0 0 10px",fontSize:11}}>A new customer visit has been scheduled. Please review the details below:</p>
                    <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:6,padding:"10px 12px",marginBottom:10}}>
                      {[
                        ["Customer",    notifyVisit.customerName],
                        ["Contact",     notifyVisit.contactPerson],
                        ["Agenda",      notifyVisit.agenda],
                        ["Planned Date",notifyVisit.plannedDate],
                        ["Duration",    notifyVisit.duration],
                        ["Assigned To", notifyVisit.assignedTo],
                        ["Channel",     notifyVisit.channel],
                      ].filter(([,v])=>v).map(([k,v])=>(
                        <div key={k} style={{display:"flex",gap:8,marginBottom:3}}>
                          <span style={{width:88,color:"#9ca3af",flexShrink:0,fontSize:11}}>{k}:</span>
                          <span style={{fontWeight:600,color:"#111827",fontSize:12}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{margin:0,color:"#92400e",fontSize:11}}>Kindly ensure the visit is executed on time and the status is updated once completed.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer — always visible */}
            <div style={{flexShrink:0,display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 24px",borderTop:"1px solid #f0f2f5",background:"#fff"}}>
              <button onClick={()=>setNotifyModal(false)} style={{padding:"9px 18px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#6b7280",fontSize:13,fontWeight:600,cursor:"pointer"}}>Skip</button>
              <button onClick={sendNotification} disabled={sending||!adminEmail}
                style={{padding:"9px 22px",borderRadius:6,border:"none",background:adminEmail?"#4f46e5":"#94a3b8",color:"#fff",fontSize:13,fontWeight:600,cursor:adminEmail&&!sending?"pointer":"not-allowed"}}>
                {sending?"Sending…":"📤 Send Notification"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Close / Outcome Modal ── */}
      <Modal open={closeModal} onClose={()=>setCloseModal(false)} title="Update Visit Outcome" width={520}>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Status</label>
            <select value={closeForm.status} onChange={e=>setCloseForm({...closeForm,status:e.target.value})} style={inputS}>
              {VISIT_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Work Done *</label><textarea value={closeForm.work_done} onChange={e=>setCloseForm({...closeForm,work_done:e.target.value})} placeholder="What was done…" style={taS}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Issues Resolved</label><textarea value={closeForm.issues_resolved} onChange={e=>setCloseForm({...closeForm,issues_resolved:e.target.value})} placeholder="Issues fixed…" style={taS}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Additional Requirements</label><textarea value={closeForm.additional_reqs} onChange={e=>setCloseForm({...closeForm,additional_reqs:e.target.value})} placeholder="Follow-ups…" style={taS}/></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setCloseModal(false)} style={{padding:"9px 16px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={saveClose} style={{padding:"9px 18px",borderRadius:6,border:"none",background:"#059669",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Save Outcome</button>
        </div>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal open={!!delId} onClose={()=>setDelId(null)} title="Delete Visit" width={380}>
        <div style={{padding:"20px 24px",fontSize:13,color:"#374151"}}>Are you sure you want to delete this visit? This cannot be undone.</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setDelId(null)} style={{padding:"9px 16px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={del} style={{padding:"9px 16px",borderRadius:6,border:"none",background:"#dc2626",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Delete</button>
        </div>
      </Modal>

      <Toast msg={msg}/>
    </div>
  );
}
