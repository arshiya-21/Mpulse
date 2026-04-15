import { useState, useEffect } from "react";
import * as reportsApi from "../api/reports.js";
import * as deptApi    from "../api/departments.js";
import * as empApi     from "../api/employees.js";
import * as projApi    from "../api/projects.js";
import { useToast, Toast } from "./shared.jsx";

const STATUS_OPTS = ["In Progress","On Time completion","Delayed completion"];

const fldS = {display:"flex",flexDirection:"column",gap:6};
const labS = {fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"};
const inpS = {padding:"10px 12px",borderRadius:8,border:"1px solid #d1d5db",fontSize:14,color:"#111827",background:"#fff",outline:"none",width:"100%",boxSizing:"border-box"};

export default function Reports(){
  const [depts,setDepts]         = useState([]);
  const [employees,setEmployees] = useState([]);
  const [projects,setProjects]   = useState([]);
  const [filters,setFilters]     = useState({from:"",to:"",dept_id:"",emp_id:"",proj_id:"",status:""});
  const [loading,setLoading]     = useState(false);
  const {msg,show}               = useToast();

  useEffect(()=>{
    Promise.all([deptApi.getAll(),empApi.getAll(),projApi.getAll()]).then(([dR,eR,pR])=>{
      setDepts(dR.data||[]);
      setEmployees(eR.data||[]);
      setProjects(pR.data||[]);
    });
  },[]);

  const f = v => ({...filters,...v});

  async function download(){
    setLoading(true);
    try{
      await reportsApi.exportCSV(filters);
      show("CSV downloaded");
    }catch{ show("Export failed"); }
    finally{ setLoading(false); }
  }

  const hasFilters = filters.from||filters.to||filters.dept_id||filters.emp_id||filters.proj_id||filters.status;

  return(
    <div style={{maxWidth:900}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:22,fontWeight:700,color:"#111827"}}>Reports & Exports</div>
        <div style={{fontSize:14,color:"#6b7280",marginTop:4}}>Apply filters and download task data as CSV.</div>
      </div>

      {/* Filters */}
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:12,padding:"20px 24px",marginBottom:20,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#374151",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>Filters</span>
          {hasFilters&&<button onClick={()=>setFilters({from:"",to:"",dept_id:"",emp_id:"",proj_id:"",status:""})}
            style={{fontSize:12,padding:"3px 10px",borderRadius:6,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontWeight:600}}>
            ✕ Clear all
          </button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <div style={fldS}>
            <div style={labS}>Date From</div>
            <input type="date" value={filters.from} onChange={e=>setFilters(f({from:e.target.value}))} style={inpS}/>
          </div>
          <div style={fldS}>
            <div style={labS}>Date To</div>
            <input type="date" value={filters.to} onChange={e=>setFilters(f({to:e.target.value}))} style={inpS}/>
          </div>
          <div style={fldS}>
            <div style={labS}>Department</div>
            <select value={filters.dept_id} onChange={e=>setFilters(f({dept_id:e.target.value}))} style={inpS}>
              <option value="">All Departments</option>
              {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={fldS}>
            <div style={labS}>Employee</div>
            <select value={filters.emp_id} onChange={e=>setFilters(f({emp_id:e.target.value}))} style={inpS}>
              <option value="">All Employees</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={fldS}>
            <div style={labS}>Project</div>
            <select value={filters.proj_id} onChange={e=>setFilters(f({proj_id:e.target.value}))} style={inpS}>
              <option value="">All Projects</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={fldS}>
            <div style={labS}>Work Status</div>
            <select value={filters.status} onChange={e=>setFilters(f({status:e.target.value}))} style={inpS}>
              <option value="">All Statuses</option>
              {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Download */}
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:12,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>Task Data Export</div>
            <div style={{fontSize:13,color:"#6b7280",marginTop:3}}>
              All task rows with full details
              {hasFilters&&<span style={{marginLeft:8,padding:"2px 8px",borderRadius:20,background:"#eef2ff",color:"#4f46e5",fontSize:11,fontWeight:600}}>Filtered</span>}
            </div>
          </div>
          <button onClick={download} disabled={loading}
            style={{padding:"12px 32px",fontSize:15,fontWeight:700,borderRadius:10,border:"none",background:loading?"#94a3b8":"#4f46e5",color:"#fff",cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8,transition:"background .2s"}}>
            {loading?"⏳ Preparing…":"⬇ Download CSV"}
          </button>
        </div>
      </div>
      <Toast msg={msg}/>
    </div>
  );
}
