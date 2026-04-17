import { useState, useEffect } from "react";
import * as projApi from "../api/projects.js";
import * as deptApi from "../api/departments.js";
import * as empApi  from "../api/employees.js";
import { useToast, Toast, Spinner, LoadingBox, Modal, StatusDrop, selS, inputS, labelS, STATUS_CFG, ALL_STATUSES, fmtDate } from "./shared.jsx";
import { useAuth } from "../context/AuthContext.jsx";


export default function Projects(){
  const {user}=useAuth();
  const [projects,setProjects]=useState([]);
  const [depts,setDepts]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [stFilter,setStFilter]=useState("");
  const [empF,setEmpF]=useState("");
  const [deptF,setDeptF]=useState("");
  const {msg,show}=useToast();
  const today=new Date().toLocaleDateString('en-CA');
  const blank={name:"",description:"",start_date:today,end_date:"",department_id:"",owner_id:"",status:"Not Started",assignee_ids:[],is_recurring:false};
  const [form,setForm]=useState(blank);

  // Overview modal state
  const [overview,setOverview]=useState(null);   // { project, employees, totalMins }
  const [ovLoading,setOvLoading]=useState(false);
  const [ovModal,setOvModal]=useState(false);

  const [saving,setSaving]=useState(false);
  const [closePending,setClosePending]=useState(null); // {id,status} | null
  const [closeDate,setCloseDate]=useState("");
  const [myTaskProjectIds,setMyTaskProjectIds]=useState(new Set());
  useEffect(()=>{load();},[]);
  async function load(){
    try{
      const [pR,dR,eR]=await Promise.all([projApi.getAll(),deptApi.getAll(),empApi.getAll()]);
      setProjects(pR.data||[]);setDepts(dR.data||[]);setEmployees(eR.data||[]);
      if(user.role==="User"){
        const tR=await import("../api/tasks.js").then(m=>m.getAll());
        const ids=new Set((tR.data||[]).filter(t=>String(t.employee_id)===String(user.id)).map(t=>t.project_id));
        setMyTaskProjectIds(ids);
      }
    }catch{show("Failed to load");}
    finally{setLoading(false);}
  }
  async function save(){
    if(saving) return;
    setSaving(true);
    try{
      if(editing){
        const r=await projApi.update(editing.id,form);
        try{ await projApi.setAssignees(editing.id, form.assignee_ids||[]); }catch{}
        // Update local state — no full reload needed
        const assignees=employees.filter(e=>(form.assignee_ids||[]).includes(e.id)).map(e=>({id:e.id,name:e.name}));
        const owner=employees.find(e=>String(e.id)===String(form.owner_id));
        setProjects(prev=>prev.map(p=>p.id===editing.id?{...p,...form,assignees,owner_name:owner?.name||p.owner_name}:p));
        show("Project updated");
      } else {
        const r=await projApi.create(form);
        const pid=r.data?.id;
        if(pid){ try{ await projApi.setAssignees(pid, form.assignee_ids||[]); }catch{} }
        show("Project created");
        load(); // need full reload to get computed fields for new project
      }
      setModal(false);
    }catch(e){show(e?.response?.data?.error||"Error");}
    finally{ setSaving(false); }
  }
  async function del(id){
    try{
      await projApi.remove(id);
      setProjects(prev=>prev.filter(p=>p.id!==id));
      show("Deleted");
    }catch(e){show(e?.response?.data?.error||"Cannot delete");}
  }
  async function updateStatus(id,status){
    if(status==="Closed"||status==="Completed"){
      setClosePending({id,status});
      setCloseDate(new Date().toLocaleDateString('en-CA'));
      return;
    }
    try{
      await projApi.update(id,{status});
      setProjects(prev=>prev.map(p=>p.id===id?{...p,status}:p));
      show("Status → "+status);
    }catch{show("Update failed");}
  }
  async function confirmClose(){
    if(!closePending)return;
    try{
      await projApi.update(closePending.id,{status:closePending.status,closed_at:closeDate});
      setProjects(prev=>prev.map(p=>p.id===closePending.id?{...p,status:closePending.status,closed_at:closeDate,tat_days:0}:p));
      show("Status → "+closePending.status);
      if(closePending.fromOverview&&overview) setOverview(ov=>({...ov,project:{...ov.project,status:closePending.status}}));
    }catch{show("Update failed");}
    setClosePending(null);
  }
  async function openOverview(p){
    setOvModal(true);
    setOvLoading(true);
    try{
      const r=await projApi.getOverview(p.id);
      setOverview(r.data);
    }catch{ show("Failed to load overview"); setOvModal(false); }
    finally{ setOvLoading(false); }
  }
  async function ovUpdateStatus(status){
    if(!overview) return;
    if(status==="Closed"||status==="Completed"){
      setClosePending({id:overview.project.id,status,fromOverview:true});
      setCloseDate(new Date().toLocaleDateString('en-CA'));
      return;
    }
    try{
      await projApi.update(overview.project.id,{status});
      setOverview(ov=>({...ov,project:{...ov.project,status}}));
      setProjects(prev=>prev.map(p=>p.id===overview.project.id?{...p,status}:p));
      show("Status → "+status);
    }catch{ show("Update failed"); }
  }

  function openEdit(p){
    setEditing(p);
    setForm({
      name:          p.name,
      description:   p.description||"",
      start_date:    String(p.start_date||"").slice(0,10),
      end_date:      String(p.end_date||"").slice(0,10),
      department_id: String(p.department_id||""),
      owner_id:      String(p.owner_id||""),
      status:        p.status,
      assignee_ids:  (p.assignees||[]).map(a=>a.id),
      is_recurring:  !!p.is_recurring,
    });
    setModal(true);
  }

  // Manager sees their primary + secondary department; Admin sees all
  const managerDeptIds=new Set([user.department_id,user.secondary_department_id].filter(Boolean).map(String));
  const visibleDepts = user.role==="Admin" ? depts
    : managerDeptIds.size>0 ? depts.filter(d=>managerDeptIds.has(String(d.id)))
    : depts;

  const filtered=projects.filter(p=>{
    if(user.role==="User"){
      const isOwner=String(p.owner_id)===String(user.id);
      const isAssignee=(p.assignees||[]).some(a=>String(a.id)===String(user.id));
      const hasTask=myTaskProjectIds.has(p.id);
      if(!isOwner&&!isAssignee&&!hasTask)return false;
    }
    if(stFilter&&p.status!==stFilter)return false;
    if(empF&&String(p.owner_id)!==String(empF))return false;
    if(deptF&&String(p.department_id)!==String(deptF))return false;
    return true;
  });

  const CS_BG={"On Time":"#ecfdf5","In Progress":"#eff6ff","Delayed":"#fef2f2"};
  const CS_C={"On Time":"#059669","In Progress":"#2563eb","Delayed":"#dc2626"};
  const managers=employees.filter(e=>e.role==="Manager"||e.role==="Admin");

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:14}}>
        {user.role!=="User"&&(
          <button onClick={()=>{setEditing(null);setForm(blank);setModal(true);}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ New Project</button>
        )}
      </div>
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"14px 16px",marginBottom:14,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"flex-end"}}>
          {user.role==="Admin"&&(
            <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:140}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Owner</div>
              <select value={empF} onChange={e=>setEmpF(e.target.value)} style={selS}>
                <option value="">All Owners</option>
                {managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          {user.role==="Admin"&&(
            <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:140}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Department</div>
              <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={selS}>
                <option value="">All Departments</option>
                {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Status</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {ALL_STATUSES.map(s=>{
                const cnt=filtered.filter(p=>p.status===s).length;
                if(!cnt)return null;
                const cfg=STATUS_CFG[s];
                return <div key={s} onClick={()=>setStFilter(stFilter===s?"":s)} style={{padding:"5px 12px",borderRadius:20,background:stFilter===s?cfg.dot:cfg.bg,color:stFilter===s?"#fff":cfg.color,fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid "+cfg.dot+"55"}}>{s} ({cnt})</div>;
              })}
              {stFilter&&<div onClick={()=>setStFilter("")} style={{padding:"5px 12px",borderRadius:20,background:"#f8f9fb",color:"#9ca3af",fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid #e4e7ec"}}>✕ Clear</div>}
            </div>
          </div>
        </div>
      </div>
      {loading?<LoadingBox text="Loading projects…"/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["Project Name","Assignees","Owner","Due Date","TAT","Completion","Status",""].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(p=>{
                  const tat=p.tat_days||0;
                  const cs=p.is_recurring?"Recurring":p.status==="Closed"||p.status==="Completed"?"On Time":tat>0?"Delayed":"In Progress";
                  const overdue=!p.is_recurring&&tat>0&&p.status!=="Closed"&&p.status!=="Completed";
                  return(
                    <tr key={p.id}>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:15}}>{p.status==="Closed"?"🔒":"📁"}</span>
                          <span onClick={()=>openOverview(p)} style={{color:p.status==="Closed"?"#6b7280":"#4f46e5",fontWeight:600,cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted",textUnderlineOffset:3}}>{p.name}</span>
                          {overdue&&<span style={{padding:"2px 6px",borderRadius:20,fontSize:10,fontWeight:600,background:"#fef2f2",color:"#dc2626"}}>Overdue</span>}
                          {p.status==="Closed"&&<span style={{padding:"2px 6px",borderRadius:20,fontSize:10,fontWeight:600,background:"#f0fdf4",color:"#065f46"}}>Closed</span>}
                        </div>
                      </td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        {(p.assignees||[]).length===0
                          ?<span style={{color:"#9ca3af"}}>—</span>
                          :<div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {(p.assignees||[]).map(a=>(
                              <span key={a.id} style={{padding:"2px 7px",borderRadius:20,fontSize:11,fontWeight:600,background:"#eff6ff",color:"#1d4ed8"}}>{a.name.split(" ")[0]}</span>
                            ))}
                          </div>
                        }
                      </td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#9ca3af"}}>{p.owner_name||"—"}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        {p.is_recurring
                          ? <span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:"#ede9fe",color:"#5b21b6"}}>↻ Recurring</span>
                          : <>
                              <div style={{fontSize:11,color:"#9ca3af"}}>{fmtDate(p.start_date)} →</div>
                              <div style={{fontFamily:"monospace",fontSize:12,color:tat>0?"#dc2626":"#4b5563",fontWeight:tat>0?700:400,marginTop:1}}>{fmtDate(p.end_date)}</div>
                              <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>Target {p.target_days||0}d · Actual {p.actual_days||0}d</div>
                            </>
                        }
                      </td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        {p.is_recurring
                          ?<span style={{color:"#9ca3af",fontSize:12}}>—</span>
                          :tat===0
                            ?<span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#ecfdf5",color:"#059669"}}>✓ On Time</span>
                            :<span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#fef2f2",color:"#dc2626"}}>+{tat}d late</span>
                        }
                      </td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        <span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,
                          background:p.is_recurring?"#ede9fe":CS_BG[cs]||"#f8f9fb",
                          color:p.is_recurring?"#5b21b6":CS_C[cs]||"#4b5563"}}>
                          {p.is_recurring?"↻ Recurring":cs}
                        </span>
                      </td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>{user.role!=="User"?<StatusDrop value={p.status} onChange={v=>updateStatus(p.id,v)}/>:<span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:STATUS_CFG[p.status]?.bg||"#f8f9fb",color:STATUS_CFG[p.status]?.color||"#4b5563"}}>{p.status}</span>}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        {user.role!=="User"&&(
                          <div style={{display:"flex",gap:2}}>
                            <button onClick={()=>openEdit(p)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>✏️</button>
                            <button onClick={()=>del(p.id)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>🗑</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#9ca3af"}}>No projects found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ── Project Overview Modal ── */}
      <Modal open={ovModal} onClose={()=>setOvModal(false)} title={overview?.project?.name||"Project Overview"} width={680}>
        {ovLoading&&<div style={{padding:40,display:"flex",justifyContent:"center"}}><Spinner/></div>}
        {!ovLoading&&overview&&(()=>{
          const {project:pv,employees:emps,totalMins}=overview;
          const tat=pv.tat_days||0;
          const totalHours=(totalMins/60).toFixed(1);
          const isOverdue=tat>0&&!["Closed","Completed"].includes(pv.status);
          // palette for distribution bar
          const COLORS=["#4f46e5","#059669","#d97706","#dc2626","#7c3aed","#0284c7","#065f46"];
          return(
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {/* 4-stat cards */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,padding:"20px 24px 16px"}}>
                {/* Status — dropdown */}
                <div style={{background:"#f0f4ff",borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Status</div>
                  {user.role!=="User"
                    ?<select value={pv.status} onChange={e=>ovUpdateStatus(e.target.value)}
                        style={{width:"100%",border:"none",background:"transparent",fontSize:15,fontWeight:700,color:"#4f46e5",cursor:"pointer",padding:0,outline:"none"}}>
                        {ALL_STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    :<div style={{fontSize:15,fontWeight:700,color:"#4f46e5"}}>{pv.status}</div>
                  }
                </div>
                {/* Due Date */}
                <div style={{background:"#fffbeb",borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Due Date</div>
                  {pv.is_recurring
                    ? <div style={{fontSize:13,fontWeight:600,color:"#5b21b6"}}>↻ Recurring</div>
                    : <>
                        <div style={{fontSize:15,fontWeight:700,color:isOverdue?"#c2410c":"#d97706"}}>{fmtDate(pv.end_date)}</div>
                        {tat>0&&<div style={{fontSize:11,color:"#c2410c",marginTop:2}}>+{tat}d overdue</div>}
                      </>
                  }
                </div>
                {/* Team Size */}
                <div style={{background:"#f5f3ff",borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Team Size</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#7c3aed"}}>{pv.team_size||emps.length} members</div>
                </div>
                {/* Total Hours */}
                <div style={{background:"#f0fdf4",borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Total Hours</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#059669"}}>{totalHours}h</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{totalMins}m total</div>
                </div>
              </div>

              {/* Time Distribution bar */}
              {emps.length>0&&(
                <div style={{padding:"0 24px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Time Distribution</div>
                  <div style={{display:"flex",borderRadius:8,overflow:"hidden",height:22}}>
                    {emps.map((e,i)=>(
                      <div key={e.id} title={`${e.name}: ${e.pct}%`}
                        style={{width:`${e.pct}%`,background:COLORS[i%COLORS.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",minWidth:e.pct>6?undefined:0,overflow:"hidden",whiteSpace:"nowrap"}}>
                        {e.pct>6?`${e.pct}%`:""}
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px 14px",marginTop:8}}>
                    {emps.map((e,i)=>(
                      <div key={e.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                        <span style={{width:9,height:9,borderRadius:"50%",background:COLORS[i%COLORS.length],display:"inline-block"}}/>
                        <span style={{color:"#374151",fontWeight:500}}>{e.name.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Employee breakdown table */}
              <div style={{padding:"0 24px 20px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Employee Breakdown</div>
                {emps.length===0
                  ?<div style={{textAlign:"center",padding:"20px 0",color:"#9ca3af",fontSize:13}}>No task entries yet for this project.</div>
                  :<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{background:"#f8f9fb"}}>
                      {["Employee","Sessions","Minutes","Hours","Avg Util","Last Active"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {emps.map((e,i)=>(
                        <tr key={e.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                          <td style={{padding:"10px 10px",borderBottom:"1px solid #f0f2f5"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:26,height:26,borderRadius:"50%",background:COLORS[i%COLORS.length],color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{e.name[0]}</div>
                              <span style={{fontWeight:600,color:"#111827"}}>{e.name}</span>
                            </div>
                          </td>
                          <td style={{padding:"10px 10px",borderBottom:"1px solid #f0f2f5",color:"#374151"}}>{e.sessions} sessions</td>
                          <td style={{padding:"10px 10px",borderBottom:"1px solid #f0f2f5",color:"#374151",fontFamily:"monospace"}}>{e.total_mins}m</td>
                          <td style={{padding:"10px 10px",borderBottom:"1px solid #f0f2f5",fontWeight:700,color:"#111827"}}>{e.total_hours}h</td>
                          <td style={{padding:"10px 10px",borderBottom:"1px solid #f0f2f5"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{flex:1,height:6,borderRadius:3,background:"#f0f2f5",overflow:"hidden"}}>
                                <div style={{width:`${Math.min(e.avg_util,100)}%`,height:"100%",background:e.avg_util>=80?"#059669":e.avg_util>=50?"#d97706":"#dc2626",borderRadius:3}}/>
                              </div>
                              <span style={{fontSize:11,fontWeight:700,color:e.avg_util>=80?"#059669":e.avg_util>=50?"#d97706":"#dc2626",minWidth:34}}>{e.avg_util}%</span>
                            </div>
                          </td>
                          <td style={{padding:"10px 10px",borderBottom:"1px solid #f0f2f5",color:"#9ca3af"}}>{e.last_active||"—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
              </div>

              <div style={{display:"flex",justifyContent:"flex-end",padding:"12px 24px",borderTop:"1px solid #f0f2f5"}}>
                <button onClick={()=>setOvModal(false)} style={{padding:"8px 18px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Close</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal open={modal} onClose={()=>setModal(false)} title={editing?"Edit Project":"New Project"} width={520}>
        <div style={{padding:"18px 20px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Project Name *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Dashboard Redesign" style={inputS}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Description</label>
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Brief description…" style={{...inputS,resize:"vertical",minHeight:64,lineHeight:1.5,fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:"#f5f3ff",border:"1px solid #ddd6fe",cursor:"pointer"}}
            onClick={()=>setForm(f=>({...f,is_recurring:!f.is_recurring,start_date:!f.is_recurring?"":f.start_date,end_date:!f.is_recurring?"":f.end_date}))}>
            <input type="checkbox" checked={!!form.is_recurring} readOnly
              style={{width:16,height:16,accentColor:"#7c3aed",cursor:"pointer",flexShrink:0}}/>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#5b21b6"}}>Recurring Project</div>
              <div style={{fontSize:11,color:"#6b7280",marginTop:1}}>No fixed start/end date — this project runs on an ongoing basis</div>
            </div>
          </div>
          {!form.is_recurring&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Start Date *</label>
              <input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} style={inputS}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Due Date *</label>
              <input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} style={inputS}/>
            </div>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Department</label>
              <select value={form.department_id} onChange={e=>setForm({...form,department_id:e.target.value})} style={inputS}>
                <option value="">Select dept</option>
                {visibleDepts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Owner</label>
              <select value={form.owner_id} onChange={e=>setForm({...form,owner_id:e.target.value})} style={inputS}>
                <option value="">Select owner</option>
                {managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={labelS}>Assignees</label>
            <div style={{border:"1px solid #e4e7ec",borderRadius:7,padding:"8px",maxHeight:110,overflowY:"auto",display:"flex",flexWrap:"wrap",gap:6}}>
              {employees.map(e=>{
                const sel=(form.assignee_ids||[]).includes(e.id);
                return(
                  <div key={e.id} onClick={()=>{
                    const ids=form.assignee_ids||[];
                    setForm({...form,assignee_ids:sel?ids.filter(i=>i!==e.id):[...ids,e.id]});
                  }} style={{padding:"4px 10px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",background:sel?"#4f46e5":"#f0f2f5",color:sel?"#fff":"#4b5563",userSelect:"none"}}>
                    {e.name}
                  </div>
                );
              })}
              {employees.length===0&&<span style={{fontSize:12,color:"#9ca3af"}}>No employees available</span>}
            </div>
            <div style={{fontSize:11,color:"#9ca3af"}}>Click names to assign</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} disabled={saving} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{padding:"8px 14px",borderRadius:6,border:"none",background:saving?"#818cf8":"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {saving&&<Spinner size={13} color="#fff"/>}{saving?(editing?"Saving…":"Creating…"):(editing?"Save Changes":"Create Project")}
          </button>
        </div>
      </Modal>
      {/* ── Close Date Modal ── */}
      <Modal open={!!closePending} onClose={()=>setClosePending(null)} title={`Set Close Date — ${closePending?.status}`} width={380}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontSize:13,color:"#4b5563",lineHeight:1.6}}>
            Choose the actual date this project was {closePending?.status==="Completed"?"completed":"closed"}. This date is used for accurate TAT calculations.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Close Date</label>
            <input type="date" value={closeDate} onChange={e=>setCloseDate(e.target.value)} style={{padding:"8px 10px",borderRadius:6,border:"1px solid #e4e7ec",fontSize:13,outline:"none"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setClosePending(null)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={confirmClose} disabled={!closeDate} style={{padding:"8px 14px",borderRadius:6,border:"none",background:closeDate?"#4f46e5":"#94a3b8",color:"#fff",fontSize:13,fontWeight:600,cursor:closeDate?"pointer":"not-allowed"}}>Confirm {closePending?.status}</button>
        </div>
      </Modal>
      <Toast msg={msg}/>
    </div>
  );
}
