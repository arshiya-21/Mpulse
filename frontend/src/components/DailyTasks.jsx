import { useState, useEffect } from "react";
const fmtDate=d=>{if(!d)return"—";try{const dt=new Date(d);const dd=String(dt.getUTCDate()).padStart(2,"0");const mm=String(dt.getUTCMonth()+1).padStart(2,"0");return`${dd}-${mm}-${dt.getUTCFullYear()}`;}catch{return String(d).slice(0,10);}};
import * as empApi      from "../api/employees.js";
import * as deptApi     from "../api/departments.js";
import * as projApi     from "../api/projects.js";
import * as tasksApi    from "../api/tasks.js";
import * as settingsApi from "../api/settings.js";
import { useToast, Toast, Pb, Spinner, Modal, selS, inputS, labelS, WTYPES, PSTATS, SC2, SC2C } from "./shared.jsx";
import { DEFAULT_CATS } from "./MasterData.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DailyTasks(){
  const {user}=useAuth();
  const [tasks,setTasks]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [departments,setDepartments]=useState([]);
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
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
  const blank={task_date:fmt(today),employee_id:user.role==="User"?String(user.id):"",project_id:"",category:"",work_type:"Planned",spent_mins:"",status:"In Progress"};
  const [form,setForm]=useState(blank);

  useEffect(()=>{
    Promise.all([empApi.getAll(),deptApi.getAll(),projApi.getAll(),settingsApi.get()])
      .then(([eR,dR,pR,sR])=>{
        setEmployees(eR.data||[]);setDepartments(dR.data||[]);setProjects(pR.data||[]);
        const raw=sR.data?.work_categories;
        if(raw) try{ setCats([...JSON.parse(raw)].sort((a,b)=>a.localeCompare(b))); }catch{}
        if(sR.data?.daily_target_mins) setDailyTarget(sR.data.daily_target_mins);
      });
  },[]);
  useEffect(()=>{load();},[dateFrom,dateTo]);

  async function load(){
    setLoading(true);
    try{const r=await tasksApi.getAll({from:dateFrom,to:dateTo});setTasks(r.data||[]);}
    catch{show("Failed to load tasks");}
    finally{setLoading(false);}
  }

  const filtered=tasks.filter(t=>{
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
      work_type:   t.work_type||"Planned",
      spent_mins:  t.spent_mins||"",
      status:      t.status||"In Progress"
    });
    setModal(true);
  }

  async function save(){
    try{
      if(editing){await tasksApi.update(editing.id,form);show("Task updated");}
      else{await tasksApi.create(form);show("Task logged");}
      await load();setModal(false);
    }catch(e){show(e?.response?.data?.error||"Error saving task");}
  }
  async function del(){
    try{await tasksApi.remove(delId);show("Deleted");setDelId(null);await load();}
    catch{show("Delete failed");}
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
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Employee</div>
              <select value={empF} onChange={e=>setEmpF(e.target.value)} style={selS}>
                <option value="">All Employees</option>
                {empOptions.map(e=><option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
          )}
          {user.role!=="User"&&(
            <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:140}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Department</div>
              <select value={deptF} onChange={e=>{setDeptF(e.target.value);setEmpF("");}} style={selS}>
                <option value="">All Departments</option>
                {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
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

      {loading?<Spinner/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["Date","Employee","Project","Category","Type","Minutes","Util","TAT","Status",""].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.slice((page-1)*PAGE,page*PAGE).map((t,i)=>(
                  <tr key={t.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12,color:"#4b5563"}}>{fmtDate(t.task_date)}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#111827",fontWeight:600}}>{t.employee_name}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#4b5563",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.project_name}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#9ca3af"}}>{t.category}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#f8f9fb",color:"#4b5563"}}>{t.work_type}</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12}}>{t.spent_mins}m</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><Pb v={Math.round(parseFloat(t.utilization)||0)}/></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      {t.tat_days>0?<span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#fef2f2",color:"#dc2626"}}>+{t.tat_days}d</span>:<span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#ecfdf5",color:"#059669"}}>On Time</span>}
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:SC2[t.status]||"#f8f9fb",color:SC2C[t.status]||"#4b5563"}}>{t.status}</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      <div style={{display:"flex",gap:2}}>
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
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderTop:"1px solid #f0f2f5",flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:12,color:"#9ca3af"}}>Showing {Math.min(page*PAGE,filtered.length)} of {filtered.length} records</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"5px 12px",fontSize:12,borderRadius:6,border:"1px solid #e4e7ec",background:page===1?"#f8f9fb":"#fff",color:page===1?"#c1c8d4":"#374151",cursor:page===1?"not-allowed":"pointer",fontWeight:600}}>← Prev</button>
              {Array.from({length:Math.ceil(filtered.length/PAGE)},(_,i)=>i+1).map(n=>(
                <button key={n} onClick={()=>setPage(n)} style={{padding:"5px 10px",fontSize:12,borderRadius:6,border:"1px solid "+(n===page?"#4f46e5":"#e4e7ec"),background:n===page?"#4f46e5":"#fff",color:n===page?"#fff":"#374151",cursor:"pointer",fontWeight:600,minWidth:30}}>{n}</button>
              ))}
              <button onClick={()=>setPage(p=>Math.min(Math.ceil(filtered.length/PAGE),p+1))} disabled={page>=Math.ceil(filtered.length/PAGE)} style={{padding:"5px 12px",fontSize:12,borderRadius:6,border:"1px solid #e4e7ec",background:page>=Math.ceil(filtered.length/PAGE)?"#f8f9fb":"#fff",color:page>=Math.ceil(filtered.length/PAGE)?"#c1c8d4":"#374151",cursor:page>=Math.ceil(filtered.length/PAGE)?"not-allowed":"pointer",fontWeight:600}}>Next →</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={editing?"Edit Task":"Log Daily Task"} width={520}>
        <div style={{padding:"18px 20px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Date</label><input type="date" value={form.task_date} onChange={e=>setForm({...form,task_date:e.target.value})} style={inputS}/></div>
            {user.role!=="User"&&(
              <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Employee</label>
                <select value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} style={inputS}>
                  <option value="">Select employee</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:4,gridColumn:"span 2"}}><label style={labelS}>Project</label>
              <select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})} style={inputS}>
                <option value="">Select project</option>
                {projects.filter(p=>p.status!=="Closed"&&p.status!=="Completed").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                {projects.some(p=>p.status==="Closed"||p.status==="Completed")&&<optgroup label="─── Closed / Completed ───">
                  {projects.filter(p=>p.status==="Closed"||p.status==="Completed").map(p=><option key={p.id} value={p.id}>{p.name} [{p.status}]</option>)}
                </optgroup>}
              </select>
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
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Minutes Spent</label>
              <input type="number" value={form.spent_mins} min={1} max={720} placeholder="e.g. 480" onChange={e=>setForm({...form,spent_mins:+e.target.value})} style={inputS}/>
              {form.spent_mins>0&&<span style={{fontSize:12,color:"#9ca3af"}}>Utilization: {Math.round((form.spent_mins/dailyTarget)*100)}%</span>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Status</label>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inputS}>
                {PSTATS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{editing?"Save Changes":"Log Task"}</button>
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
    </div>
  );
}
