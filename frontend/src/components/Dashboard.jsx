import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import * as empApi   from "../api/employees.js";
import * as deptApi  from "../api/departments.js";
import * as projApi  from "../api/projects.js";
import * as tasksApi from "../api/tasks.js";
import { useToast, Toast, Pb, Spinner, selS, COLORS, PIE_CLR, SC2, SC2C } from "./shared.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard(){
  const {user}=useAuth();
  if(user.role==="User") return <UserDashboard user={user}/>;
  return <AdminManagerDashboard/>;
}

function UserDashboard({user}){
  const today=new Date(),fmt=d=>d.toISOString().slice(0,10);
  const defFrom=fmt(new Date(new Date().setMonth(today.getMonth()-1)));
  const defTo=fmt(today);
  const [tasks,setTasks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [dateFrom,setDateFrom]=useState(defFrom);
  const [dateTo,setDateTo]=useState(defTo);
  const {show,msg}=useToast();

  useEffect(()=>{
    setLoading(true);
    tasksApi.getAll({from:dateFrom,to:dateTo})
      .then(r=>{
        const mine=(r.data||[]).filter(t=>String(t.employee_id)===String(user.id));
        setTasks(mine);
      })
      .catch(()=>show("Failed to load"))
      .finally(()=>setLoading(false));
  },[dateFrom,dateTo]);

  const totalMins=tasks.reduce((s,t)=>s+(t.spent_mins||0),0);
  const avgUtil=tasks.length?Math.round(tasks.reduce((s,t)=>s+(parseFloat(t.utilization)||0),0)/tasks.length):0;
  const onTime=tasks.filter(t=>t.status==="On Time completion").length;
  const delayed=tasks.filter(t=>t.tat_days>0).length;
  const inProg=tasks.filter(t=>t.status==="In Progress").length;

  const trendMap={};
  tasks.forEach(t=>{
    if(!trendMap[t.task_date])trendMap[t.task_date]={utilSum:0,count:0};
    trendMap[t.task_date].utilSum+=parseFloat(t.utilization)||0;trendMap[t.task_date].count++;
  });
  const trendData=Object.keys(trendMap).sort().map(d=>({x:d.slice(5),v:Math.round(trendMap[d].utilSum/trendMap[d].count)}));
  const pieData=[{name:"On Time",value:onTime},{name:"In Progress",value:inProg},{name:"Delayed",value:delayed}].filter(p=>p.value>0);

  const catMap={};
  tasks.forEach(t=>{const c=t.category||"Other";catMap[c]=(catMap[c]||0)+(t.spent_mins||0);});
  const catData=Object.entries(catMap).map(([c,m])=>({c,h:Math.round(m/60)})).sort((a,b)=>b.h-a.h);

  const kpis=[
    {label:"Tasks Logged",value:tasks.length,icon:"📋",accent:"#059669",bg:"#ecfdf5"},
    {label:"Avg Utilization",value:avgUtil+"%",icon:"⚡",accent:"#ca8a04",bg:"#fef9c3"},
    {label:"Total Hours",value:Math.round(totalMins/60)+"h",icon:"📈",accent:"#7c3aed",bg:"#ede9fe"},
    {label:"On Time",value:onTime,icon:"✅",accent:"#059669",bg:"#ecfdf5"},
    {label:"In Progress",value:inProg,icon:"🔄",accent:"#1d4ed8",bg:"#dbeafe"},
    {label:"Delayed",value:delayed,icon:"⚠️",accent:"#dc2626",bg:"#fef2f2"},
  ];
  const ttip={contentStyle:{borderRadius:8,fontSize:12,padding:"6px 10px",border:"1px solid #e4e7ec"}};
  const recentTasks=[...tasks].sort((a,b)=>b.task_date.localeCompare(a.task_date)).slice(0,10);

  return(
    <div>
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"12px 14px",marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:"#312e81",color:"#a5b4fc",fontSize:15,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{user.name?.[0]}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>My Dashboard — {user.name}</div>
          <div style={{fontSize:12,color:"#9ca3af"}}>Your personal utilization overview</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Range</div>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={selS}/>
          <span style={{fontSize:11,color:"#9ca3af"}}>to</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={selS}/>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:9,padding:"12px 14px",boxShadow:"0 1px 2px rgba(0,0,0,.05)",borderLeft:"3px solid "+k.accent,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:7,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:11,color:"#6b7280",fontWeight:500}}>{k.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:k.accent,lineHeight:1.2}}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {loading?<Spinner/>:(
        <>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
            <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #f0f2f5"}}>
                <span style={{fontSize:13,fontWeight:700}}>My Daily Utilization Trend</span>
              </div>
              <div style={{padding:"10px 6px 6px"}}>
                {trendData.length>0?(
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={trendData} margin={{left:-20,right:8,top:8,bottom:0}}>
                      <defs>
                        <linearGradient id="utg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={.15}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false}/>
                      <XAxis dataKey="x" tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false} domain={[0,100]}/>
                      <Tooltip {...ttip} formatter={v=>[v+"%","Utilization"]}/>
                      <Area type="monotone" dataKey="v" stroke="#4f46e5" strokeWidth={2.5} fill="url(#utg)" dot={{r:3,fill:"#4f46e5",strokeWidth:0}} activeDot={{r:5}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ):<div style={{height:180,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:13}}>No data for selected range</div>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
                <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #f0f2f5"}}>
                  <span style={{fontSize:13,fontWeight:700}}>Task Status</span>
                </div>
                <div style={{padding:"6px 4px"}}>
                  {pieData.length>0?(
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={24} paddingAngle={3}>
                          {pieData.map((_,i)=><Cell key={i} fill={PIE_CLR[i]} opacity={.85}/>)}
                        </Pie>
                        <Tooltip {...ttip}/><Legend iconSize={8} wrapperStyle={{fontSize:11}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ):<div style={{height:140,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:13}}>No data</div>}
                </div>
              </div>
              <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)",flex:1}}>
                <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #f0f2f5"}}>
                  <span style={{fontSize:13,fontWeight:700}}>Hours by Category</span>
                </div>
                <div style={{padding:"8px 14px"}}>
                  {catData.map((c,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <div style={{fontSize:11,color:"#4b5563",minWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.c}</div>
                      <div style={{flex:1,height:6,background:"#f0f2f5",borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:Math.min(100,(c.h/(catData[0]?.h||1))*100)+"%",height:"100%",background:COLORS[i%COLORS.length],borderRadius:3}}/>
                      </div>
                      <div style={{fontSize:11,fontWeight:600,color:"#6b7280",minWidth:28,textAlign:"right"}}>{c.h}h</div>
                    </div>
                  ))}
                  {catData.length===0&&<div style={{color:"#9ca3af",fontSize:12,textAlign:"center",padding:"10px 0"}}>No data</div>}
                </div>
              </div>
            </div>
          </div>

          <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700}}>Recent Tasks</span>
              <span style={{fontSize:11,color:"#9ca3af"}}>{recentTasks.length} of {tasks.length}</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#f8f9fb"}}>
                  {["Date","Project","Category","Minutes","Util %","TAT","Status"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {recentTasks.map((t,i)=>(
                    <tr key={t.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12,color:"#4b5563"}}>{t.task_date}</td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",color:"#4b5563",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.project_name||"—"}</td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",color:"#9ca3af"}}>{t.category}</td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12}}>{t.spent_mins}m</td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",minWidth:100}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <Pb value={Math.min(100,Math.round(parseFloat(t.utilization)||0))} color={parseFloat(t.utilization)>200?"#059669":parseFloat(t.utilization)>=80?"#f59e0b":"#ef4444"}/>
                          <span style={{fontSize:11,color:"#6b7280",whiteSpace:"nowrap",fontFamily:"monospace"}}>{Math.round(parseFloat(t.utilization)||0)}%</span>
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5"}}>
                        {t.tat_days>0?<span style={{padding:"2px 7px",borderRadius:20,fontSize:11,fontWeight:600,background:"#fef2f2",color:"#dc2626"}}>+{t.tat_days}d</span>:<span style={{padding:"2px 7px",borderRadius:20,fontSize:11,fontWeight:600,background:"#ecfdf5",color:"#059669"}}>On Time</span>}
                      </td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5"}}>
                        <span style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:SC2[t.status]||"#f8f9fb",color:SC2C[t.status]||"#4b5563"}}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                  {recentTasks.length===0&&<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:"#9ca3af"}}>No tasks logged yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <Toast msg={msg}/>
    </div>
  );
}

function AdminManagerDashboard(){
  const today=new Date(),fmt=d=>d.toISOString().slice(0,10);
  const defFrom=fmt(new Date(new Date().setMonth(today.getMonth()-1)));
  const defTo=fmt(today);
  const [tasks,setTasks]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [departments,setDepartments]=useState([]);
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [dateFrom,setDateFrom]=useState(defFrom);
  const [dateTo,setDateTo]=useState(defTo);
  const [empF,setEmpF]=useState("");
  const [deptF,setDeptF]=useState("");
  const [drillType,setDrillType]=useState(null);
  const [drillValue,setDrillValue]=useState(null);
  const [selProjId,setSelProjId]=useState(null);
  const [selMember,setSelMember]=useState(null);   // employee id clicked in project team
  const {show,msg}=useToast();

  useEffect(()=>{
    Promise.all([empApi.getAll(),deptApi.getAll(),projApi.getAll()])
      .then(([eR,dR,pR])=>{
        setEmployees(eR.data||[]);setDepartments(dR.data||[]);setProjects(pR.data||[]);
        if((pR.data||[]).length)setSelProjId((pR.data||[])[0].id);
      }).catch(()=>show("Failed to load data"));
  },[]);

  useEffect(()=>{
    setLoading(true);
    tasksApi.getAll({from:dateFrom,to:dateTo})
      .then(r=>setTasks(r.data||[]))
      .catch(()=>show("Failed to load tasks"))
      .finally(()=>setLoading(false));
  },[dateFrom,dateTo]);

  const filtered=tasks.filter(t=>{
    if(empF&&t.employee_name!==empF)return false;
    if(deptF&&t.department!==deptF)return false;
    return true;
  });

  const totalMins=filtered.reduce((s,t)=>s+(t.spent_mins||0),0);
  const avgUtil=filtered.length?Math.round(filtered.reduce((s,t)=>s+(parseFloat(t.utilization)||0),0)/filtered.length):0;
  const totalDelays=filtered.filter(t=>t.tat_days>0).length;
  const onTime=filtered.filter(t=>t.status==="On Time completion").length;
  const inProg=filtered.filter(t=>t.status==="In Progress").length;
  const delayed=filtered.filter(t=>t.status==="Delayed").length;

  const empMap={};
  filtered.forEach(t=>{
    const k=t.employee_name||"Unknown";
    if(!empMap[k])empMap[k]={utilSum:0,count:0,full:k};
    empMap[k].utilSum+=parseFloat(t.utilization)||0;empMap[k].count++;
  });
  const empChartData=Object.entries(empMap).map(([n,d])=>({n:n.split(" ")[0],full:n,v:Math.round(d.utilSum/d.count)})).sort((a,b)=>a.v-b.v);

  const deptMap={};
  filtered.forEach(t=>{
    const d=t.department||"Unknown";
    if(!deptMap[d])deptMap[d]={utilSum:0,count:0};
    deptMap[d].utilSum+=parseFloat(t.utilization)||0;deptMap[d].count++;
  });
  const deptChartData=Object.entries(deptMap).map(([d,v])=>({d,v:Math.round(v.utilSum/v.count)}));

  const trendMap={};
  filtered.forEach(t=>{
    if(!trendMap[t.task_date])trendMap[t.task_date]={utilSum:0,count:0};
    trendMap[t.task_date].utilSum+=parseFloat(t.utilization)||0;trendMap[t.task_date].count++;
  });
  const trendData=Object.keys(trendMap).sort().map(d=>({x:d.slice(5),v:Math.round(trendMap[d].utilSum/trendMap[d].count)}));
  const pieData=[{name:"On Time",value:onTime},{name:"In Progress",value:inProg},{name:"Delayed",value:delayed}].filter(p=>p.value>0);

  const statusMap={"On Time":"On Time completion","In Progress":"In Progress","Delayed":"Delayed"};
  let drillTasks=[];
  if(drillType==="pie"&&drillValue)drillTasks=filtered.filter(t=>t.status===drillValue);
  else if(drillType==="emp"&&drillValue)drillTasks=filtered.filter(t=>t.employee_name===drillValue);
  else if(drillType==="dept"&&drillValue)drillTasks=filtered.filter(t=>t.department===drillValue);

  const selProj=projects.find(p=>p.id===selProjId);
  const projMemberMap={};
  tasks.filter(t=>selProjId?t.project_id===selProjId:true).forEach(t=>{
    const k=t.employee_id;
    if(!projMemberMap[k])projMemberMap[k]={name:t.employee_name,dept:t.department,mins:0,count:0,utilSum:0,delays:0,cats:{},lastDate:""};
    projMemberMap[k].mins+=t.spent_mins||0;projMemberMap[k].count++;
    projMemberMap[k].utilSum+=parseFloat(t.utilization)||0;
    if(t.tat_days>0)projMemberMap[k].delays++;
    projMemberMap[k].cats[t.category]=(projMemberMap[k].cats[t.category]||0)+1;
    if(t.task_date>projMemberMap[k].lastDate)projMemberMap[k].lastDate=t.task_date;
  });
  const projMembers=Object.values(projMemberMap).map(m=>({...m,avgUtil:m.count?Math.round(m.utilSum/m.count):0})).sort((a,b)=>b.mins-a.mins);
  const grandMins=projMembers.reduce((s,m)=>s+m.mins,0);

  const closedProjects=projects.filter(p=>["Closed","Completed"].includes(p.status)).length;
  const kpis=[
    {label:"Active Employees",  value:employees.length,                icon:"👥",accent:"#7c3aed",bg:"#ede9fe"},
    {label:"Open Projects",     value:projects.filter(p=>p.status==="Open").length,icon:"📁",accent:"#1d4ed8",bg:"#dbeafe"},
    {label:"Tasks Logged",      value:filtered.length,                 icon:"📋",accent:"#059669",bg:"#ecfdf5"},
    {label:"Avg Utilization",   value:avgUtil+"%",                     icon:"⚡",accent:"#ca8a04",bg:"#fef9c3"},
    {label:"Total Hours",       value:Math.round(totalMins/60)+"h",    icon:"📈",accent:"#7c3aed",bg:"#ede9fe"},
    {label:"Project Delays",    value:totalDelays,                     icon:"⚠️",accent:"#dc2626",bg:"#fef2f2"},
    {label:"On Time Tasks",     value:onTime,                          icon:"✅",accent:"#059669",bg:"#ecfdf5"},
    {label:"Closed Projects",   value:closedProjects,                  icon:"🔒",accent:"#065f46",bg:"#f0fdf4"},
  ];
  const ttip={contentStyle:{borderRadius:8,fontSize:12,padding:"6px 10px",border:"1px solid #e4e7ec"}};
  function clearAll(){setDateFrom(defFrom);setDateTo(defTo);setEmpF("");setDeptF("");setDrillType(null);setDrillValue(null);}

  return(
    <div>
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"12px 14px",marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"flex-end"}}>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Date Range</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={selS}/>
              <span style={{fontSize:11,color:"#9ca3af"}}>to</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={selS}/>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:130}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Employee</div>
            <select value={empF} onChange={e=>setEmpF(e.target.value)} style={selS}>
              <option value="">All Employees</option>
              {employees.map(e=><option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:130}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Department</div>
            <select value={deptF} onChange={e=>{setDeptF(e.target.value);setEmpF("");}} style={selS}>
              <option value="">All Departments</option>
              {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <button onClick={clearAll} style={{padding:"6px 12px",fontSize:12,borderRadius:6,border:"1px solid #e4e7ec",background:"#f8f9fb",color:"#6b7280",cursor:"pointer",fontWeight:500,marginLeft:"auto",alignSelf:"flex-end"}}>↺ Reset</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:9,padding:"12px 14px",boxShadow:"0 1px 2px rgba(0,0,0,.05)",borderLeft:"3px solid "+k.accent,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:7,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:11,color:"#6b7280",fontWeight:500}}>{k.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:k.accent,lineHeight:1.2}}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {loading?<Spinner/>:(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:700}}>Department Utilization %</span>
                <span style={{fontSize:11,color:"#9ca3af"}}>· click to drill down</span>
              </div>
              <div style={{padding:"10px 6px 6px"}}>
                {deptChartData.length>0?(
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={deptChartData} margin={{left:-20,right:8,top:4,bottom:0}} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false}/>
                      <XAxis dataKey="d" tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false} domain={[0,100]}/>
                      <Tooltip {...ttip} formatter={v=>[v+"%","Avg Util"]}/>
                      <Bar dataKey="v" radius={[4,4,0,0]} maxBarSize={56} label={{position:"top",fontSize:11,fontWeight:600,fill:"#4b5563",formatter:v=>v+"%"}} onClick={e=>e&&e.d&&(setDrillType("dept"),setDrillValue(e.d))} style={{cursor:"pointer"}}>
                        {deptChartData.map((e,i)=><Cell key={i} fill={drillType==="dept"&&drillValue===e.d?"#059669":"#10b981"}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ):<div style={{height:170,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:13}}>No data</div>}
              </div>
            </div>
            <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:700}}>Employee Utilization %</span>
                <span style={{fontSize:11,color:"#9ca3af"}}>· click to drill down</span>
              </div>
              <div style={{padding:"10px 6px 6px"}}>
                {empChartData.length>0?(
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={empChartData} margin={{left:-20,right:8,top:4,bottom:0}} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false}/>
                      <XAxis dataKey="n" tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false} domain={[0,100]}/>
                      <Tooltip {...ttip} formatter={v=>[v+"%","Utilization"]}/>
                      <Bar dataKey="v" radius={[4,4,0,0]} maxBarSize={32} label={{position:"top",fontSize:10,fontWeight:600,fill:"#4b5563",formatter:v=>v+"%"}} onClick={e=>e&&e.full&&(setDrillType("emp"),setDrillValue(e.full))} style={{cursor:"pointer"}}>
                        {empChartData.map((e,i)=><Cell key={i} fill={drillType==="emp"&&drillValue===e.full?"#7c3aed":"#4f46e5"}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ):<div style={{height:170,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:13}}>No data</div>}
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
            <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:700}}>Daily Utilization Trend</span>
                <span style={{fontSize:11,color:"#9ca3af"}}>{trendData.length} days</span>
              </div>
              <div style={{padding:"10px 6px 6px"}}>
                {trendData.length>0?(
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={trendData} margin={{left:-20,right:8,top:8,bottom:0}}>
                      <defs>
                        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={.15}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false}/>
                      <XAxis dataKey="x" tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false} domain={[50,100]}/>
                      <Tooltip {...ttip} formatter={v=>[v+"%","Utilization"]}/>
                      <Area type="monotone" dataKey="v" stroke="#4f46e5" strokeWidth={2.5} fill="url(#tg)" dot={{r:3,fill:"#4f46e5",strokeWidth:0}} activeDot={{r:5,fill:"#4f46e5"}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ):<div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:13}}>No data for selected range</div>}
              </div>
            </div>
            <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:700}}>Task Status</span>
                <span style={{fontSize:11,color:"#9ca3af"}}>· click to drill down</span>
              </div>
              <div style={{padding:"10px 4px 6px"}}>
                {pieData.length>0?(
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={62} innerRadius={28} paddingAngle={3} style={{cursor:"pointer"}}
                        onClick={e=>{if(e&&e.name){setDrillType("pie");setDrillValue(statusMap[e.name]||e.name);}}}>
                        {pieData.map((_,i)=><Cell key={i} fill={PIE_CLR[i]} opacity={.85}/>)}
                      </Pie>
                      <Tooltip {...ttip}/><Legend iconSize={8} wrapperStyle={{fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                ):<div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:13}}>No data</div>}
              </div>
            </div>
          </div>

          {drillType&&drillValue&&(
            <>
            <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,marginBottom:14,overflow:"hidden"}}>
              <div style={{padding:"12px 14px",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:4,height:16,background:"#4f46e5",borderRadius:2}}/>
                  <span style={{fontSize:13,fontWeight:700}}>
                    {drillType==="dept"?`Tasks — ${drillValue} Dept`:drillType==="emp"?`Tasks — ${drillValue}`:`Tasks — ${drillValue==="On Time completion"?"On Time":drillValue}`}
                  </span>
                  <span style={{background:"#eff6ff",color:"#1d4ed8",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>{drillTasks.length} records</span>
                </div>
                <button onClick={()=>{setDrillType(null);setDrillValue(null);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af"}}>✕</button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:"#f8f9fb"}}>
                    {["Date","Employee","Project","Category","Minutes","Util %","Project TAT","Work Status"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {drillTasks.map((t,i)=>(
                      <tr key={t.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12,color:"#4b5563"}}>{String(t.task_date).slice(0,10)}</td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",fontWeight:600,color:"#111827"}}>{t.employee_name}</td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          <span onClick={()=>{ const p=projects.find(x=>x.id===t.project_id); if(p){setSelProjId(p.id);setSelMember(null);} }}
                            style={{color:"#4f46e5",fontWeight:600,cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted",textUnderlineOffset:3}}
                            title="View in Project Team Utilization">
                            {t.project_name||"—"}
                          </span>
                        </td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",color:"#9ca3af"}}>{t.category}</td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:12}}>{t.spent_mins}m</td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5",minWidth:100}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <Pb value={Math.min(100,Math.round(parseFloat(t.utilization)||0))} color={parseFloat(t.utilization)>200?"#059669":parseFloat(t.utilization)>=80?"#f59e0b":"#ef4444"}/>
                            <span style={{fontSize:11,color:"#6b7280",whiteSpace:"nowrap",fontFamily:"monospace"}}>{Math.round(parseFloat(t.utilization)||0)}%</span>
                          </div>
                        </td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5"}}>
                          {t.tat_days>0
                            ?<span style={{padding:"2px 7px",borderRadius:20,fontSize:11,fontWeight:600,background:"#fef2f2",color:"#dc2626"}}>+{t.tat_days}d late</span>
                            :<span style={{padding:"2px 7px",borderRadius:20,fontSize:11,fontWeight:600,background:"#ecfdf5",color:"#059669"}}>On Track</span>}
                        </td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f0f2f5"}}>
                          <span style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:SC2[t.status]||"#f8f9fb",color:SC2C[t.status]||"#4b5563"}}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                    {drillTasks.length===0&&<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#9ca3af",fontSize:13}}>No records</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            </>
          )}

          {selProj&&(
            <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,marginBottom:14,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{width:3,height:18,background:"#4f46e5",borderRadius:2}}/>
                <span style={{fontSize:13,fontWeight:700}}>Project Team Utilization</span>
                <div style={{flex:1}}/>
                <select value={selProjId||""} onChange={e=>{setSelProjId(e.target.value?Number(e.target.value):null);setSelMember(null);}} style={{...selS,fontWeight:600,maxWidth:280}}>
                  <option value="">Overall — All Projects</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {projMembers.length===0?(
                <div style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>{selProjId?"No tasks logged for this project yet":"No tasks logged in the selected date range"}</div>
              ):(
                <>
                  <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:8,background:"#f8f9ff",borderBottom:"1px solid #e8ecff"}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{selProj?selProj.name:"All Projects"}</span>
                    <span style={{fontSize:11,color:"#6b7280"}}>· {projMembers.length} contributors · {Math.round(grandMins/60)}h total</span>
                  </div>
                  <div style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",height:10,borderRadius:6,overflow:"hidden",gap:2,marginBottom:10}}>
                      {projMembers.map((m,mi)=>{
                        const pct=grandMins>0?Math.round((m.mins/grandMins)*100):0;
                        return pct>0?<div key={mi} title={m.name+": "+pct+"%"} style={{width:pct+"%",background:COLORS[mi%COLORS.length],minWidth:4}}/>:null;
                      })}
                    </div>
                    {!selMember&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                      {projMembers.map((m,mi)=>{
                        const pct=grandMins>0?Math.round((m.mins/grandMins)*100):0;
                        const uc=m.avgUtil>=85?"#059669":m.avgUtil>=65?"#d97706":"#dc2626";
                        return(
                          <div key={mi} onClick={()=>setSelMember(m.name)}
                            style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:9,border:"1px solid #e4e7ec",background:"#fafbff",minWidth:160,cursor:"pointer",transition:"border-color .15s"}}
                            onMouseEnter={e=>e.currentTarget.style.borderColor=COLORS[mi%COLORS.length]}
                            onMouseLeave={e=>e.currentTarget.style.borderColor="#e4e7ec"}>
                            <div style={{width:30,height:30,borderRadius:"50%",background:COLORS[mi%COLORS.length],color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{m.name[0]}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"baseline",gap:5}}>
                                <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>{m.name}</span>
                                <span style={{fontSize:11,color:COLORS[mi%COLORS.length],fontWeight:700}}>{pct}%</span>
                              </div>
                              <div style={{height:4,background:"#f0f2f5",borderRadius:2,overflow:"hidden",marginTop:3}}>
                                <div style={{height:"100%",width:pct+"%",background:COLORS[mi%COLORS.length],borderRadius:2}}/>
                              </div>
                            </div>
                            <div style={{textAlign:"right",flexShrink:0}}>
                              <div style={{fontSize:12,fontWeight:700,color:uc}}>{m.avgUtil}%</div>
                              <div style={{fontSize:10,color:"#9ca3af"}}>{Math.floor(m.mins/60)}h util</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    )}

                    {/* Employee Breakdown Table — always shown */}
                    <div style={{border:"1px solid #e4e7ec",borderRadius:8,overflow:"hidden"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead><tr style={{background:"#f8f9fb"}}>
                          {["Employee","Sessions","Minutes","Hours","Avg Util","Last Active"].map(h=>(
                            <th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #f0f2f5"}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {projMembers.map((m,mi)=>{
                            const uc=m.avgUtil>=85?"#059669":m.avgUtil>=65?"#d97706":"#dc2626";
                            const isSelected=selMember===m.name;
                            const lastDate=m.lastDate?String(m.lastDate).slice(5).replace("-"," "):"-";
                            return(
                              <tr key={mi} onClick={()=>setSelMember(isSelected?null:m.name)}
                                style={{background:isSelected?"#eef2ff":mi%2===0?"#fff":"#fafafa",cursor:"pointer",transition:"background .1s"}}>
                                <td style={{padding:"9px 12px",borderBottom:"1px solid #f0f2f5"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    <div style={{width:26,height:26,borderRadius:"50%",background:COLORS[mi%COLORS.length],color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{m.name[0]}</div>
                                    <span style={{fontWeight:600,color:"#111827"}}>{m.name}</span>
                                    {m.dept&&<span style={{fontSize:10,color:"#9ca3af"}}>{m.dept}</span>}
                                  </div>
                                </td>
                                <td style={{padding:"9px 12px",borderBottom:"1px solid #f0f2f5",color:"#4b5563"}}>{m.count} session{m.count!==1?"s":""}</td>
                                <td style={{padding:"9px 12px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",color:"#4b5563"}}>{m.mins}m</td>
                                <td style={{padding:"9px 12px",borderBottom:"1px solid #f0f2f5",fontWeight:600,color:"#111827"}}>{(m.mins/60).toFixed(1)}h</td>
                                <td style={{padding:"9px 12px",borderBottom:"1px solid #f0f2f5"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <div style={{width:40,height:4,background:"#f0f2f5",borderRadius:2,overflow:"hidden"}}>
                                      <div style={{height:"100%",width:Math.min(m.avgUtil,100)+"%",background:uc,borderRadius:2}}/>
                                    </div>
                                    <span style={{fontWeight:700,color:uc}}>{m.avgUtil}%</span>
                                  </div>
                                </td>
                                <td style={{padding:"9px 12px",borderBottom:"1px solid #f0f2f5",color:"#6b7280"}}>{lastDate}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Employee task drill-down (click a row above) */}
                    {selMember&&(()=>{
                      const empTasks=tasks.filter(t=>(selProjId?t.project_id===selProjId:true)&&t.employee_name===selMember)
                        .sort((a,b)=>String(b.task_date).localeCompare(String(a.task_date)));
                      return(
                        <div style={{marginTop:14,border:"1px solid #e4e7ec",borderRadius:8,overflow:"hidden"}}>
                          <div style={{padding:"9px 14px",background:"#f8f9fb",borderBottom:"1px solid #e4e7ec",display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:3,height:14,background:"#4f46e5",borderRadius:2}}/>
                            <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>{selMember} — tasks on {selProj?.name||"All Projects"}</span>
                            <span style={{background:"#eff6ff",color:"#1d4ed8",fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:20}}>{empTasks.length} tasks</span>
                            <button onClick={e=>{e.stopPropagation();setSelMember(null);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#9ca3af"}}>✕</button>
                          </div>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                            <thead><tr style={{background:"#fafafa"}}>
                              {["Date","Category","Minutes","Util %","Project TAT","Work Status"].map(h=>(
                                <th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #f0f2f5"}}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {empTasks.map((t,i)=>(
                                <tr key={t.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                                  <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace",fontSize:11,color:"#4b5563"}}>{String(t.task_date).slice(0,10)}</td>
                                  <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",color:"#6b7280"}}>{t.category}</td>
                                  <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",fontFamily:"monospace"}}>{t.spent_mins}m</td>
                                  <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5",minWidth:100}}>
                                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                                      <Pb value={Math.min(100,Math.round(parseFloat(t.utilization)||0))} color={parseFloat(t.utilization)>200?"#059669":parseFloat(t.utilization)>=80?"#f59e0b":"#ef4444"}/>
                                      <span style={{fontSize:11,color:"#6b7280",whiteSpace:"nowrap",fontFamily:"monospace"}}>{Math.round(parseFloat(t.utilization)||0)}%</span>
                                    </div>
                                  </td>
                                  <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5"}}>
                                    {t.tat_days>0
                                      ?<span style={{padding:"2px 6px",borderRadius:20,fontSize:10,fontWeight:600,background:"#fef2f2",color:"#dc2626"}}>+{t.tat_days}d late</span>
                                      :<span style={{padding:"2px 6px",borderRadius:20,fontSize:10,fontWeight:600,background:"#ecfdf5",color:"#059669"}}>On Track</span>}
                                  </td>
                                  <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f5"}}>
                                    <span style={{padding:"2px 7px",borderRadius:20,fontSize:10,fontWeight:600,background:SC2[t.status]||"#f8f9fb",color:SC2C[t.status]||"#4b5563"}}>{t.status}</span>
                                  </td>
                                </tr>
                              ))}
                              {empTasks.length===0&&<tr><td colSpan={6} style={{padding:16,textAlign:"center",color:"#9ca3af"}}>No tasks in selected date range</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
      <Toast msg={msg}/>
    </div>
  );
}
