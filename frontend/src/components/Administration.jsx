import { useState, useEffect } from "react";
import * as settingsApi from "../api/settings.js";
import * as annApi from "../api/announcements.js";
import { useToast, Toast, Spinner, inputS, labelS } from "./shared.jsx";

const TYPE_META={
  feature: {label:"New Feature", color:"#4f46e5", bg:"#ede9fe"},
  update:  {label:"Update",      color:"#0891b2", bg:"#e0f2fe"},
};

export default function Administration(){
  const [s,setS]=useState({company_name:"",daily_target_mins:510,work_days:"Mon–Fri",timezone:"Asia/Kolkata",tat_alert_days:2,email_notif:true,auto_close:false,session_timeout:0});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const {msg,show}=useToast();

  // ── Announcements state ──
  const [announcements,setAnnouncements]=useState([]);
  const [annModal,setAnnModal]=useState(false);
  const [annLogModal,setAnnLogModal]=useState(false);
  const [annForm,setAnnForm]=useState({title:"",message:"",type:"feature"});
  const [annPosting,setAnnPosting]=useState(false);
  const [logFilter,setLogFilter]=useState(()=>{
    const to=new Date(),from=new Date();
    from.setDate(from.getDate()-7);
    return{from:from.toISOString().split("T")[0],to:to.toISOString().split("T")[0]};
  });
  const [logPage,setLogPage]=useState(1);
  const LOG_PAGE_SIZE=5;
  const [expandedIds,setExpandedIds]=useState(new Set());
  function toggleExpand(id){setExpandedIds(prev=>{const s=new Set(prev);s.has(id)?s.delete(id):s.add(id);return s;});}
  function quickRange(days){
    const to=new Date(),from=new Date();
    from.setDate(from.getDate()-days);
    setLogFilter({from:from.toISOString().split("T")[0],to:to.toISOString().split("T")[0]});
    setLogPage(1);
  }

  useEffect(()=>{
    annApi.getAll().then(r=>setAnnouncements(r.data||[])).catch(()=>{});
  },[]);

  async function postAnnouncement(){
    if(!annForm.title.trim()||!annForm.message.trim()){show("Title and message required");return;}
    setAnnPosting(true);
    try{
      const {data}=await annApi.create(annForm);
      setAnnouncements(prev=>[data,...prev]);
      setAnnForm({title:"",message:"",type:"feature"});
      setAnnModal(false);
      show("Announcement posted to all users");
    }catch{show("Failed to post announcement");}
    finally{setAnnPosting(false);}
  }

  async function deleteAnn(id){
    if(!window.confirm("Delete this announcement?")) return;
    try{
      await annApi.remove(id);
      setAnnouncements(prev=>prev.filter(a=>a.id!==id));
    }catch{show("Failed to delete");}
  }

  useEffect(()=>{
    settingsApi.get().then(r=>setS(prev=>({...prev,...(r.data||{})}))).catch(()=>show("Failed to load settings")).finally(()=>setLoading(false));
  },[]);

  async function save(){
    if(saving) return;
    setSaving(true);
    try{await settingsApi.update(s);show("Settings saved successfully");}
    catch{show("Save failed");}
    finally{setSaving(false);}
  }

  function Toggle({label,k}){
    return(
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f0f2f5"}}>
        <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{label}</div>
        <div onClick={()=>setS(prev=>({...prev,[k]:!prev[k]}))} style={{width:40,height:22,borderRadius:11,background:s[k]?"#4f46e5":"#eef0f4",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0,border:"1px solid #e4e7ec"}}>
          <div style={{position:"absolute",top:2,left:s[k]?20:2,width:16,height:16,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"left .2s"}}/>
        </div>
      </div>
    );
  }

  if(loading)return <Spinner/>;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:18}}>
        <button onClick={save} disabled={saving} style={{padding:"8px 14px",borderRadius:6,border:"none",background:saving?"#a5b4fc":"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>{saving?"Saving…":"Save Changes"}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}><span style={{fontSize:13,fontWeight:700}}>🏢 Company Settings</span></div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Company Name</label><input value={s.company_name||""} onChange={e=>setS(p=>({...p,company_name:e.target.value}))} style={inputS}/></div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Timezone</label>
              <select value={s.timezone} onChange={e=>setS(p=>({...p,timezone:e.target.value}))} style={inputS}>
                {["Asia/Kolkata","Asia/Dubai","UTC","America/New_York"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Working Days</label>
              <select value={s.work_days} onChange={e=>setS(p=>({...p,work_days:e.target.value}))} style={inputS}>
                {["Mon–Fri","Mon–Sat","Sun–Thu"].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}><span style={{fontSize:13,fontWeight:700}}>⚡ KPI Configuration</span></div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Daily Target Minutes</label>
              <input type="number" value={s.daily_target_mins} min={60} max={720} onChange={e=>setS(p=>({...p,daily_target_mins:+e.target.value}))} style={inputS}/>
              <span style={{fontSize:12,color:"#9ca3af"}}>{(s.daily_target_mins/60).toFixed(1)} hours/day</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>TAT Alert Threshold (days)</label>
              <input type="number" value={s.tat_alert_days} min={1} max={30} onChange={e=>setS(p=>({...p,tat_alert_days:+e.target.value}))} style={inputS}/>
            </div>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}><span style={{fontSize:13,fontWeight:700}}>🔔 Notifications</span></div>
          <div style={{padding:16}}>
            <Toggle label="Auto-close Projects" k="auto_close"/>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}><span style={{fontSize:13,fontWeight:700}}>🔒 Security</span></div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Session Timeout</label>
              <select value={s.session_timeout} onChange={e=>setS(p=>({...p,session_timeout:+e.target.value}))} style={inputS}>
                <option value={0}>No timeout</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option>
              </select>
            </div>
            <div style={{padding:"8px 12px",borderRadius:6,background:"#fffbeb",border:"1px solid #fde68a",fontSize:12,color:"#d97706"}}>⚠️ Password policy: min 8 chars, 1 uppercase, 1 number</div>
          </div>
        </div>
      </div>

      {/* ── Announcements ── */}
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)",marginTop:14,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>📢</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>Announcements</div>
            <div style={{fontSize:11,color:"#9ca3af"}}>{announcements.length} posted · visible to all users on login</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setAnnLogModal(true)} style={{padding:"7px 14px",borderRadius:6,border:"1px solid #c7d2fe",background:"#ede9fe",color:"#4f46e5",fontSize:12,fontWeight:600,cursor:"pointer"}}>📋 View Log</button>
          <button onClick={()=>{setAnnForm({title:"",message:"",type:"feature"});setAnnModal(true);}} style={{padding:"7px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ New Announcement</button>
        </div>
      </div>

      {/* ── New Announcement Modal ── */}
      {annModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,17,23,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={()=>setAnnModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:500,maxWidth:"92vw",boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #f0f2f5"}}>
              <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>📢 New Announcement</span>
              <button onClick={()=>setAnnModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10}}>
                <input value={annForm.title} onChange={e=>setAnnForm(p=>({...p,title:e.target.value}))} placeholder="Title — e.g. Meeting Schedule is now live" style={inputS}/>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  {Object.entries(TYPE_META).map(([k,v])=>{
                    const active=annForm.type===k;
                    return(
                      <button key={k} type="button" onClick={()=>setAnnForm(p=>({...p,type:k}))}
                        style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s",
                          border:`1.5px solid ${active?v.color:"#e4e7ec"}`,
                          background:active?v.bg:"#fff",
                          color:active?v.color:"#9ca3af",
                          boxShadow:active?`0 0 0 2px ${v.bg}`:"none"}}>
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea value={annForm.message} onChange={e=>setAnnForm(p=>({...p,message:e.target.value}))} placeholder="Describe the update in detail…" rows={4} style={{...inputS,resize:"vertical",fontFamily:"inherit"}}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
              <button onClick={()=>setAnnModal(false)} style={{padding:"8px 16px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={postAnnouncement} disabled={annPosting} style={{padding:"8px 18px",borderRadius:6,border:"none",background:annPosting?"#a5b4fc":"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:annPosting?"not-allowed":"pointer"}}>
                {annPosting?"Posting…":"Post to All Users"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Announcement Log Modal ── */}
      {annLogModal&&(()=>{
        const filtered=announcements.filter(a=>{
          const d=new Date(a.created_at);
          if(logFilter.from&&d<new Date(logFilter.from)) return false;
          if(logFilter.to&&d>new Date(logFilter.to+"T23:59:59")) return false;
          return true;
        });
        const totalPages=Math.max(1,Math.ceil(filtered.length/LOG_PAGE_SIZE));
        const pg=Math.min(logPage,totalPages);
        const paged=filtered.slice((pg-1)*LOG_PAGE_SIZE,pg*LOG_PAGE_SIZE);
        const closeLog=()=>{setAnnLogModal(false);quickRange(7);setLogPage(1);};
        const isWeek=()=>{const d=new Date(),w=new Date();w.setDate(w.getDate()-7);return logFilter.from===w.toISOString().split("T")[0]&&logFilter.to===d.toISOString().split("T")[0];};
        const isMonth=()=>{const d=new Date(),m=new Date();m.setDate(m.getDate()-30);return logFilter.from===m.toISOString().split("T")[0]&&logFilter.to===d.toISOString().split("T")[0];};
        return(
          <div style={{position:"fixed",inset:0,background:"rgba(15,17,23,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={closeLog}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:600,maxWidth:"92vw",maxHeight:"82vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #f0f2f5",flexShrink:0}}>
                <div>
                  <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>📋 Announcement Log</span>
                  <span style={{marginLeft:10,fontSize:12,color:"#9ca3af",fontWeight:500}}>{filtered.length} of {announcements.length} entries</span>
                </div>
                <button onClick={closeLog} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
              </div>
              {/* Filter bar */}
              <div style={{padding:"10px 16px",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexShrink:0}}>
                {/* Left: date range */}
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <label style={{fontSize:11,color:"#9ca3af",fontWeight:500}}>From</label>
                    <input type="date" value={logFilter.from} onChange={e=>{setLogFilter(p=>({...p,from:e.target.value}));setLogPage(1);}}
                      style={{fontSize:12,padding:"4px 8px",border:"1px solid #e4e7ec",borderRadius:6,color:"#374151",outline:"none"}}/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <label style={{fontSize:11,color:"#9ca3af",fontWeight:500}}>To</label>
                    <input type="date" value={logFilter.to} onChange={e=>{setLogFilter(p=>({...p,to:e.target.value}));setLogPage(1);}}
                      style={{fontSize:12,padding:"4px 8px",border:"1px solid #e4e7ec",borderRadius:6,color:"#374151",outline:"none"}}/>
                  </div>
                </div>
                {/* Right: quick select */}
                <div style={{display:"flex",gap:6}}>
                  {[{label:"Week",days:7},{label:"Month",days:30}].map(({label,days})=>{
                    const active=days===7?isWeek():isMonth();
                    return(
                      <button key={label} onClick={()=>quickRange(days)}
                        style={{fontSize:12,padding:"4px 14px",borderRadius:20,border:`1.5px solid ${active?"#4f46e5":"#e4e7ec"}`,background:active?"#4f46e5":"#fff",color:active?"#fff":"#6b7280",fontWeight:600,cursor:"pointer",transition:"all .15s"}}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* List */}
              <div style={{overflowY:"auto",flex:1,padding:14,display:"flex",flexDirection:"column",gap:8}}>
                {filtered.length===0?(
                  <div style={{textAlign:"center",padding:"30px 0",color:"#9ca3af",fontSize:13}}>
                    {announcements.length===0?"No announcements posted yet.":"No announcements match the selected date range."}
                  </div>
                ):paged.map(a=>{
                  const meta=TYPE_META[a.type]||TYPE_META.update;
                  const expanded=expandedIds.has(a.id);
                  return(
                    <div key={a.id} style={{borderRadius:8,border:`1px solid ${meta.bg}`,background:"#fafbfc",borderLeft:`3px solid ${meta.color}`,overflow:"hidden"}}>
                      {/* Header row */}
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"11px 14px"}}>
                        <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:10,background:meta.bg,color:meta.color,flexShrink:0}}>{meta.label}</span>
                        <span style={{fontSize:13,fontWeight:600,color:"#111827",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</span>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <span style={{fontSize:11,color:"#9ca3af"}}>{new Date(a.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</span>
                          <button onClick={()=>toggleExpand(a.id)} title={expanded?"Hide":"View details"}
                            style={{background:expanded?meta.bg:"#f3f4f6",border:`1px solid ${expanded?meta.color:"#e4e7ec"}`,borderRadius:6,padding:"3px 7px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:expanded?meta.color:"#6b7280"}}>
                            {expanded?(
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ):(
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                            <span style={{fontSize:11,fontWeight:600}}>{expanded?"Hide":"View"}</span>
                          </button>
                        </div>
                      </div>
                      {/* Expandable body */}
                      {expanded&&(
                        <div style={{padding:"0 14px 12px",borderTop:`1px dashed ${meta.bg}`}}>
                          <div style={{fontSize:13,color:"#4b5563",lineHeight:1.6,whiteSpace:"pre-wrap",paddingTop:10}}>{a.message}</div>
                          <div style={{fontSize:11,color:"#9ca3af",marginTop:8,display:"flex",alignItems:"center",gap:4}}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            by {a.created_by}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Pagination */}
              {totalPages>1&&(
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderTop:"1px solid #f0f2f5",flexShrink:0}}>
                  <span style={{fontSize:12,color:"#9ca3af"}}>Page {pg} of {totalPages}</span>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setLogPage(p=>Math.max(1,p-1))} disabled={pg===1}
                      style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e4e7ec",background:pg===1?"#f9fafb":"#fff",color:pg===1?"#d1d5db":"#374151",fontSize:12,fontWeight:600,cursor:pg===1?"not-allowed":"pointer"}}>← Prev</button>
                    {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                      <button key={n} onClick={()=>setLogPage(n)}
                        style={{padding:"5px 10px",borderRadius:6,border:"1px solid",borderColor:n===pg?"#4f46e5":"#e4e7ec",background:n===pg?"#4f46e5":"#fff",color:n===pg?"#fff":"#374151",fontSize:12,fontWeight:600,cursor:"pointer",minWidth:32}}>
                        {n}
                      </button>
                    ))}
                    <button onClick={()=>setLogPage(p=>Math.min(totalPages,p+1))} disabled={pg===totalPages}
                      style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e4e7ec",background:pg===totalPages?"#f9fafb":"#fff",color:pg===totalPages?"#d1d5db":"#374151",fontSize:12,fontWeight:600,cursor:pg===totalPages?"not-allowed":"pointer"}}>Next →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <Toast msg={msg}/>
    </div>
  );
}
