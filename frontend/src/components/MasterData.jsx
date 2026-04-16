import { useState, useEffect } from "react";
import * as deptApi          from "../api/departments.js";
import * as rolesApi         from "../api/roles.js";
import * as empApi           from "../api/employees.js";
import * as licApi           from "../api/licenses.js";
import * as custApi          from "../api/customers.js";
import * as emailSettingsApi from "../api/emailSettings.js";
import * as permApi          from "../api/permissions.js";
import * as settingsApi      from "../api/settings.js";
import { useToast, Toast, Spinner, Modal, inputS, labelS, LICENSE_COLORS } from "./shared.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
function Departments(){
  const {user}=useAuth();
  const isAdmin=user?.role==="Admin";
  const [depts,setDepts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:"",status:"active"});
  const {msg,show}=useToast();

  useEffect(()=>{load();},[]);
  async function load(){
    try{const r=await deptApi.getAll();setDepts(r.data||[]);}
    catch{show("Failed to load");}
    finally{setLoading(false);}
  }
  async function save(){
    try{
      if(editing){await deptApi.update(editing.id,form);show("Updated");}
      else{await deptApi.create(form);show("Created");}
      await load();setModal(false);
    }catch(e){show(e?.response?.data?.error||"Error");}
  }
  async function del(id){
    try{await deptApi.remove(id);show("Deleted");await load();}
    catch(e){show(e?.response?.data?.error||"Cannot delete");}
  }
  function openEdit(d){setEditing(d);setForm({name:d.name,status:d.status});setModal(true);}

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:18}}>
        {isAdmin&&<button onClick={()=>{setEditing(null);setForm({name:"",status:"active"});setModal(true);}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Add Department</button>}
      </div>
      {loading?<Spinner/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["#","Department","Members","Status",""].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {depts.map((d,i)=>(
                  <tr key={d.id}>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12,color:"#9ca3af"}}>{String(i+1).padStart(2,"0")}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:32,height:32,borderRadius:8,background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏢</div>
                        <span style={{color:"#111827",fontWeight:600}}>{d.name}</span>
                      </div>
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#eff6ff",color:"#2563eb"}}>{d.employee_count||0} members</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:d.status==="active"?"#ecfdf5":"#fffbeb",color:d.status==="active"?"#059669":"#d97706"}}>{d.status}</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      {isAdmin&&<div style={{display:"flex",gap:2}}>
                        <button onClick={()=>openEdit(d)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>✏️</button>
                        <button onClick={()=>del(d.id)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>🗑</button>
                      </div>}
                    </td>
                  </tr>
                ))}
                {depts.length===0&&<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:"#9ca3af"}}>No departments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing?"Edit Department":"New Department"} width={380}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Department Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Engineering" style={inputS}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Status</label>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inputS}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{editing?"Save Changes":"Create"}</button>
        </div>
      </Modal>
      <Toast msg={msg}/>
    </div>
  );
}

// ─── ROLES ────────────────────────────────────────────────────────────────────
function Roles(){
  const {user}=useAuth();
  const isAdmin=user?.role==="Admin";
  const [roles,setRoles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:"",description:""});
  const {msg,show}=useToast();
  const ROLE_BG={Admin:"#fef2f2",Manager:"#eff6ff",User:"#f8fafc"};
  const ROLE_C={Admin:"#991b1b",Manager:"#1d4ed8",User:"#475569"};

  useEffect(()=>{load();},[]);
  async function load(){
    try{const r=await rolesApi.getAll();setRoles(r.data||[]);}
    catch{show("Failed to load");}
    finally{setLoading(false);}
  }
  async function save(){
    try{await rolesApi.create(form);show("Role created");await load();setModal(false);}
    catch(e){show(e?.response?.data?.error||"Error");}
  }
  async function del(id){
    try{await rolesApi.remove(id);show("Deleted");await load();}
    catch(e){show(e?.response?.data?.error||"Cannot delete");}
  }

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:18}}>
        {isAdmin&&<button onClick={()=>{setForm({name:"",description:""});setModal(true);}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Add Role</button>}
      </div>
      {loading?<Spinner/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["#","Role","Description","Members",""].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {roles.map((r,i)=>(
                  <tr key={r.id}>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12,color:"#9ca3af"}}>{String(i+1).padStart(2,"0")}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:ROLE_BG[r.name]||"#f8f9fb",color:ROLE_C[r.name]||"#475569"}}>{r.name}</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#4b5563",maxWidth:260}}>{r.description||"—"}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#eff6ff",color:"#2563eb"}}>{r.member_count||0} members</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>{isAdmin&&<button onClick={()=>del(r.id)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>🗑</button>}</td>
                  </tr>
                ))}
                {roles.length===0&&<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:"#9ca3af"}}>No roles yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title="Create Role" width={360}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Role Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Supervisor" style={inputS}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Brief description" style={inputS}/></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Create Role</button>
        </div>
      </Modal>
      <Toast msg={msg}/>
    </div>
  );
}

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
function Employees(){
  const {user}=useAuth();
  const [emps,setEmps]=useState([]);
  const [depts,setDepts]=useState([]);
  const [roles,setRoles]=useState([]);
  const [allMgrs,setAllMgrs]=useState([]);  // All Admin/Manager employees org-wide
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [delId,setDelId]=useState(null);
  const [inviteEmp,setInviteEmp]=useState(null);
  const [inviteUrl,setInviteUrl]=useState("");
  const [copied,setCopied]=useState(false);
  const [search,setSearch]=useState("");
  const {msg,show}=useToast();
  const blank={name:"",email:"",department_id:"",secondary_department_id:"",role_id:"",manager_ids:[],status:"active"};
  const [form,setForm]=useState(blank);
  const ROLE_BG={Admin:"#fef2f2",Manager:"#eff6ff",User:"#f8fafc"};
  const ROLE_C={Admin:"#991b1b",Manager:"#1d4ed8",User:"#475569"};

  useEffect(()=>{load();},[]);
  async function load(){
    try{
      const [eR,dR,rR,mR]=await Promise.all([
        empApi.getAll(),deptApi.getAll(),rolesApi.getAll(),empApi.getAllManagers()
      ]);
      setEmps(eR.data||[]);setDepts(dR.data||[]);setRoles(rR.data||[]);setAllMgrs(mR.data||[]);
    }catch{show("Failed to load");}
    finally{setLoading(false);}
  }
  function openEdit(e){
    setEditing(e);
    const mgrIds=(e.managers_list||[]).map(m=>m.id);
    setForm({name:e.name,email:e.email,department_id:e.department_id,secondary_department_id:e.secondary_department_id||"",role_id:e.role_id,manager_ids:mgrIds,status:e.status});
    setModal(true);
  }
  function openAdd(){
    const dept=user?.role==="Manager"?user.department_id:"";
    setEditing(null);setForm({...blank,department_id:dept||""});setModal(true);
  }
  function toggleManager(mgrId){
    const ids=form.manager_ids||[];
    setForm({...form,manager_ids:ids.includes(mgrId)?ids.filter(i=>i!==mgrId):[...ids,mgrId]});
  }
  async function save(){
    try{
      if(editing){
        await empApi.update(editing.id,form);
        setModal(false);
        show("Employee updated");
        load(); // background refresh
      } else {
        const r = await empApi.create(form);
        const newEmp = r.data.data || r.data;
        // Add to list immediately, close popup, then sync in background
        setEmps(prev => [...prev, newEmp]);
        setModal(false);
        show("Employee created");
        load(); // background refresh for full data
      }
    }catch(e){show(e?.response?.data?.error||"Error");}
  }
  async function del(){
    try{await empApi.remove(delId);show("Removed");setDelId(null);await load();}
    catch(e){show(e?.response?.data?.error||"Cannot delete");}
  }
  async function resendInvite(e){
    try{
      await empApi.resendCredentials(e.id);
      show("Credentials sent to "+e.email);
    } catch(err){ show(err?.response?.data?.error||"Failed to resend"); }
  }
  function copyLink(link){navigator.clipboard.writeText(link).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);}

  const scopeCfg=getAccessConfig();
  // Manager: backend already returns dept-employees + cross-dept direct reports — show all of them
  // Other roles with _team_only flag: apply client-side dept filter
  const restrictToTeam=user?.role!=="Manager"&&!!(scopeCfg[user?.role]?._team_only?.view);
  const teamEmps=restrictToTeam&&user?.department_id
    ?emps.filter(e=>String(e.department_id)===String(user.department_id))
    :emps;
  const filtered=teamEmps.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())||e.email.toLowerCase().includes(search.toLowerCase()));
  const pendingCount=teamEmps.filter(e=>e.invite_status==="pending").length;

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:18}}>
        <button onClick={openAdd} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Add Employee</button>
      </div>
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
        <input placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inputS,maxWidth:280}}/>
      </div>
      {loading?<Spinner/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["Employee","Email","Department","Role","Manager","Status","Invite",""].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map(e=>(
                  <tr key={e.id}>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:"#312e81",color:"#a5b4fc",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{e.name[0]}</div>
                        <span style={{color:"#111827",fontWeight:600}}>{e.name}</span>
                      </div>
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#9ca3af",fontSize:13}}>{e.email}</td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#4b5563"}}>
                      <div>{e.department||"—"}</div>
                      {e.secondary_department&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{e.secondary_department}</div>}
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:ROLE_BG[e.role]||"#f8f9fb",color:ROLE_C[e.role]||"#475569"}}>{e.role||"—"}</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      {(e.managers_list&&e.managers_list.length>0)
                        ?<div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                          {e.managers_list.map(m=>(
                            <span key={m.id} style={{padding:"2px 7px",borderRadius:20,fontSize:11,fontWeight:600,background:"#eff6ff",color:"#1d4ed8",whiteSpace:"nowrap"}}>{m.name}</span>
                          ))}
                        </div>
                        :<span style={{color:"#9ca3af"}}>—</span>}
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:e.status==="active"?"#ecfdf5":"#fffbeb",color:e.status==="active"?"#059669":"#d97706"}}>{e.status}</span></td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      {e.invite_status==="pending"
                        ?<button onClick={()=>resendInvite(e)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:6,border:"1px solid #fed7aa",background:"#fff7ed",color:"#c2410c",fontSize:11,fontWeight:600,cursor:"pointer"}}>✉️ Resend</button>
                        :<span style={{fontSize:11,color:"#059669",fontWeight:500}}>✅ Accepted</span>}
                    </td>
                    <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                      <div style={{display:"flex",gap:2}}>
                        <button onClick={()=>openEdit(e)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>✏️</button>
                        <button onClick={()=>setDelId(e.id)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#9ca3af"}}>No employees found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing?"Edit Employee":"Add Employee"} width={500}>
        <div style={{padding:"18px 20px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Full Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. John Doe" style={inputS}/></div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Email *</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="john@company.com" style={inputS}/></div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Department</label>
              <select value={form.department_id} onChange={e=>setForm({...form,department_id:e.target.value})} style={inputS} disabled={user?.role==="Manager"}>
                <option value="">Select department</option>
                {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {user?.role==="Manager"&&<span style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Employees are added to your department</span>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Secondary Department</label>
              <select value={form.secondary_department_id} onChange={e=>setForm({...form,secondary_department_id:e.target.value})} style={inputS}>
                <option value="">None</option>
                {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Role</label>
              <select value={form.role_id} onChange={e=>setForm({...form,role_id:e.target.value})} style={inputS}>
                <option value="">Select role</option>
                {roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {roles.find(r=>String(r.id)===String(form.role_id))?.name !== 'Admin' && (
            <div style={{display:"flex",flexDirection:"column",gap:4,gridColumn:"span 2"}}><label style={labelS}>Reporting Managers <span style={{fontWeight:400,color:"#9ca3af"}}>(can select multiple)</span></label>
              <div style={{border:"1px solid #e4e7ec",borderRadius:7,padding:"8px",maxHeight:120,overflowY:"auto",display:"flex",flexWrap:"wrap",gap:5}}>
                {allMgrs.filter(m=>!editing||m.id!==editing.id).map(m=>{
                  const sel=(form.manager_ids||[]).includes(m.id);
                  return(
                    <div key={m.id} onClick={()=>toggleManager(m.id)}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",userSelect:"none",background:sel?"#4f46e5":"#f0f2f5",color:sel?"#fff":"#4b5563",border:"1px solid "+(sel?"#4f46e5":"#e4e7ec")}}>
                      {sel&&<span style={{fontSize:10}}>✓</span>}
                      {m.name}
                      {m.department&&<span style={{fontSize:10,opacity:0.7}}>· {m.department}</span>}
                    </div>
                  );
                })}
                {allMgrs.length===0&&<span style={{fontSize:12,color:"#9ca3af"}}>No managers available</span>}
              </div>
              <div style={{fontSize:11,color:"#9ca3af"}}>Click to assign — managers from any department</div>
            </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Status</label>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inputS}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{editing?"Save Changes":"Create Employee"}</button>
        </div>
      </Modal>
      {inviteEmp&&(
        <Modal open={true} onClose={()=>{setInviteEmp(null);setCopied(false);}} title="Invite Sent 🎉" width={480}>
          <div style={{padding:20}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"12px 14px",background:"#f0fdf4",borderRadius:8,border:"1px solid #a7f3d0"}}>
              <div style={{fontSize:28}}>📧</div>
              <div>
                <div style={{fontWeight:700,color:"#059669",fontSize:14}}>Invite email sent!</div>
                <div style={{fontSize:12,color:"#374151",marginTop:2}}>An invitation was sent to <strong>{inviteEmp.email}</strong></div>
              </div>
            </div>
            <div style={{fontSize:13,color:"#374151",marginBottom:8,fontWeight:500}}>Or share this link manually:</div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
              <div style={{flex:1,padding:"9px 12px",background:"#f8f9fb",border:"1px solid #e4e7ec",borderRadius:7,fontSize:12,color:"#374151",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inviteUrl||"Generating…"}</div>
              <button onClick={()=>copyLink(inviteUrl)} style={{padding:"9px 16px",borderRadius:7,border:"none",background:copied?"#059669":"#4f46e5",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>{copied?"✓ Copied!":"Copy"}</button>
            </div>
            <div style={{fontSize:12,color:"#6b7280"}}>⏰ Link expires in 48 hours · 🔒 One-time use</div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
            <button onClick={()=>{setInviteEmp(null);setCopied(false);show("Invite sent to "+inviteEmp.email);}} style={{padding:"8px 16px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Done</button>
          </div>
        </Modal>
      )}
      <Modal open={!!delId} onClose={()=>setDelId(null)} title="Remove Employee" width={360}>
        <div style={{padding:"18px 20px"}}><p style={{fontSize:14,color:"#4b5563",lineHeight:1.6}}>Are you sure you want to remove this employee?</p></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setDelId(null)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={del} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#dc2626",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Remove</button>
        </div>
      </Modal>
      <Toast msg={msg}/>
    </div>
  );
}

// ─── LICENSES ────────────────────────────────────────────────────────────────
function Licenses(){
  const [licenses,setLicenses]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:"",description:"",status:"active"});
  const {msg,show}=useToast();

  useEffect(()=>{load();},[]);
  async function load(){
    try{const r=await licApi.getAll();setLicenses(r.data||[]);}
    catch{show("Failed to load");}
    finally{setLoading(false);}
  }
  async function save(){
    try{
      if(editing){await licApi.update(editing.id,form);show("Updated");}
      else{await licApi.create(form);show("License created");}
      await load();setModal(false);
    }catch(e){show(e?.response?.data?.error||"Error");}
  }
  async function del(id){
    try{await licApi.remove(id);show("Deleted");await load();}
    catch(e){show(e?.response?.data?.error||"Cannot delete — customers assigned");}
  }
  function openEdit(l){setEditing(l);setForm({name:l.name,description:l.description||"",status:l.status});setModal(true);}

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:18}}>
        <button onClick={()=>{setEditing(null);setForm({name:"",description:"",status:"active"});setModal(true);}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Add License</button>
      </div>
      {loading?<Spinner/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["#","License Name","Description","Customers","Status",""].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {licenses.map((l,i)=>{
                  const lc=LICENSE_COLORS[l.name]||{bg:"#f0f2f5",c:"#374151"};
                  return(
                    <tr key={l.id}>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12,color:"#9ca3af"}}>{String(i+1).padStart(2,"0")}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,background:lc.bg,color:lc.c}}>{l.name}</span></td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",color:"#4b5563"}}>{l.description||"—"}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#eff6ff",color:"#2563eb"}}>{l.customer_count||0}</span></td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:l.status==="active"?"#ecfdf5":"#fffbeb",color:l.status==="active"?"#059669":"#d97706"}}>{l.status}</span></td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        <div style={{display:"flex",gap:2}}>
                          <button onClick={()=>openEdit(l)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>✏️</button>
                          <button onClick={()=>del(l.id)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {licenses.length===0&&<tr><td colSpan={6} style={{padding:20,textAlign:"center",color:"#9ca3af"}}>No licenses yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing?"Edit License":"Add License"} width={420}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>License Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Sandman Pro" style={inputS}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Brief description" style={inputS}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Status</label>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inputS}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{editing?"Save Changes":"Add License"}</button>
        </div>
      </Modal>
      <Toast msg={msg}/>
    </div>
  );
}

// ─── CUSTOMER MASTER ─────────────────────────────────────────────────────────
function CustomerMaster(){
  const [customers,setCustomers]=useState([]);
  const [licenses,setLicenses]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [delId,setDelId]=useState(null);
  const [form,setForm]=useState({name:"",license_id:"",status:"active"});
  const [search,setSearch]=useState("");
  const [statusF,setStatusF]=useState("");
  const [licF,setLicF]=useState("");
  const {msg,show}=useToast();
  const selS={padding:"6px 9px",fontSize:12,border:"1px solid #e4e7ec",borderRadius:6,background:"#fff",color:"#111827",outline:"none",cursor:"pointer"};

  useEffect(()=>{load();},[]);
  async function load(){
    try{
      const [cR,lR]=await Promise.all([custApi.getAll(),licApi.getAll({status:"active"})]);
      setCustomers(cR.data||[]);setLicenses(lR.data||[]);
    }catch{show("Failed to load");}
    finally{setLoading(false);}
  }
  async function save(){
    try{
      if(editing){await custApi.update(editing.id,form);show("Updated");}
      else{await custApi.create(form);show("Customer added");}
      await load();setModal(false);
    }catch(e){show(e?.response?.data?.error||"Error");}
  }
  async function del(){
    try{await custApi.remove(delId);show("Deleted");setDelId(null);await load();}
    catch(e){show(e?.response?.data?.error||"Cannot delete");}
  }
  function openEdit(c){setEditing(c);setForm({name:c.name,license_id:c.license_id||"",status:c.status});setModal(true);}

  const filtered=customers.filter(c=>{
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase()))return false;
    if(statusF&&c.status!==statusF)return false;
    if(licF&&String(c.license_id)!==String(licF))return false;
    return true;
  });
  const activeCount=customers.filter(c=>c.status==="active").length;
  const kpis=[
    {label:"Total",value:customers.length,icon:"🏢",accent:"#4f46e5",bg:"#ede9fe"},
    {label:"Active",value:activeCount,icon:"✅",accent:"#059669",bg:"#ecfdf5"},
    {label:"Inactive",value:customers.length-activeCount,icon:"⛔",accent:"#dc2626",bg:"#fef2f2"},
    {label:"Licenses Used",value:[...new Set(customers.filter(c=>c.status==="active"&&c.license_id).map(c=>c.license_id))].length,icon:"🔑",accent:"#d97706",bg:"#fef9c3"},
  ];

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:16}}>
        <button onClick={()=>{setEditing(null);setForm({name:"",license_id:"",status:"active"});setModal(true);}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Add Customer</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:9,padding:"12px 14px",boxShadow:"0 1px 2px rgba(0,0,0,.05)",borderLeft:"3px solid "+k.accent,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:7,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{k.icon}</div>
            <div><div style={{fontSize:11,color:"#6b7280",fontWeight:500}}>{k.label}</div><div style={{fontSize:20,fontWeight:700,color:k.accent,lineHeight:1.2}}>{k.value}</div></div>
          </div>
        ))}
      </div>
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"12px 14px",marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"flex-end"}}>
          <div style={{display:"flex",flexDirection:"column",gap:3,flex:1,minWidth:180}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Search</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Customer name…" style={{...selS,flex:1}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:160}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>License</div>
            <select value={licF} onChange={e=>setLicF(e.target.value)} style={selS}>
              <option value="">All Licenses</option>
              {licenses.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:120}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Status</div>
            <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={selS}>
              <option value="">All</option><option>Active</option><option>Inactive</option>
            </select>
          </div>
          {(search||statusF||licF)&&<button onClick={()=>{setSearch("");setStatusF("");setLicF("");}} style={{padding:"6px 12px",fontSize:12,borderRadius:6,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontWeight:600,alignSelf:"flex-end"}}>✕ Clear</button>}
          <span style={{fontSize:11,color:"#9ca3af",alignSelf:"flex-end",marginLeft:"auto"}}>{filtered.length} of {customers.length}</span>
        </div>
      </div>
      {loading?<Spinner/>:(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["#","Customer Name","License","Status",""].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((c,i)=>{
                  const lc=LICENSE_COLORS[c.license_name]||{bg:"#f0f2f5",c:"#374151"};
                  return(
                    <tr key={c.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12,color:"#9ca3af"}}>{String(i+1).padStart(2,"0")}</td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#312e81,#4f46e5)",color:"#e0e7ff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{c.name[0]}</div>
                          <span style={{fontWeight:600,color:"#111827",fontSize:14}}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        {c.license_name?<span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,background:lc.bg,color:lc.c}}>{c.license_name}</span>:<span style={{color:"#9ca3af",fontSize:12}}>—</span>}
                      </td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}><span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:c.status==="active"?"#ecfdf5":"#f1f5f9",color:c.status==="active"?"#059669":"#64748b"}}>{c.status}</span></td>
                      <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                        <div style={{display:"flex",gap:2}}>
                          <button onClick={()=>openEdit(c)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>✏️</button>
                          <button onClick={()=>setDelId(c.id)} style={{padding:5,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",fontSize:13}}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No customers found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing?"Edit Customer":"Add Customer"} width={420}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Customer Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Lakshmi Foundries" style={inputS}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>License</label>
            <select value={form.license_id} onChange={e=>setForm({...form,license_id:e.target.value})} style={inputS}>
              <option value="">No License</option>
              {licenses.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Status</label>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inputS}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setModal(false)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{editing?"Save Changes":"Add Customer"}</button>
        </div>
      </Modal>
      <Modal open={!!delId} onClose={()=>setDelId(null)} title="Delete Customer" width={360}>
        <div style={{padding:"18px 20px",color:"#374151",fontSize:13}}>Are you sure? This cannot be undone.</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #f0f2f5"}}>
          <button onClick={()=>setDelId(null)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#4b5563",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={del} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#dc2626",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Delete</button>
        </div>
      </Modal>
      <Toast msg={msg}/>
    </div>
  );
}

// ─── ACCESS CONFIG CONSTANTS ──────────────────────────────────────────────────
const NAV_PAGES=[
  {key:"dashboard",  label:"Dashboard",      icon:"📊"},
  {key:"worklog",    label:"Worklog",         icon:"📝"},
  {key:"visits",     label:"Customer Visits", icon:"👥"},
  {key:"projects",   label:"Projects",        icon:"📁"},
  {key:"masterdata", label:"Master Data",     icon:"🗄️"},
  {key:"reports",    label:"Reports",         icon:"📈"},
  {key:"admin",      label:"Administration",  icon:"⚙️"},
  {key:"library",    label:"Library",         icon:"🎬"},
];
const MD_TABS=[
  {key:"employees",   label:"Employee Master",  icon:"👥"},
  {key:"departments", label:"Department Master", icon:"🏢"},
  {key:"roles",       label:"Role Master",       icon:"🔐"},
  {key:"licenses",    label:"License Master",    icon:"🔑"},
  {key:"customers",   label:"Customer Master",   icon:"🤝"},
  {key:"emailconfig", label:"Email Config",      icon:"📧"},
  {key:"accessconfig",label:"Access Config",     icon:"🛡️"},
];
const ROLES_LIST=["Admin","Manager","User"];
const ROLE_META={
  Admin:  {color:"#4f46e5",bg:"#ede9fe",desc:"Full system access"},
  Manager:{color:"#f59e0b",bg:"#fffbeb",desc:"Team & project management"},
  User:   {color:"#10b981",bg:"#ecfdf5",desc:"Personal task tracking"},
};
const PERMS=[
  {k:"view",   title:"View",   color:"#4f46e5",bg:"#ede9fe"},
  {k:"create", title:"Create", color:"#059669",bg:"#ecfdf5"},
  {k:"update", title:"Update", color:"#d97706",bg:"#fffbeb"},
  {k:"delete", title:"Delete", color:"#dc2626",bg:"#fef2f2"},
];
const BLANK={view:false,create:false,update:false,delete:false};
const DEFAULT_ACCESS={
  Admin:{
    dashboard: {view:true, create:true, update:true, delete:true},
    worklog:   {view:true, create:true, update:true, delete:true},
    visits:    {view:true, create:true, update:true, delete:true},
    projects:  {view:true, create:true, update:true, delete:true},
    masterdata:{view:true, create:true, update:true, delete:true},
    reports:   {view:true, create:true, update:true, delete:true},
    admin:     {view:true, create:true, update:true, delete:true},
    library:   {view:true, create:true, update:true, delete:true},
    md_employees:   {view:true, create:true, update:true, delete:true},
    md_departments: {view:true, create:true, update:true, delete:true},
    md_roles:       {view:true, create:true, update:true, delete:true},
    md_licenses:    {view:true, create:true, update:true, delete:true},
    md_customers:   {view:true, create:true, update:true, delete:true},
    md_emailconfig: {view:true, create:false,update:true, delete:false},
    md_accessconfig:{view:true, create:false,update:true, delete:false},
    _team_only:     {view:false,create:false,update:false,delete:false},
  },
  Manager:{
    dashboard: {view:true, create:false,update:false,delete:false},
    worklog:   {view:true, create:true, update:true, delete:true},
    visits:    {view:true, create:true, update:true, delete:false},
    projects:  {view:true, create:true, update:true, delete:false},
    masterdata:{view:true, create:false,update:false,delete:false},
    reports:   {view:true, create:false,update:false,delete:false},
    admin:     {view:false,create:false,update:false,delete:false},
    library:   {view:true, create:false,update:false,delete:false},
    md_employees:   {view:true, create:true, update:true, delete:false},
    md_departments: {view:false,create:false,update:false,delete:false},
    md_roles:       {view:false,create:false,update:false,delete:false},
    md_licenses:    {view:false,create:false,update:false,delete:false},
    md_customers:   {view:true, create:true, update:true, delete:false},
    md_emailconfig: {view:false,create:false,update:false,delete:false},
    md_accessconfig:{view:false,create:false,update:false,delete:false},
    _team_only:     {view:true, create:false,update:false,delete:false},
  },
  User:{
    dashboard: {view:true, create:false,update:false,delete:false},
    worklog:   {view:true, create:true, update:true, delete:true},
    visits:    {view:false,create:false,update:false,delete:false},
    projects:  {view:true, create:false,update:false,delete:false},
    masterdata:{view:false,create:false,update:false,delete:false},
    reports:   {view:false,create:false,update:false,delete:false},
    admin:     {view:false,create:false,update:false,delete:false},
    library:   {view:true, create:false,update:false,delete:false},
    md_employees:   {view:false,create:false,update:false,delete:false},
    md_departments: {view:false,create:false,update:false,delete:false},
    md_roles:       {view:false,create:false,update:false,delete:false},
    md_licenses:    {view:false,create:false,update:false,delete:false},
    md_customers:   {view:false,create:false,update:false,delete:false},
    md_emailconfig: {view:false,create:false,update:false,delete:false},
    md_accessconfig:{view:false,create:false,update:false,delete:false},
    _team_only:     {view:false,create:false,update:false,delete:false},
  },
};
export const ACCESS_KEY="mpulse_access_config";
export function getAccessConfig(){
  try{
    const s=localStorage.getItem(ACCESS_KEY);
    if(!s)return DEFAULT_ACCESS;
    const stored=JSON.parse(s);
    // Merge stored with defaults so newly added keys are always present
    const merged={};
    for(const role of ROLES_LIST){
      merged[role]={...DEFAULT_ACCESS[role],...(stored[role]||{})};
    }
    return merged;
  }catch{return DEFAULT_ACCESS;}
}

// ─── PERM ROW ─────────────────────────────────────────────────────────────────
function PermRow({icon,label,perms,locked,onToggle,isLast}){
  return(
    <div style={{display:"flex",alignItems:"center",padding:"11px 20px",borderBottom:isLast?"none":"1px solid #f3f4f6",transition:"background 0.12s"}}
      onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
    >
      <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:16,lineHeight:1}}>{icon}</span>
        <span style={{fontSize:13,fontWeight:600,color:"#111827"}}>{label}</span>
        {locked&&<span style={{fontSize:9,fontWeight:700,color:"#6b7280",background:"#f3f4f6",padding:"2px 7px",borderRadius:10,letterSpacing:"0.05em",border:"1px solid #e4e7ec"}}>LOCKED</span>}
      </div>
      <div style={{display:"flex"}}>
        {PERMS.map(p=>{
          const checked=locked||!!perms[p.k];
          const disabled=!locked&&p.k!=="view"&&!perms.view;
          return(
            <div key={p.k} style={{width:88,display:"flex",justifyContent:"center",alignItems:"center"}}>
              <div
                onClick={()=>!locked&&!disabled&&onToggle(p.k)}
                title={locked?"Locked":(disabled?"Enable View first":p.title)}
                style={{
                  width:18,height:18,
                  borderRadius:4,
                  border:`2px solid ${checked?p.color:disabled?"#e4e7ec":"#d1d5db"}`,
                  background:checked?p.color:"#fff",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:locked||disabled?"not-allowed":"pointer",
                  opacity:disabled&&!checked?0.3:1,
                  transition:"all 0.15s",
                  flexShrink:0,
                  boxShadow:checked?`0 0 0 3px ${p.color}22`:"none",
                }}
              >
                {checked&&(
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ACCESS CONFIG COMPONENT ──────────────────────────────────────────────────
function AccessConfig(){
  const {msg,show}=useToast();
  const [roles,setRoles]=useState([]);
  const [selectedRole,setSelectedRole]=useState(null);
  const [cfg,setCfg]=useState({});
  const [dirty,setDirty]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  // Palette for dynamically assigned roles
  const PALETTE=["#4f46e5","#059669","#f59e0b","#dc2626","#8b5cf6","#0ea5e9","#ec4899","#14b8a6"];

  async function load(){
    setLoading(true);
    try{
      const [rolesRes,permRes]=await Promise.all([rolesApi.getAll(),permApi.get()]);
      const roleList=rolesRes.data.map(r=>r.name);
      setRoles(roleList);
      if(!selectedRole||!roleList.includes(selectedRole)) setSelectedRole(roleList[0]||null);

      const ALL_KEYS=[
        ...NAV_PAGES.map(p=>p.key),
        ...MD_TABS.map(t=>"md_"+t.key),
        "_team_only",
      ];

      // Merge API data with defaults so all keys always exist
      const merged={};
      let needsDbSync=false;
      for(const role of roleList){
        const def=DEFAULT_ACCESS[role]||{};
        const stored=permRes.data[role]||{};
        merged[role]={...def,...stored};
        for(const key of ALL_KEYS){
          if(!merged[role][key]) merged[role][key]={...BLANK};
          // Track if DB is missing any key (needs back-fill)
          if(!(key in stored)) needsDbSync=true;
        }
      }
      setCfg(merged);
      // Sync to localStorage for synchronous nav reads
      localStorage.setItem(ACCESS_KEY,JSON.stringify(merged));
      // Auto-save any missing keys back to DB so defaults are persisted
      if(needsDbSync){
        try{ await permApi.update(merged); }
        catch{ /* silent – will be retried on next manual save */ }
      }
    }catch{ show("Failed to load permissions"); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); },[]);

  function toggle(key,perm){
    setCfg(prev=>{
      const cur=prev[selectedRole]?.[key]||BLANK;
      const wasOn=cur[perm];
      const isView=perm==="view";
      return{...prev,[selectedRole]:{...prev[selectedRole],[key]:{
        ...cur,[perm]:!wasOn,
        ...(isView&&wasOn?{create:false,update:false,delete:false}:{}),
        ...(!isView&&!wasOn&&!cur.view?{view:true}:{}),
      }}};
    });
    setDirty(true);
  }

  async function save(){
    setSaving(true);
    try{
      await permApi.update(cfg);
      localStorage.setItem(ACCESS_KEY,JSON.stringify(cfg));
      window.dispatchEvent(new Event("mpulse-access-change"));
      show("Saved & applied to all sessions");
      setDirty(false);
    }catch{ show("Save failed"); }
    finally{ setSaving(false); }
  }

  function reset(){ load(); setDirty(false); show("Reloaded from database"); }

  function toggleTeamOnly(){
    const cur=!!(cfg[selectedRole]?._team_only?.view);
    setCfg(prev=>({...prev,[selectedRole]:{...prev[selectedRole],_team_only:{view:!cur,create:false,update:false,delete:false}}}));
    setDirty(true);
  }

  function countAccess(role){
    const all=[...NAV_PAGES.map(p=>p.key),...MD_TABS.map(t=>"md_"+t.key)];
    const n=all.filter(k=>cfg[role]?.[k]?.view).length;
    return `${n}/${all.length}`;
  }

  function getRoleColor(role){
    const fixed={Admin:"#4f46e5",Manager:"#f59e0b",User:"#10b981"};
    if(fixed[role]) return fixed[role];
    const idx=roles.indexOf(role)%PALETTE.length;
    return PALETTE[idx];
  }  
                   
  function renderSection(heading,items,prefix=""){
    return(
      <>
        <div style={{padding:"9px 20px",background:"#f8f9fb",borderTop:"1px solid #e4e7ec",borderBottom:"1px solid #e4e7ec",display:"flex",alignItems:"center"}}>
          <div style={{flex:1}}>
            <span style={{fontSize:10,fontWeight:800,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.08em"}}>{heading}</span>
          </div>
          <div style={{display:"flex"}}>
            {PERMS.map(p=>(
              <div key={p.k} style={{width:88,display:"flex",justifyContent:"center"}}>
                <span style={{fontSize:10,fontWeight:800,color:p.color,textTransform:"uppercase",letterSpacing:"0.06em"}}>{p.title}</span>
              </div>
            ))}
          </div>
        </div>
        {items.map((item,i)=>{
          const key=prefix+item.key;
          const locked=key==="admin"&&selectedRole==="Admin";
          const perms=locked?{view:true,create:true,update:true,delete:true}:(cfg[selectedRole]?.[key]||BLANK);
          return(
            <PermRow key={key} icon={item.icon} label={item.label} perms={perms}
              locked={locked} onToggle={perm=>toggle(key,perm)} isLast={i===items.length-1}/>
          );
        })}
      </>
    );
  }

  if(loading) return <Spinner/>;

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:24}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {dirty&&<span style={{fontSize:11,color:"#d97706",fontWeight:600,padding:"4px 10px",borderRadius:20,background:"#fffbeb",border:"1px solid #fde68a"}}>● Unsaved</span>}
          <button onClick={reset} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #e4e7ec",background:"#fff",color:"#6b7280",fontSize:13,fontWeight:600,cursor:"pointer"}}>↺ Reload</button>
          {selectedRole&&(
            <button onClick={()=>{
              const def=DEFAULT_ACCESS[selectedRole];
              if(!def)return;
              setCfg(prev=>({...prev,[selectedRole]:{...def}}));
              setDirty(true);
              show(`${selectedRole} reset to defaults — click Save to apply`);
            }} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #e4e7ec",background:"#fff",color:"#dc2626",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              ↺ Defaults
            </button>
          )}
          <button onClick={save} disabled={saving||!dirty}
            style={{padding:"8px 18px",borderRadius:8,border:"none",background:dirty&&!saving?"#4f46e5":"#94a3b8",color:"#fff",fontSize:13,fontWeight:600,cursor:dirty&&!saving?"pointer":"not-allowed",transition:"background 0.2s"}}>
            {saving?"Saving…":"💾 Save & Apply"}
          </button>
        </div>
      </div>

      {/* Role selector dropdown */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"12px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <span style={{fontSize:12,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em",flexShrink:0}}>Selected Role</span>
        <select value={selectedRole||""} onChange={e=>setSelectedRole(e.target.value)}
          style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid #e4e7ec",fontSize:13,fontWeight:600,color:"#10b981",background:"#f8f9fb",cursor:"pointer",outline:"none"}}>
          {roles.map(role=>(
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        {selectedRole&&(
          <span style={{fontSize:11,fontWeight:600,color:"#9ca3af",flexShrink:0}}>
            {countAccess(selectedRole)} pages accessible
          </span>
        )}
      </div>

      {selectedRole&&(
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
          {renderSection("Navigation Pages",NAV_PAGES)}
          {renderSection("Master Data Tabs",MD_TABS,"md_")}

          {/* ── DATA SCOPE ── */}
          <div style={{borderTop:"2px solid #e4e7ec",background:"#fafbfc"}}>
            <div style={{padding:"9px 20px",background:"#f8f9fb",borderBottom:"1px solid #e4e7ec"}}>
              <span style={{fontSize:10,fontWeight:800,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.08em"}}>Data Scope</span>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f5f6f8"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>Restrict to Own Team/Department</div>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:3}}>When enabled, this role sees only data belonging to their department or employees who directly report to them — enforced server-side regardless of other permission settings.</div>
              </div>
              {/* Toggle switch */}
              {(()=>{
                const on=!!(cfg[selectedRole]?._team_only?.view);
                return(
                  <div onClick={toggleTeamOnly}
                    style={{width:44,height:24,borderRadius:12,background:on?"#4f46e5":"#d1d5db",position:"relative",cursor:"pointer",transition:"background 0.2s",flexShrink:0,marginLeft:24}}
                  >
                    <div style={{position:"absolute",top:3,left:on?23:3,width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.25)",transition:"left 0.2s"}}/>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {selectedRole==="Admin"&&(
        <div style={{marginTop:12,padding:"10px 16px",borderRadius:8,background:"#eff6ff",border:"1px solid #bfdbfe",fontSize:12,color:"#1d4ed8",display:"flex",alignItems:"center",gap:8}}>
          ℹ️ <span><strong>Admin</strong> always retains full access to Administration — this permission is locked.</span>
        </div>
      )}
      <Toast msg={msg}/>
    </div>
  );
}

// ─── EMAIL CONFIG ─────────────────────────────────────────────────────────────
function EmailConfig(){
  const [cfg,setCfg]         = useState({from_email:"",app_password_masked:"",is_configured:false,updated_at:null});
  const [form,setForm]       = useState({from_email:"",app_password:""});
  const [notifCfg,setNotifCfg] = useState({admin_email:"",visit_reminder_enabled:true,email_notif:true});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving]   = useState(false);
  const [savingNotif,setSavingNotif] = useState(false);
  const [testing,setTesting] = useState(false);
  const [showPass,setShowPass] = useState(false);
  const {msg,show} = useToast();

  useEffect(()=>{ load(); },[]);

  async function load(){
    try{
      const [eR,sR] = await Promise.all([emailSettingsApi.get(), settingsApi.get()]);
      setCfg(eR.data);
      setForm({from_email:eR.data.from_email||"", app_password:""});
      setNotifCfg({
        admin_email:             sR.data?.admin_email||"",
        visit_reminder_enabled:  sR.data?.visit_reminder_enabled ?? true,
        email_notif:             sR.data?.email_notif ?? true,
      });
    }catch{ show("Failed to load email settings"); }
    finally{ setLoading(false); }
  }

  async function save(){
    if(!form.from_email){show("Gmail address is required");return;}
    if(!cfg.is_configured && !form.app_password){show("App Password is required");return;}
    setSaving(true);
    const payload = { from_email: form.from_email };
    if(form.app_password) payload.app_password = form.app_password;
    try{ await emailSettingsApi.update(payload); show("Sender email saved ✓"); await load(); }
    catch(e){ show(e?.response?.data?.error||"Save failed"); }
    finally{ setSaving(false); }
  }

  async function saveNotif(){
    if(notifCfg.admin_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifCfg.admin_email)){
      show("Invalid admin email format"); return;
    }
    setSavingNotif(true);
    try{
      // Fetch full settings first to not overwrite other fields
      const sR = await settingsApi.get();
      await settingsApi.update({...sR.data, ...notifCfg});
      show("Notification settings saved ✓");
    }catch(e){ show(e?.response?.data?.error||"Save failed"); }
    finally{ setSavingNotif(false); }
  }

  async function testConn(){
    setTesting(true);
    try{ const r=await emailSettingsApi.test(); show(r.data.message); }
    catch(e){ show("❌ "+(e?.response?.data?.error||"Test failed")); }
    finally{ setTesting(false); }
  }

  function Toggle({label,desc,k}){
    return(
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{label}</div>
          {desc&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{desc}</div>}
        </div>
        <div onClick={()=>setNotifCfg(p=>({...p,[k]:!p[k]}))}
          style={{width:40,height:22,borderRadius:11,background:notifCfg[k]?"#4f46e5":"#eef0f4",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0,border:"1px solid #e4e7ec",marginLeft:16}}>
          <div style={{position:"absolute",top:2,left:notifCfg[k]?20:2,width:16,height:16,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"left .2s"}}/>
        </div>
      </div>
    );
  }

  if(loading) return <Spinner/>;

  return(
    <div style={{width:"100%"}}>
      <div style={{marginBottom:20}}></div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>

        {/* ── Left: Sender (Gmail SMTP) ── */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"20px",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>📤 Sender Account (Gmail SMTP)</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Gmail Address <span style={{color:"#dc2626"}}>*</span></label>
                <input type="email" value={form.from_email} onChange={e=>setForm({...form,from_email:e.target.value})} placeholder="e.g. arshiya@mpminfosoft.com" style={inputS}/>
                <span style={{fontSize:11,color:"#9ca3af"}}>Appears as the sender of all system emails.</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={labelS}>Gmail App Password <span style={{color:"#dc2626"}}>*</span></label>
                {cfg.is_configured && !showPass ? (
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{...inputS,flex:1,color:"#6b7280",letterSpacing:3,fontSize:16,padding:"9px 12px"}}>••••••••••••••••</div>
                    <button onClick={()=>setShowPass(true)}
                      style={{padding:"8px 14px",borderRadius:7,border:"1px solid #e4e7ec",background:"#fff",color:"#4f46e5",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                      Edit
                    </button>
                  </div>
                ) : (
                  <div style={{position:"relative"}}>
                    <input type="password" value={form.app_password}
                      onChange={e=>setForm({...form,app_password:e.target.value})}
                      placeholder="Enter new 16-character app password"
                      autoComplete="new-password"
                      style={{...inputS,paddingRight:42}}
                      autoFocus={cfg.is_configured}/>
                    {cfg.is_configured && (
                      <button onClick={()=>{setShowPass(false);setForm({...form,app_password:""});}}
                        style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#9ca3af"}}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
                <span style={{fontSize:11,color:"#9ca3af"}}>Not your login password — this is a 16-char <strong>App Password</strong>.</span>
              </div>
              <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:8}}>📋 How to get a Gmail App Password</div>
                {["Go to myaccount.google.com","Security → 2-Step Verification (must be on)","Scroll down → App passwords",'App name: "MPulse" → Create',"Copy the 16-char password","Paste it above"].map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,fontSize:11,color:"#1e40af",marginBottom:i<5?4:0}}>
                    <span style={{width:16,height:16,borderRadius:"50%",background:"#1d4ed8",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</span>
                    {s}
                  </div>
                ))}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
                  style={{display:"inline-block",marginTop:8,fontSize:11,color:"#1d4ed8",fontWeight:600}}>→ Open App Passwords ↗</a>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={save} disabled={saving}
                  style={{padding:"8px 18px",borderRadius:7,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer",opacity:saving?0.8:1}}>
                  {saving?"Saving…":"💾 Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Notification Settings ── */}
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"20px",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>🔔 Notification Settings</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Admin Email <span style={{color:"#dc2626"}}>*</span> <span style={{fontWeight:400,color:"#9ca3af"}}>(receives visit alerts & due reminders)</span></label>
              <input type="email" value={notifCfg.admin_email}
                onChange={e=>setNotifCfg(p=>({...p,admin_email:e.target.value}))}
                placeholder="admin@company.com" style={inputS}/>
              <span style={{fontSize:11,color:"#9ca3af"}}>This email receives visit scheduled notifications and daily due-visit reminders.</span>
            </div>

            <div style={{background:"#f8f9fb",border:"1px solid #e4e7ec",borderRadius:8,padding:"4px 14px"}}>
              <Toggle label="Email Notifications" desc="Master switch — enables all system emails" k="email_notif"/>
              <Toggle label="Visit Due Reminders" desc="Daily 9 AM alert for overdue/due-today visits" k="visit_reminder_enabled"/>
            </div>

            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#92400e",lineHeight:1.6}}>
              <strong>Visit Scheduled Notification</strong> — when a visit is created, a notification email is sent to Admin Email with optional CC recipients you specify at the time of scheduling.
            </div>

            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <button onClick={saveNotif} disabled={savingNotif}
                style={{padding:"8px 20px",borderRadius:7,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:savingNotif?"not-allowed":"pointer",opacity:savingNotif?0.8:1}}>
                {savingNotif?"Saving…":"💾 Save Notifications"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast msg={msg}/>
    </div>
  );
}

// ─── MASTER DATA (tab container) ──────────────────────────────────────────────
export default function MasterData(){
  const {user}=useAuth();
  const ALL_TABS=[
    {key:"employees",   label:"Employee Master",   icon:"👥"},
    {key:"departments", label:"Department Master",  icon:"🏢"},
    {key:"roles",       label:"Role Master",        icon:"🔐"},
    {key:"licenses",    label:"License Master",     icon:"🔑"},
    {key:"customers",   label:"Customer Master",    icon:"🤝"},
    {key:"emailconfig", label:"Email Config",       icon:"📧"},
    {key:"accessconfig",label:"Access Config",      icon:"🛡️"},
    {key:"categories",  label:"Categories",         icon:"🏷️"},
    {key:"formulas",    label:"Formulas",           icon:"🧮", adminOnly:true},
  ];
  const tabCfg=getAccessConfig();
  const TABS=ALL_TABS.filter(t=>{
    if(t.adminOnly) return user.role==="Admin";
    return tabCfg[user.role]?.["md_"+t.key]?.view??false;
  });
  const [tab,setTab]=useState("employees");
  return(
    <div>
      <div style={{display:"flex",gap:0,marginBottom:20,background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:3,boxShadow:"0 1px 3px rgba(0,0,0,.05)",flexWrap:"wrap"}}>
        {TABS.map(t=>{
          const active=tab===t.key;
          return(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:7,border:"none",background:active?"#4f46e5":"transparent",color:active?"#fff":"#6b7280",fontSize:13,fontWeight:active?700:500,cursor:"pointer",whiteSpace:"nowrap"}}>
              <span style={{fontSize:13}}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>
      {tab==="employees"  &&<Employees/>}
      {tab==="departments"&&<Departments/>}
      {tab==="roles"      &&<Roles/>}
      {tab==="licenses"   &&<Licenses/>}
      {tab==="customers"  &&<CustomerMaster/>}
      {tab==="emailconfig" &&<EmailConfig/>}
      {tab==="accessconfig"&&<AccessConfig/>}
      {tab==="categories"  &&<CategoriesConfig/>}
      {tab==="formulas"    &&<FormulasRef/>}
    </div>
  );
}

// ─── CATEGORIES CONFIG ────────────────────────────────────────────────────────
export const DEFAULT_CATS = ["Task Handling","Development","Testing","Analysis","Design","Support","Meeting","Documentation"];

function CategoriesConfig(){
  const [cats,setCats]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(true);
  const [currentSettings,setCurrentSettings]=useState(null);
  const {msg,show}=useToast();

  useEffect(()=>{
    settingsApi.get()
      .then(r=>{
        setCurrentSettings(r.data);
        const raw=r.data?.work_categories;
        try {
          // Handle multiple levels of JSON.stringify (over-escaped DB values)
          let val = raw;
          for(let i=0;i<5;i++){
            if(Array.isArray(val)) break;
            if(typeof val==='string') val=JSON.parse(val);
            else break;
          }
          setCats(Array.isArray(val) ? val : [...DEFAULT_CATS]);
        } catch { setCats([...DEFAULT_CATS]); }
      })
      .catch(()=>show("Failed to load"))
      .finally(()=>setLoading(false));
  },[]);

  async function save(list){
    try{
      const base = currentSettings || {};
      await settingsApi.update({
        company_name:         base.company_name         || "My Company",
        daily_target_mins:    base.daily_target_mins    || 510,
        work_days:            base.work_days            || "Mon-Fri",
        timezone:             base.timezone             || "Asia/Kolkata",
        tat_alert_days:       base.tat_alert_days       || 2,
        email_notif:          base.email_notif          ?? true,
        auto_close:           base.auto_close           ?? false,
        session_timeout:      base.session_timeout      || 30,
        admin_email:          base.admin_email          || null,
        visit_reminder_enabled: base.visit_reminder_enabled ?? true,
        work_categories:      list,
      });
      show("Categories saved");
    }catch(e){ show(e?.response?.data?.error||"Save failed"); }
  }

  function add(){
    const v=input.trim();
    if(!v)return;
    if(cats.includes(v)){show("Already exists");return;}
    const next=[...cats,v].sort((a,b)=>a.localeCompare(b));
    setCats(next); setInput(""); save(next);
  }

  function remove(c){
    const next=cats.filter(x=>x!==c);
    setCats(next); save(next);
  }

  if(loading)return <Spinner/>;
  const sorted=[...cats].sort((a,b)=>a.localeCompare(b));
  return(
    <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
      <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}>
        <span style={{fontSize:13,fontWeight:700}}>🏷️ Work Categories</span>
        <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Used in Worklog task entries — sorted alphabetically</div>
      </div>
      <div style={{padding:20,display:"flex",flexDirection:"column",gap:16}}>
        {/* Add new */}
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
            placeholder="New category name…" style={{...inputS,flex:1}}/>
          <button onClick={add} style={{padding:"0 18px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
        </div>
        {/* Category list — alphabetical */}
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {sorted.map((c)=>(
            <div key={c} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:7,border:"1px solid #e4e7ec",background:"#fafafa"}}>
              <span style={{flex:1,fontSize:13,fontWeight:500,color:"#111827"}}>{c}</span>
              <button onClick={()=>remove(c)} style={{padding:"2px 7px",borderRadius:5,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",fontSize:11,fontWeight:600,cursor:"pointer"}}>✕</button>
            </div>
          ))}
          {cats.length===0&&<div style={{textAlign:"center",padding:20,color:"#9ca3af",fontSize:13}}>No categories. Add one above.</div>}
        </div>
      </div>
      <Toast msg={msg}/>
    </div>
  );
}

// ─── FORMULAS REFERENCE ───────────────────────────────────────────────────────
const FORMULA_DEFAULTS = [
  { section:"Daily Utilization", accent:"#4f46e5", id:"util_pct",    label:"Utilization %",         formula:"(Spent Minutes ÷ Daily Target Minutes) × 100",          example:"480 ÷ 510 × 100 = 94.1 %", source:"settings", sourceKey:"daily_target_mins", sourceLabel:"Daily Target Mins" },
  { section:"Daily Utilization", accent:"#4f46e5", id:"avg_util",    label:"Average Utilization",    formula:"Σ (Task Utilization %) ÷ Count(Tasks)",                  example:"",                          source:"worklog",  sourceLabel:"Worklog entries" },
  { section:"Project TAT",        accent:"#dc2626", id:"target_days", label:"Target Days",            formula:"⌈ (End Date − Start Date) ÷ 86,400,000 ms ⌉ + 1",       example:"",                          source:"project",  sourceLabel:"Project start & end date" },
  { section:"Project TAT",        accent:"#dc2626", id:"ref_date",    label:"Reference Date",         formula:"Closed/Completed → closed_at   |   Otherwise → today",   example:"",                          source:"project",  sourceLabel:"Project status & close date" },
  { section:"Project TAT",        accent:"#dc2626", id:"actual_days", label:"Actual Days",            formula:"max(1,  ⌈ (ref − Start Date) ÷ 86,400,000 ms ⌉ + 1)",   example:"",                          source:"project",  sourceLabel:"Project start date" },
  { section:"Project TAT",        accent:"#dc2626", id:"tat_overrun", label:"TAT Overrun (days)",     formula:"max(0,  Actual Days − Target Days)",                      example:"Target 10d, Actual 23d → 13d late", source:"computed", sourceLabel:"Computed" },
  { section:"Time Distribution",  accent:"#059669", id:"member_pct",  label:"Member Contribution %",  formula:"(Member Total Minutes ÷ All-Member Total Minutes) × 100", example:"",                         source:"worklog",  sourceLabel:"Worklog entries" },
  { section:"Time Distribution",  accent:"#059669", id:"proj_hours",  label:"Total Project Hours",    formula:"Σ (spent_mins for all tasks on project) ÷ 60",            example:"",                          source:"worklog",  sourceLabel:"Worklog entries" },
  { section:"Visit Reminders",    accent:"#f59e0b", id:"upcoming",    label:"Upcoming Reminder",      formula:"planned_date = TODAY + 1 day   AND   status = Planned",   example:"",                          source:"visits",   sourceLabel:"Customer Visits" },
  { section:"Visit Reminders",    accent:"#f59e0b", id:"overdue",     label:"Overdue Alert",          formula:"planned_date < TODAY   AND   status ∉ {Completed, Cancelled}", example:"",                      source:"visits",   sourceLabel:"Customer Visits" },
  { section:"Work Status",        accent:"#8b5cf6", id:"on_time",     label:"On Time completion",     formula:"Task completed within project target days",               example:"",                          source:"worklog",  sourceLabel:"Set in Worklog" },
  { section:"Work Status",        accent:"#8b5cf6", id:"in_progress", label:"In Progress",            formula:"Task is still open",                                      example:"",                          source:"worklog",  sourceLabel:"Set in Worklog" },
  { section:"Work Status",        accent:"#8b5cf6", id:"delayed",     label:"Delayed completion",     formula:"Task completed after project target days",                example:"",                          source:"worklog",  sourceLabel:"Set in Worklog" },
];

const SOURCE_COLORS = {
  settings:  {bg:"#eef2ff",color:"#4f46e5"},
  project:   {bg:"#fffbeb",color:"#b45309"},
  worklog:   {bg:"#ecfdf5",color:"#059669"},
  visits:    {bg:"#fff7ed",color:"#c2410c"},
  computed:  {bg:"#f3f4f6",color:"#6b7280"},
};

function FormulasRef(){
  const [rows,setRows] = useState(FORMULA_DEFAULTS);
  const [liveSettings,setLiveSettings] = useState({});
  const [editId,setEditId] = useState(null);
  const [editVal,setEditVal] = useState({formula:"",example:""});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const {msg,show} = useToast();

  useEffect(()=>{
    settingsApi.get().then(r=>{
      if(r.data){
        setLiveSettings(r.data);
        if(r.data.work_formulas){
          try{
            const saved=JSON.parse(r.data.work_formulas);
            // Merge saved overrides onto defaults (keeps new defaults for new IDs)
            const merged=FORMULA_DEFAULTS.map(def=>{
              const s=saved.find(x=>x.id===def.id);
              return s?{...def,formula:s.formula,example:s.example}:def;
            });
            setRows(merged);
          }catch{}
        }
      }
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  async function persistRows(next){
    setSaving(true);
    try{
      const sR=await settingsApi.get();
      // Only store id/formula/example to keep payload small
      const payload=next.map(r=>({id:r.id,formula:r.formula,example:r.example}));
      await settingsApi.update({...sR.data,work_formulas:payload});
      setRows(next);
    }catch(e){ show(e?.response?.data?.error||"Save failed"); }
    finally{ setSaving(false); }
  }

  function startEdit(row){ setEditId(row.id); setEditVal({formula:row.formula,example:row.example}); }
  function cancelEdit(){ setEditId(null); }
  async function saveEdit(id){
    const next=rows.map(r=>r.id===id?{...r,...editVal}:r);
    await persistRows(next);
    setEditId(null);
    show("Saved");
  }
  async function resetRow(id){
    const def=FORMULA_DEFAULTS.find(r=>r.id===id);
    if(!def)return;
    const next=rows.map(r=>r.id===id?{...r,formula:def.formula,example:def.example}:r);
    await persistRows(next);
    show("Reset to default");
  }
  async function resetAll(){
    await persistRows(FORMULA_DEFAULTS);
    show("All reset to defaults");
  }

  // Group by section
  const sections=[...new Set(rows.map(r=>r.section))];

  if(loading) return <Spinner/>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>Calculation Formulas</div>
          <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>Click ✏️ on any row to edit the formula text and example — saved to the database.</div>
        </div>
        <button onClick={resetAll} disabled={saving}
          style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#6b7280",fontSize:12,fontWeight:600,cursor:saving?"not-allowed":"pointer",opacity:saving?0.6:1}}>
          ↺ Reset All
        </button>
      </div>

      {sections.map(sec=>{
        const secRows=rows.filter(r=>r.section===sec);
        const accent=secRows[0]?.accent||"#4f46e5";
        return(
          <div key={sec} style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
            <div style={{padding:"8px 14px",background:accent+"10",borderBottom:"1px solid "+accent+"25",display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:14,background:accent,borderRadius:2}}/>
              <span style={{fontSize:12,fontWeight:800,color:accent,textTransform:"uppercase",letterSpacing:"0.06em"}}>{sec}</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f8f9fb"}}>
                {["Label","Formula","Source / Live Value","Example",""].map(h=><th key={h} style={{padding:"6px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",borderBottom:"1px solid #f0f2f5"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {secRows.map((row,i)=>{
                  const sc=SOURCE_COLORS[row.source]||SOURCE_COLORS.computed;
                  const def=FORMULA_DEFAULTS.find(d=>d.id===row.id);
                  const liveVal=def?.sourceKey?liveSettings[def.sourceKey]:null;
                  return(
                  <tr key={row.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",fontWeight:600,color:"#374151",whiteSpace:"nowrap",verticalAlign:"middle"}}>{row.label}</td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",verticalAlign:"middle"}}>
                      {editId===row.id
                        ?<textarea value={editVal.formula} onChange={e=>setEditVal(v=>({...v,formula:e.target.value}))} rows={2}
                            style={{width:"100%",padding:"4px 8px",borderRadius:5,border:"1px solid #c7d2fe",fontSize:12,fontFamily:"monospace",resize:"vertical"}}/>
                        :<span style={{fontFamily:"monospace",color:"#1e1b4b"}}>{row.formula}</span>
                      }
                    </td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",verticalAlign:"middle"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:3}}>
                        <span style={{padding:"2px 7px",borderRadius:20,fontSize:10,fontWeight:700,background:sc.bg,color:sc.color,display:"inline-block",width:"fit-content"}}>
                          {def?.sourceLabel||"—"}
                        </span>
                        {liveVal!=null&&(
                          <span style={{fontSize:11,color:"#059669",fontWeight:600}}>Current: {liveVal}</span>
                        )}
                      </div>
                    </td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",color:"#6b7280",fontSize:11,verticalAlign:"middle"}}>
                      {editId===row.id
                        ?<input value={editVal.example} onChange={e=>setEditVal(v=>({...v,example:e.target.value}))} placeholder="e.g. …"
                            style={{padding:"4px 8px",borderRadius:5,border:"1px solid #e4e7ec",fontSize:11,width:"100%"}}/>
                        :(row.example||"—")
                      }
                    </td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",whiteSpace:"nowrap",verticalAlign:"middle"}}>
                      {editId===row.id?(
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>saveEdit(row.id)} disabled={saving} style={{padding:"3px 8px",borderRadius:5,border:"none",background:"#4f46e5",color:"#fff",fontSize:11,fontWeight:600,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}>{saving?"…":"✓ Save"}</button>
                          <button onClick={cancelEdit} disabled={saving} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #e4e7ec",background:"#fff",color:"#6b7280",fontSize:11,cursor:"pointer"}}>✕</button>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:2}}>
                          <button onClick={()=>startEdit(row)} title="Edit" style={{padding:4,borderRadius:5,border:"none",background:"transparent",cursor:"pointer",fontSize:12}}>✏️</button>
                          <button onClick={()=>resetRow(row.id)} title="Reset" style={{padding:4,borderRadius:5,border:"none",background:"transparent",cursor:"pointer",fontSize:11,color:"#9ca3af"}}>↺</button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      <Toast msg={msg}/>
    </div>
  );
}
