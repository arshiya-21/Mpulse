import { useState, useEffect, useCallback } from "react";
import * as reportsApi from "../api/reports.js";
import * as deptApi    from "../api/departments.js";
import * as empApi     from "../api/employees.js";
import * as projApi    from "../api/projects.js";
import { useAuth }     from "../context/AuthContext.jsx";
import { useToast, Toast } from "./shared.jsx";

const COLUMNS = [
  { key:"month_label",       label:"Month",              desc:"e.g. April - 2026" },
  { key:"created_on",        label:"Date",               desc:"Task date in DD-MM-YYYY" },
  { key:"employee",          label:"Employee",           desc:"Full name" },
  { key:"department",        label:"Department",         desc:"Employee's department" },
  { key:"project",           label:"Project",            desc:"Assigned project" },
  { key:"task_category",     label:"Task Category",      desc:"Work category" },
  { key:"work_type",         label:"Work Type",          desc:"Type of work done" },
  { key:"spent_mins",        label:"Spent Mins",         desc:"Minutes worked" },
  { key:"productive_hours",  label:"Productive Hours",   desc:"Hours (rounded to 2 decimals)" },
  { key:"utilization_pct",   label:"Utilization %",      desc:"% of daily target (spent_mins / target × 100)" },
  { key:"project_start",     label:"Project Start",      desc:"Project start date in DD-MM-YYYY" },
  { key:"project_end",       label:"Project End",        desc:"Project end date in DD-MM-YYYY" },
  { key:"tat_days",          label:"TAT Days",           desc:"Days beyond deadline" },
  { key:"tat_status",        label:"TAT Status",         desc:"On Time / Delayed" },
  { key:"task_status",       label:"Task Status",        desc:"Current work status" },
  { key:"project_status",    label:"Project Status",     desc:"Project health" },
  { key:"description",       label:"Description",        desc:"Task description / notes" },
];

const fldS = {display:"flex",flexDirection:"column",gap:6};
const labS = {fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"};
const inpS = {padding:"10px 12px",borderRadius:8,border:"1px solid #d1d5db",fontSize:14,color:"#111827",background:"#fff",outline:"none",width:"100%",boxSizing:"border-box"};

function defaultDates() {
  const to   = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) };
}

export default function Reports(){
  const { user } = useAuth();
  const isAdmin  = user?.role === "Admin";
  const dates    = defaultDates();

  const [depts,setDepts]         = useState([]);
  const [employees,setEmployees] = useState([]);
  const [projects,setProjects]   = useState([]);
  const [filters,setFilters]     = useState({
    from:    dates.from,
    to:      dates.to,
    dept_id: isAdmin ? "" : (user?.department_id || ""),
    emp_id:  "",
    proj_id: "",
    status:  "",
  });
  const [loadingCSV,setLoadingCSV]   = useState(false);
  const [loadingXLSX,setLoadingXLSX] = useState(false);
  const [count,setCount]             = useState(null);
  const [loadingCount,setLoadingCount] = useState(false);
  const {msg,show} = useToast();

  useEffect(()=>{
    Promise.all([deptApi.getAll(),empApi.getAll(),projApi.getAll()]).then(([dR,eR,pR])=>{
      setDepts(dR.data||[]);
      setEmployees(eR.data||[]);
      setProjects(pR.data||[]);
    });
  },[]);

  // Auto-fetch count whenever filters change
  useEffect(()=>{
    setCount(null);
    setLoadingCount(true);
    const params = buildParams();
    reportsApi.getCount(params)
      .then(r => setCount(r.data.count))
      .catch(()=> setCount(null))
      .finally(()=> setLoadingCount(false));
  },[filters]);

  const visibleEmployees = isAdmin
    ? (filters.dept_id ? employees.filter(e=>String(e.department_id)===String(filters.dept_id)) : employees)
    : employees.filter(e=>String(e.department_id)===String(user?.department_id));

  const f = v => ({...filters,...v});

  function resetFilters(){
    const d = defaultDates();
    setFilters({ from:d.from, to:d.to, dept_id:isAdmin?"":"" || (user?.department_id||""), emp_id:"", proj_id:"", status:"" });
  }

  function buildParams(){
    const p = {...filters};
    if(!isAdmin) p.dept_id = user?.department_id || "";
    return p;
  }

  const noData   = count === 0;
  const hasData  = count !== null && count > 0;

  async function downloadCSV(){
    if(noData){ show("No data found for the selected filters"); return; }
    setLoadingCSV(true);
    try{ await reportsApi.exportCSV(buildParams()); show("CSV downloaded successfully"); }
    catch{ show("Export failed — please try again"); }
    finally{ setLoadingCSV(false); }
  }

  async function downloadXLSX(){
    if(noData){ show("No data found for the selected filters"); return; }
    setLoadingXLSX(true);
    try{ await reportsApi.exportXLSX(buildParams()); show("Excel file downloaded successfully"); }
    catch{ show("Export failed — please try again"); }
    finally{ setLoadingXLSX(false); }
  }

  const datesChanged = filters.from !== dates.from || filters.to !== dates.to;
  const hasFilters   = datesChanged || filters.emp_id || filters.proj_id || filters.status || (isAdmin && filters.dept_id);

  return(
    <div style={{width:"100%"}}>

      {/* Filters */}
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:12,padding:"20px 24px",marginBottom:20,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#374151",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>Filters <span style={{fontWeight:400,color:"#9ca3af",fontSize:12}}>— default: last 7 days</span></span>
          {hasFilters&&<button onClick={resetFilters}
            style={{fontSize:12,padding:"3px 10px",borderRadius:6,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontWeight:600}}>
            ✕ Reset
          </button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <div style={fldS}><div style={labS}>Date From</div>
            <input type="date" value={filters.from} onChange={e=>setFilters(f({from:e.target.value}))} style={inpS}/>
          </div>
          <div style={fldS}><div style={labS}>Date To</div>
            <input type="date" value={filters.to} onChange={e=>setFilters(f({to:e.target.value}))} style={inpS}/>
          </div>
          {isAdmin ? (
            <div style={fldS}><div style={labS}>Department</div>
              <select value={filters.dept_id} onChange={e=>setFilters(f({dept_id:e.target.value,emp_id:""}))} style={inpS}>
                <option value="">All Departments</option>
                {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <div style={fldS}><div style={labS}>Department</div>
              <div style={{...inpS,background:"#f8f9fb",color:"#6b7280",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13}}>🏢</span>
                {depts.find(d=>String(d.id)===String(user?.department_id))?.name || "Your Department"}
              </div>
            </div>
          )}
          <div style={fldS}><div style={labS}>Employee</div>
            <select value={filters.emp_id} onChange={e=>setFilters(f({emp_id:e.target.value}))} style={inpS}>
              <option value="">All Employees</option>
              {visibleEmployees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={fldS}><div style={labS}>Project</div>
            <select value={filters.proj_id} onChange={e=>setFilters(f({proj_id:e.target.value}))} style={inpS}>
              <option value="">All Projects</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={fldS}><div style={labS}>Work Status</div>
            <select value={filters.status} onChange={e=>setFilters(f({status:e.target.value}))} style={inpS}>
              <option value="">All Statuses</option>
              <option>In Progress</option>
              <option>On Time completion</option>
              <option>Delayed completion</option>
            </select>
          </div>
        </div>
      </div>

      {/* Record count / No data banner */}
      <div style={{marginBottom:16,padding:"12px 18px",borderRadius:10,border:"1px solid",
        borderColor: noData?"#fecaca": hasData?"#a7f3d0":"#e4e7ec",
        background:  noData?"#fef2f2": hasData?"#ecfdf5":"#f8f9fb",
        display:"flex",alignItems:"center",gap:10}}>
        {loadingCount ? (
          <span style={{fontSize:13,color:"#9ca3af"}}>Checking records…</span>
        ) : noData ? (
          <span style={{fontSize:13,fontWeight:700,color:"#dc2626"}}>No data found for the selected filters</span>
        ) : hasData ? (
          <span style={{fontSize:13,fontWeight:600,color:"#059669"}}>{count} record{count!==1?"s":""} found — ready to export</span>
        ) : (
          <span style={{fontSize:13,color:"#9ca3af"}}>—</span>
        )}
      </div>

      {/* Download buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:12,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,.06)",opacity:noData?0.5:1}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
            <div style={{width:44,height:44,borderRadius:10,background:"#ecfdf5",border:"1px solid #a7f3d0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>📄</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>CSV Export</div>
              <div style={{fontSize:12,color:"#6b7280",marginTop:2,marginBottom:14}}>
                Comma-separated — opens in Excel, Google Sheets, etc.
                {hasFilters&&<span style={{marginLeft:8,padding:"1px 7px",borderRadius:20,background:"#eef2ff",color:"#4f46e5",fontSize:11,fontWeight:600}}>Filtered</span>}
              </div>
              <button onClick={downloadCSV} disabled={loadingCSV||noData}
                style={{padding:"10px 22px",fontSize:13,fontWeight:700,borderRadius:8,border:"none",
                  background:loadingCSV||noData?"#94a3b8":"#059669",
                  color:"#fff",cursor:loadingCSV||noData?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8}}>
                {loadingCSV?"⏳ Preparing…":"⬇ Download CSV"}
              </button>
            </div>
          </div>
        </div>

        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:12,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,.06)",opacity:noData?0.5:1}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
            <div style={{width:44,height:44,borderRadius:10,background:"#eff6ff",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>📊</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>Excel Export (.xlsx)</div>
              <div style={{fontSize:12,color:"#6b7280",marginTop:2,marginBottom:14}}>
                Formatted Excel workbook with frozen header, auto-width columns.
                {hasFilters&&<span style={{marginLeft:8,padding:"1px 7px",borderRadius:20,background:"#eef2ff",color:"#4f46e5",fontSize:11,fontWeight:600}}>Filtered</span>}
              </div>
              <button onClick={downloadXLSX} disabled={loadingXLSX||noData}
                style={{padding:"10px 22px",fontSize:13,fontWeight:700,borderRadius:8,border:"none",
                  background:loadingXLSX||noData?"#94a3b8":"#4f46e5",
                  color:"#fff",cursor:loadingXLSX||noData?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8}}>
                {loadingXLSX?"⏳ Preparing…":"⬇ Download Excel"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Column Reference */}
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:12,padding:"20px 24px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#374151",marginBottom:14}}>Column Reference <span style={{fontSize:11,fontWeight:500,color:"#9ca3af",marginLeft:4}}>({COLUMNS.length} columns)</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
          {COLUMNS.map((col,i)=>(
            <div key={col.key} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 10px",borderRadius:7,background:i%2===0?"#f8f9fb":"#fff",border:"1px solid #f0f2f5"}}>
              <div style={{width:20,height:20,borderRadius:5,background:"#eef2ff",color:"#4f46e5",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{col.label}</div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{col.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Toast msg={msg}/>
    </div>
  );
}
