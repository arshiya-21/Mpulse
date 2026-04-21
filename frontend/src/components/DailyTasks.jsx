import { useState, useEffect } from "react";
import * as empApi      from "../api/employees.js";
import * as deptApi     from "../api/departments.js";
import * as projApi     from "../api/projects.js";
import * as tasksApi    from "../api/tasks.js";
import * as settingsApi from "../api/settings.js";
import { useToast, Toast, Pb, Spinner, LoadingBox, Modal, selS, inputS, labelS, WTYPES, ALL_STATUSES, SC2, SC2C, fmtDate, SearchSelect, evalFormula, Pager, PAGE_SIZE } from "./shared.jsx";
import { DEFAULT_CATS } from "./MasterData.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DailyTasks(){
  const {user}=useAuth();
  const [tasks,setTasks]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [departments,setDepartments]=useState([]);
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [descView,setDescView]=useState(null);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [delId,setDelId]=useState(null);
  const [page,setPage]=useState(1);
  const PAGE=10;
  const today=new Date();
  const fmt=d=>d.toLocaleDateString('en-CA');
  const defFrom=fmt(new Date(new Date().setMonth(today.getMonth()-1)));
  const defTo=fmt(today);
  const [dateFrom,setDateFrom]=useState(defFrom);
  const [dateTo,setDateTo]=useState(defTo);
  const [catF,setCatF]=useState("");
  const [tatF,setTatF]=useState("");
  const [empF,setEmpF]=useState("");
  const [deptF,setDeptF]=useState("");
  const {msg,show}=useToast();
  const [cats,setCats]=useState([...DEFAULT_CATS].sort((a,b)=>a.localeCompare(b)));
  const [dailyTarget,setDailyTarget]=useState(510);
  const [utilExpr,setUtilExpr]=useState("spent_mins / daily_target * 100");
  const blank={task_date:fmt(today),employee_id:(user.role==="User"||user.role==="Admin")?String(user.id):"",project_id:"",category:"",work_type:"On Demand",spent_mins:"",status:"Completed",description:""};
  const [form,setForm]=useState(blank);

  useEffect(()=>{
    Promise.all([empApi.getAll(),deptApi.getAll(),projApi.getAll(),settingsApi.get()])
      .then(([eR,dR,pR,sR])=>{
        const srt=(a,k)=>[...(a||[])].sort((x,y)=>(x[k]||"").localeCompare(y[k]||""));
        setEmployees(srt(eR.data,"name"));setDepartments(srt(dR.data,"name"));setProjects(srt(pR.data,"name"));
        const raw=sR.data?.work_categories;
        if(raw) try{
          let val=raw;
          for(let i=0;i<3;i++){ if(Array.isArray(val)) break; if(typeof val==='string') val=JSON.parse(val); else break; }
          if(Array.isArray(val)) setCats(val.sort((a,b)=>a.localeCompare(b)));
        }catch{}
        if(sR.data?.daily_target_mins) setDailyTarget(sR.data.daily_target_mins);
        if(sR.data?.work_formulas){try{const fs=JSON.parse(sR.data.work_formulas);const u=fs.find(f=>f.id==="util_pct");if(u?.expr)setUtilExpr(u.expr);}catch{}}
      });
  },[]);
  useEffect(()=>{load();},[dateFrom,dateTo]);

  async function load(){
    setLoading(true);
    try{const r=await tasksApi.getAll({from:dateFrom,to:dateTo});setTasks(r.data||[]);}
    catch{show("Failed to load tasks");}
    finally{setLoading(false);}
  }

  const filtered=[...tasks].sort((a,b)=>String(b.task_date||"").localeCompare(String(a.task_date||""))||(a.employee_name||"").localeCompare(b.employee_name||"")).filter(t=>{
    if(user.role==="User"&&String(t.employee_id)!==String(user.id))return false;
    if(catF&&t.category!==catF)return false;
    if(tatF==="Delay"&&t.tat_days===0)return false;
    if(tatF==="On Time"&&t.tat_days>0)return false;
    if(empF&&t.employee_name!==empF)return false;
    if(deptF&&t.department!==deptF)return false;
    return true;
  });

  function openEdit(t){
    setEditing(t);
    setForm({
      task_date:   String(t.task_date||"").slice(0,10),
      employee_id: String(t.employee_id||""),
      project_id:  String(t.project_id||""),
      category:    t.category||"",
      work_type:   t.work_type||"On Demand",
      spent_mins:  t.spent_mins||"",
      status:      "Completed",
      description: t.description||""
    });
    setModal(true);
  }

  async function save(){
    if(saving)return;
    setSaving(true);
    try{
      if(editing){
        const r=await tasksApi.update(editing.id,form);
        // Patch local state — avoid full reload
        const emp=employees.find(e=>String(e.id)===String(form.employee_id));
        const proj=projects.find(p=>String(p.id)===String(form.project_id));
        const dept=departments.find(d=>d.id===emp?.department_id);
        const updated={...editing,...r.data,
          employee_name:emp?.name||editing.employee_name,
          project_name:proj?.name||editing.project_name,
          department:dept?.name||editing.department};
        setTasks(prev=>prev.map(t=>t.id===editing.id?updated:t));
        show("Task updated");
      } else {
        const r=await tasksApi.create(form);
        const emp=employees.find(e=>String(e.id)===String(form.employee_id));
        const proj=projects.find(p=>String(p.id)===String(form.project_id));
        const dept=departments.find(d=>d.id===emp?.department_id);
        const newTask={...r.data,
          employee_name:emp?.name||"",
          project_name:proj?.name||"",
          department:dept?.name||"",
          utilization:((r.data.spent_mins/dailyTarget)*100).toFixed(2)};
        setTasks(prev=>[newTask,...prev]);
        show("Task logged");
      }
      setModal(false);
    }catch(e){show(e?.response?.data?.error||"Error saving task");}
    finally{setSaving(false);}
  }
  async function del(){
    try{
      await tasksApi.remove(delId);
      setTasks(prev=>prev.filter(t=>t.id!==delId));
      show("Deleted");setDelId(null);
    }catch{show("Delete failed");}
  }

  const hasFilters=catF||tatF||empF||deptF;
  function clearAll(){setCatF("");setTatF("");setEmpF("");setDeptF("");setPage(1);}
  const empOptions=deptF?employees.filter(e=>e.department===deptF):employees;

  return(
    <div>
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"14px 16px",marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"flex-end"}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Date Range</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={selS}/>
              <span style={{fontSize:12,color:"#9ca3af"}}>to</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={selS}/>
            </div>
          </div>
          {user.role!=="User"&&(
            <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:140}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Department</div>
              <select value={deptF} onChange={e=>{setDeptF(e.target.value);setEmpF("");}} style={selS}>
                <option value="">All Departments</option>
                {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          )}
          {user.role!=="User"&&(
            <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:150}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Employee</div>
              <select value={empF} onChange={e=>setEmpF(e.target.value)} style={{...selS,color:deptF?"#111827":"#9ca3af"}} disabled={!deptF}>
                <option value="">{deptF?"All in "+deptF:"Select dept first"}</option>
                {deptF&&employees.filter(e=>e.department===deptF).map(e=><option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:130}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Category</div>
            <select value={catF} onChange={e=>setCatF(e.target.value)} style={selS}>
              <option value="">All Categories</option>
              {cats.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:110}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>TAT</div>
            <select value={tatF} onChange={e=>setTatF(e.target.value)} style={selS}>
              <option value="">All</option>
              <option value="On Time">On Time</option>
              <option value="Delay">Delayed</option>
            </select>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"flex-end",alignSelf:"flex-end"}}>
            {hasFilters&&<button onClick={clearAll} style={{padding:"6px 12px",fontSize:12,borderRadius:6,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontWeight:600}}>✕ Clear</button>}
            <button onClick={()=>{setEditing(null);setForm(blank);setModal(true);}} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Log Task</button>
          </div>
        </div>
      </div>

      {loading?<LoadingBox text="Loading tasks…"/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["Date","Employee","Project","Category","Type","Minutes","Util","TAT","Status",""].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map((t,i)=>(
                  <tr key={t.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12,color:"#4b5563"}}>{fmtDate(t.task_date)}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#111827",fontWeight:600}}>{t.employee_name}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",maxWidth:180}}>
                      <div style={{color:"#4b5563",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.project_name}</div>
                      {t.description&&<div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{t.description}</div>}
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#9ca3af"}}>{t.category}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#f8f9fb",color:"#4b5563"}}>{t.work_type}</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12}}>{t.spent_mins}m</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",minWidth:100}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        {(()=>{const u=evalFormula(utilExpr,{spent_mins:t.spent_mins||0,daily_target:dailyTarget});return(<><Pb value={Math.min(100,Math.round(u))} color={u>200?"#059669":u>=80?"#f59e0b":"#ef4444"}/><span style={{fontSize:11,color:"#6b7280",whiteSpace:"nowrap",fontFamily:"monospace"}}>{Math.round(u)}%</span></>);})()}
                      </div>
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      {t.tat_days>0?<span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#fef2f2",color:"#dc2626"}}>+{t.tat_days}d</span>:<span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#ecfdf5",color:"#059669"}}>On Time</span>}
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:SC2[t.status]||"#f8f9fb",color:SC2C[t.status]||"#4b5563"}}>{t.status}</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      <div style={{display:"flex",gap:2}}>
                        <button onClick={()=>setDescView(t)} title="View record" style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",color:"#6b7280",display:"flex",alignItems:"center"}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button onClick={()=>openEdit(t)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>✏️</button>
                        <button onClick={()=>setDelId(t.id)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={10} style={{padding:20,textAlign:"center",color:"#9ca3af"}}>No tasks found</td></tr>}
              </tbody>
            </table>
          </div>
          <Pager page={page} setPage={setPage} total={filtered.length}/>
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={editing?"Edit Task":"Log Daily Task"} width={520}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Date</label><input type="date" value={form.task_date} onChange={e=>setForm({...form,task_date:e.target.value})} style={inputS}/></div>
            {user.role!=="User"&&(
              <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Employee</label>
                <select value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value,project_id:""})} style={inputS}>
                  <option value="">Select employee</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:4,gridColumn:"span 2"}}><label style={labelS}>Project</label>
              {(()=>{
                const selEmpId=user.role==="User"?String(user.id):form.employee_id;
                const projPool=selEmpId
                  ?projects.filter(p=>String(p.owner_id)===selEmpId||(p.assignees||[]).some(a=>String(a.id)===selEmpId))
                  :projects;
                const active=projPool.filter(p=>p.status!=="Closed"&&p.status!=="Completed");
                const closed=projPool.filter(p=>p.status==="Closed"||p.status==="Completed");
                return(
                  <SearchSelect
                    value={form.project_id}
                    onChange={v=>setForm({...form,project_id:v})}
                    disabled={!selEmpId&&user.role!=="Admin"}
                    placeholder="Select project"
                    disabledPlaceholder="Select employee first"
                    options={active.map(p=>({value:p.id,label:p.name}))}
                    groups={closed.length>0?[{label:"Closed / Completed",options:closed.map(p=>({value:p.id,label:`${p.name} [${p.status}]`}))}]:[]}
                  />
                );
              })()}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,gridColumn:"span 2"}}>
              <label style={labelS}>Description</label>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} placeholder="Describe what you worked on…" style={{...inputS,resize:"vertical",minHeight:72,fontFamily:"inherit"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Category</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inputS}>
                <option value="">Select category</option>
                {cats.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Work Type</label>
              <select value={form.work_type} onChange={e=>setForm({...form,work_type:e.target.value})} style={inputS}>
                {WTYPES.map(w=><option key={w}>{w}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,gridColumn:"span 2"}}>
              <label style={labelS}>Minutes Spent</label>
              <input type="number" value={form.spent_mins} min={1} max={720} placeholder="e.g. 400" onChange={e=>setForm({...form,spent_mins:+e.target.value})} style={inputS}/>
              {form.spent_mins>0&&<span style={{fontSize:12,color:"#9ca3af"}}>Utilization: {Math.round((form.spent_mins/dailyTarget)*100)}%</span>}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} disabled={saving} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{padding:"8px 14px",borderRadius:6,border:"none",background:saving?"#818cf8":"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {saving&&<Spinner size={13} color="#fff"/>}{saving?(editing?"Saving…":"Logging…"):(editing?"Save Changes":"Log Task")}
          </button>
        </div>
      </Modal>
      <Modal open={!!delId} onClose={()=>setDelId(null)} title="Delete Entry" width={360}>
        <div style={{padding:"18px 20px"}}><p style={{fontSize:14,color:"#4b5563",lineHeight:1.6}}>Are you sure? This cannot be undone.</p></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setDelId(null)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={del} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#dc2626",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Delete</button>
        </div>
      </Modal>
      <Toast msg={msg}/>
      {descView&&(
        <div onClick={()=>setDescView(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",overflow:"hidden"}}>

            {/* Purple header */}
            <div style={{background:"linear-gradient(135deg,#4f46e5,#7c3aed)",padding:"16px 20px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexShrink:0}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600,color:"#c4b5fd",textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Task Record</div>
                <div style={{fontSize:16,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{descView.project_name||"—"}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:"#e0e7ff",background:"rgba(255,255,255,0.15)",padding:"2px 9px",borderRadius:20}}>{fmtDate(descView.task_date)}</span>
                  <span style={{fontSize:12,color:"#e0e7ff",background:"rgba(255,255,255,0.15)",padding:"2px 9px",borderRadius:20}}>{descView.employee_name}</span>
                  <span style={{fontSize:12,color:"#e0e7ff",background:"rgba(255,255,255,0.15)",padding:"2px 9px",borderRadius:20}}>{descView.department||"—"}</span>
                </div>
              </div>
              <button onClick={()=>setDescView(null)} style={{border:"none",background:"rgba(255,255,255,0.2)",cursor:"pointer",color:"#fff",borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,marginLeft:12}}>✕</button>
            </div>

            {/* Scrollable body */}
            <div style={{overflowY:"auto",flex:1}}>
              {/* Stats grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,background:"#e5e7eb"}}>
                {[
                  {label:"Category",    value:descView.category||"—",     color:"#111827"},
                  {label:"Work Type",   value:descView.work_type||"—",    color:"#111827"},
                  {label:"Status",      value:descView.status||"—",       color:SC2C[descView.status]||"#111827"},
                  {label:"Mins Spent",  value:(descView.spent_mins||0)+"m", color:"#4f46e5"},
                  {label:"Utilization", value:Math.round(evalFormula(utilExpr,{spent_mins:descView.spent_mins||0,daily_target:dailyTarget}))+"%", color:"#059669"},
                  {label:"TAT",         value:descView.tat_days>0?"+"+descView.tat_days+"d late":"On Time", color:descView.tat_days>0?"#dc2626":"#059669"},
                ].map(s=>(
                  <div key={s.label} style={{background:"#fff",padding:"11px 14px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{s.label}</div>
                    <div style={{fontSize:13,fontWeight:700,color:s.color}}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div style={{padding:"14px 18px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Description</div>
                {descView.description
                  ? <div style={{background:"#f8f9fb",borderRadius:8,padding:"12px 14px",border:"1px solid #e4e7ec",fontSize:13,color:"#374151",lineHeight:1.8,whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto"}}>{descView.description}</div>
                  : <div style={{background:"#f8f9fb",borderRadius:8,padding:"12px 14px",border:"1px solid #e4e7ec",fontSize:13,color:"#9ca3af",fontStyle:"italic"}}>No description added.</div>
                }
              </div>
            </div>

            {/* Footer */}
            <div style={{padding:"10px 18px",borderTop:"1px solid #f0f2f5",display:"flex",justifyContent:"flex-end",flexShrink:0}}>
              <button onClick={()=>setDescView(null)} style={{padding:"7px 20px",borderRadius:7,border:"none",background:"#4f46e5",fontSize:13,fontWeight:600,color:"#fff",cursor:"pointer"}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
