import { useState, useMemo, Fragment, useEffect } from "react";
import * as marketingApi from "../api/marketing.js";
import * as employeesApi from "../api/employees.js";
import { useModalHotkeys } from "./shared.jsx";
import { uploadFile } from "../api/uploads.js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
const API_ORIGIN=(import.meta.env.VITE_API_URL||'http://localhost:4000/api').replace(/\/api\/?$/,'');
function fileUrl(p){ return p?`${API_ORIGIN}${p}`:''; }
const inputStyle={width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #d1d5db",fontSize:14,color:"#111827",boxSizing:"border-box"};
const cardStyle={background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"16px 20px"};
const thStyle={textAlign:"left",fontSize:11,fontWeight:700,color:"#fff",background:"#9ca3af",textTransform:"uppercase",letterSpacing:0.4,padding:"10px 14px",borderBottom:"1px solid #e5e7eb",whiteSpace:"nowrap"};
const tdStyle={padding:"11px 14px",fontSize:13,color:"#111827",borderBottom:"1px solid #f3f4f6",verticalAlign:"middle"};
const labelStyle={display:"block",fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:6};

const tabs=["Dashboard","Leads","Demos","Orders","Implementation","Renewals","Reports"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS=["2026","2025"];
const LEAD_STATUSES=["Not Started","Follow Up","On Hold","Converted"];

const STATUS_STYLES={
  "Converted":{bg:"#ecfdf5",color:"#059669"},
  "Follow Up":{bg:"#eff6ff",color:"#2563eb"},
  "Not Started":{bg:"#f3f4f6",color:"#6b7280"},
  "On Hold":{bg:"#fffbeb",color:"#d97706"},
  "Paid":{bg:"#ecfdf5",color:"#059669"},
  "Partial":{bg:"#fffbeb",color:"#d97706"},
  "Pending":{bg:"#fef2f2",color:"#dc2626"},
  "Positive":{bg:"#ecfdf5",color:"#059669"},
  "Neutral":{bg:"#f3f4f6",color:"#6b7280"},
  "Active":{bg:"#ecfdf5",color:"#059669"},
  "Requested":{bg:"#eff6ff",color:"#2563eb"},
  "Scheduled":{bg:"#fffbeb",color:"#d97706"},
  "Completed":{bg:"#ecfdf5",color:"#059669"},
  "Follow-Up":{bg:"#f5f3ff",color:"#1d4ed8"},
  "Converted to Order":{bg:"#ecfdf5",color:"#059669"},
  "Cancelled":{bg:"#fef2f2",color:"#dc2626"},
  "In Progress":{bg:"#eff6ff",color:"#2563eb"},
  "Draft":{bg:"#f3f4f6",color:"#6b7280"},
  "Confirmed":{bg:"#eff6ff",color:"#2563eb"},
  "PO Received":{bg:"#f5f3ff",color:"#1d4ed8"},
  "Invoiced":{bg:"#fffbeb",color:"#d97706"},
  "Payment Done":{bg:"#ecfdf5",color:"#059669"},
  "Active (Go-Live)":{bg:"#ecfdf5",color:"#059669"},
  "Fully Paid":{bg:"#ecfdf5",color:"#059669"},
  "Advance Paid":{bg:"#fffbeb",color:"#d97706"},
  "Due Soon":{bg:"#fffbeb",color:"#d97706"},
  "Overdue":{bg:"#fef2f2",color:"#dc2626"},
  "Renewed":{bg:"#eff6ff",color:"#2563eb"},
  "Churned":{bg:"#f3f4f6",color:"#6b7280"},
};
function StatusPill({label}){
  const s=STATUS_STYLES[label]||{bg:"#f3f4f6",color:"#6b7280"};
  return <span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:s.bg,color:s.color}}>{label}</span>;
}
function DotStatusPill({label}){
  const s=STATUS_STYLES[label]||{bg:"#f3f4f6",color:"#6b7280"};
  return <span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:s.bg,color:s.color,display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:s.color}}/>{label}</span>;
}
const OUTCOME_STYLES={
  "Positive":{bg:"#ecfdf5",color:"#059669",dot:"#059669",icon:"✅"},
  "Neutral":{bg:"#fffbeb",color:"#d97706",dot:"#d97706",icon:"⚡"},
  "Negative":{bg:"#fef2f2",color:"#dc2626",dot:"#dc2626",icon:"✕"},
  "No Show":{bg:"#f3f4f6",color:"#6b7280",dot:"#6b7280",icon:"🚫"},
};
const OUTCOME_OPTIONS=["Positive","Neutral","Negative","No Show"];
function OutcomeBadge({label}){
  const o=OUTCOME_STYLES[label]||{bg:"#f3f4f6",color:"#6b7280",icon:""};
  return <span style={{padding:"3px 9px",borderRadius:6,fontSize:12,fontWeight:700,background:o.bg,color:o.color,display:"inline-flex",alignItems:"center",gap:5}}>{o.icon} {label}</span>;
}
const PRODUCT_COLORS={
  "Sandman":{bg:"#f5f3ff",color:"#6d28d9"},
  "DigiSmart":{bg:"#eff6ff",color:"#1d4ed8"},
  "Sandman +VComp":{bg:"#fdf2f8",color:"#be185d"},
  "Gateway":{bg:"#ecfdf5",color:"#047857"},
  "Energy Analytics":{bg:"#fefce8",color:"#a16207"},
};
function ProductPill({label}){
  const p=PRODUCT_COLORS[label]||{bg:"#f3f4f6",color:"#374151"};
  return <span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:p.bg,color:p.color}}>{label}</span>;
}

// ── Mock data — matches the mockup. Replace with API data once backend is wired. ──


function implOverallPct(rec){
  const totC=rec.phases.reduce((s,p)=>s+p.steps.filter(st=>st.done).length,0);
  const totT=rec.phases.reduce((s,p)=>s+p.steps.length,0);
  return totT===0?0:Math.round((totC/totT)*100);
}
// A phase with every step checked is Completed regardless of the stored status field —
// keeps the display correct even if a phase's status was never manually updated.
function phaseDisplayStatus(p){
  return p.steps.length>0&&p.steps.every(s=>s.done)?"Completed":p.status;
}
function currentPhaseOf(rec){
  const active=rec.phases.find(p=>phaseDisplayStatus(p)!=="Completed");
  return active?active.phase:(rec.phases[rec.phases.length-1]?.phase??0);
}

function daysLeftFrom(dateStr){
  const now=new Date(todayISO());
  const end=new Date(dateStr);
  return Math.round((end-now)/(1000*60*60*24));
}
function renewalStatusFor(r){
  if(r.renewalStatus==="Renewed"||r.renewalStatus==="Churned") return r.renewalStatus;
  const d=daysLeftFrom(r.contractEnd);
  if(d<0) return "Overdue";
  if(d<=30) return "Due Soon";
  return "Active";
}

const DEMO_STATUSES=["Requested","Scheduled","Completed","Follow-Up","Converted to Order","Cancelled"];
// Keeps the customer's Lead status in step with how their demo is progressing.
const DEMO_STATUS_TO_LEAD_STATUS={
  "Requested":"Follow Up",
  "Scheduled":"Follow Up",
  "Completed":"Follow Up",
  "Follow-Up":"Follow Up",
  "Converted to Order":"Converted",
  "Cancelled":"On Hold",
};
function nextDemoNo(demos){
  const max=demos.reduce((m,d)=>Math.max(m,parseInt(String(d.demoNo).replace("DEMO-",""),10)||0),0);
  return "DEMO-"+String(max+1).padStart(3,"0");
}

const ORDER_STATUSES=["Draft","Confirmed","PO Received","Invoiced","Payment Done","Active (Go-Live)"];
const PAYMENT_STATUSES=["Pending","Advance Paid","Fully Paid"];
const ORDER_STATUS_ACCENT={"Draft":"#9ca3af","Confirmed":"#2563eb","PO Received":"#1d4ed8","Invoiced":"#d97706","Payment Done":"#2563eb","Active (Go-Live)":"#059669","Cancelled":"#dc2626"};
function orderProgressCount(status){
  if(status==="Cancelled") return 0;
  const idx=ORDER_STATUSES.indexOf(status);
  return idx===-1?0:idx+1;
}
function formatRupee(n){ return "₹"+Math.round(n).toLocaleString("en-IN"); }
function nextOrderNo(orders){
  const max=orders.reduce((m,o)=>Math.max(m,parseInt(String(o.orderNo).replace("ORD-",""),10)||0),0);
  return "ORD-"+String(max+1).padStart(3,"0");
}

// ── helpers ──
function parseRupee(str){ return Number(String(str).replace(/[₹,]/g,""))||0; }
function money(n){ return "₹"+(n/100000).toFixed(1)+"L"; }
function todayISO(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function nextLeadNo(leads){
  const max=leads.reduce((m,l)=>Math.max(m,parseInt(l.leadNo,10)||0),0);
  return String(max+1).padStart(5,"0");
}

function getPeriodWindow(period,year,month){
  const now=new Date();
  if(period==="Today"){
    const s=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    return {start:s,end:s,label:"Today"};
  }
  if(period==="This Week"){
    const diffToMonday=(now.getDay()+6)%7;
    const s=new Date(now.getFullYear(),now.getMonth(),now.getDate()-diffToMonday);
    const e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+6);
    return {start:s,end:e,label:"This Week"};
  }
  if(period==="This Month"){
    const s=new Date(now.getFullYear(),now.getMonth(),1), e=new Date(now.getFullYear(),now.getMonth()+1,0);
    return {start:s,end:e,label:MONTHS[now.getMonth()]+" "+now.getFullYear()};
  }
  if(period==="Last Month"){
    const lm=new Date(now.getFullYear(),now.getMonth()-1,1), e=new Date(now.getFullYear(),now.getMonth(),0);
    return {start:lm,end:e,label:MONTHS[lm.getMonth()]+" "+lm.getFullYear()};
  }
  if(period==="This Year"){
    return {start:new Date(now.getFullYear(),0,1),end:new Date(now.getFullYear(),11,31),label:"FY "+now.getFullYear()};
  }
  if(period==="Custom"){
    const y=year==="All Years"?null:Number(year);
    const mIdx=month==="All Months"?null:MONTHS.indexOf(month);
    if(y==null) return {start:null,end:null,label:"All Time"};
    if(mIdx==null) return {start:new Date(y,0,1),end:new Date(y,11,31),label:"FY "+y};
    return {start:new Date(y,mIdx,1),end:new Date(y,mIdx+1,0),label:MONTHS[mIdx]+" "+y};
  }
  return {start:null,end:null,label:"All Time"};
}
function inWindow(dateStr,win){
  if(!win.start) return true;
  const d=new Date(dateStr);
  return d>=win.start&&d<=win.end;
}

function KpiCard({label,value,sub,accent,icon,drillKey,activeDrill,onToggle}){
  const open=activeDrill===drillKey;
  return(
    <div style={{...cardStyle,borderLeft:"3px solid "+accent,display:"flex",flexDirection:"column",gap:2,position:"relative"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,textTransform:"uppercase"}}>{label}</div>
        <span style={{fontSize:16,opacity:0.5}}>{icon}</span>
      </div>
      <div style={{fontSize:24,fontWeight:800,color:"#111827",margin:"2px 0"}}>{value}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div style={{fontSize:11,color:"#9ca3af"}}>{sub}</div>
        {drillKey&&(
          <button onClick={()=>onToggle(drillKey)} title={open?"Hide details":"View details"}
            style={{background:"none",border:"none",cursor:"pointer",padding:2,display:"flex",alignItems:"center",color:open?accent:"#c4c9d1",lineHeight:1}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.15s"}}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}

function DrillPanel({title,icon,data,columns,periodLabel,onClose}){
  return(
    <div style={{...cardStyle,padding:0,overflow:"hidden",marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"#1e2a56",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:14,fontWeight:700}}>{icon} {title}</div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.7)",fontWeight:600}}>{data.length} records · {periodLabel}</span>
          <button onClick={onClose} style={{padding:"6px 14px",borderRadius:6,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>✕ Close</button>
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{columns.map(c=><th key={c.header} style={thStyle}>{c.header}</th>)}</tr></thead>
          <tbody>
            {data.map((row,i)=>(
              <tr key={i}>
                {columns.map(c=><td key={c.header} style={{...tdStyle,...(c.style||{})}}>{c.cell(row)}</td>)}
              </tr>
            ))}
            {data.length===0&&<tr><td colSpan={columns.length} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:24}}>No records found for this period.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhaseStepper({phase,totalPhases}){
  const count=totalPhases||1;
  return(
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      {Array.from({length:count},(_,p)=>p).map((p,i)=>(
        <div key={p} style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:p<=phase?"#2563eb":"#f3f4f6",color:p<=phase?"#fff":"#9ca3af",border:p===phase?"2px solid #2563eb":"none"}}>{p}</div>
          {i<count-1&&<div style={{width:12,height:2,background:p<phase?"#2563eb":"#e5e7eb"}}/>}
        </div>
      ))}
    </div>
  );
}

const COUNTRY_OPTIONS=["India","USA","UAE","Germany","Japan","China","UK","Australia"];
const STATE_OPTIONS=["Tamil Nadu","Maharashtra","Gujarat","Karnataka","Rajasthan","Telangana","Andhra Pradesh","Punjab","Haryana","West Bengal","Madhya Pradesh","Uttar Pradesh"];
const REGION_OPTIONS=["South","North","East","West"];

const sectionHeaderStyle={fontSize:12,fontWeight:700,color:"#374151",background:"#f8f9fb",padding:"10px 24px",borderTop:"1px solid #e5e7eb",borderBottom:"1px solid #e5e7eb",textTransform:"uppercase",letterSpacing:0.4};
const reqMark=<span style={{color:"#dc2626"}}>*</span>;

function CheckboxGrid({options,selected,onToggle}){
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",columnGap:24,rowGap:10}}>
      {options.map(o=>(
        <label key={o} style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"#111827",cursor:"pointer"}}>
          <input type="checkbox" checked={selected.includes(o)} onChange={()=>onToggle(o)}/>
          {o}
        </label>
      ))}
    </div>
  );
}

/* ---------------- Lead Modal ---------------- */
function LeadModal({onClose,onSave,nextLeadNumber,initial,productOptions,leadSourceOptions,businessAreaOptions,ownerOptions,foundryInfoOptions,sandTypeOptions,onOpenBusinessAreaMaster,onOpenFoundryTypeMaster,onOpenSandTypeMaster,existingCustomers}){
  const [leadNo]=useState(initial?.leadNo||nextLeadNumber);

  const [foundryName,setFoundryName]=useState(initial?.foundryName||initial?.customer||"");
  const [leadSource,setLeadSource]=useState(initial?.leadSource||"");
  const [firstName,setFirstName]=useState(initial?.contactFirstName||"");
  const [lastName,setLastName]=useState(initial?.contactLastName||"");
  const [country,setCountry]=useState(initial?.country||"India");
  const [street,setStreet]=useState(initial?.street||"");
  const [email,setEmail]=useState(initial?.email||"");
  const [city,setCity]=useState(initial?.city||"");
  const [contactNumber,setContactNumber]=useState(initial?.phone||"");
  const [zip,setZip]=useState(initial?.zip||"");
  const [state,setState]=useState(initial?.state||"");
  const [designation,setDesignation]=useState(initial?.designation||"");
  const [leadStatus,setLeadStatus]=useState(initial?.status||"Not Started");

  const [region,setRegion]=useState(initial?.region||"");
  const [businessArea,setBusinessArea]=useState(initial?.businessArea||"");

  const [customerPotential,setCustomerPotential]=useState(initial?.customerPotential||[]);
  const [foundryInfo,setFoundryInfo]=useState(initial?.foundryInfo||[]);

  const [sandTypes,setSandTypes]=useState(initial?.sandTypes||[]);
  const [mixerMake,setMixerMake]=useState(initial?.mixerMake||"");
  const [mixerType,setMixerType]=useState(initial?.mixerType||"");
  const [mixerBatchSize,setMixerBatchSize]=useState(initial?.mixerBatchSize||"");
  const [hourlySandOutput,setHourlySandOutput]=useState(initial?.hourlySandOutput||"");

  const [painPoints,setPainPoints]=useState(initial?.painPoints||"");

  const [owner,setOwner]=useState(initial?.owner||ownerOptions[0]||"");
  const [createdDate,setCreatedDate]=useState(initial?.createdDate||todayISO());

  function toggle(arr,setArr,val){
    setArr(prev=>prev.includes(val)?prev.filter(x=>x!==val):[...prev,val]);
  }

  function buildRecord(){
    return{
      leadNo,
      foundryName:foundryName.trim(),
      customer:foundryName.trim(),
      leadSource,contactFirstName:firstName.trim(),contactLastName:lastName.trim(),
      country,street:street.trim(),email:email.trim(),city:city.trim(),
      phone:contactNumber.trim(),zip:zip.trim(),state,designation:designation.trim(),
      status:leadStatus,
      region,businessArea,
      customerPotential,foundryInfo,
      sandTypes,mixerMake:mixerMake.trim(),mixerType:mixerType.trim(),mixerBatchSize:mixerBatchSize.trim(),hourlySandOutput:hourlySandOutput.trim(),
      painPoints:painPoints.trim(),
      product:customerPotential.length?customerPotential.join(" + "):(initial?.product||"—"),
      owner,createdDate,
      lastModified:todayISO(),
    };
  }

  function validate(){
    if(!foundryName.trim()){ alert("Please enter the foundry name."); return false; }
    if((existingCustomers||[]).some(c=>c.trim().toLowerCase()===foundryName.trim().toLowerCase())){
      alert("A Lead for this customer already exists. Please check the list before creating a duplicate.");
      return false;
    }
    if(!firstName.trim()){ alert("Please enter the contact person's first name."); return false; }
    if(!leadSource){ alert("Please select a lead source."); return false; }
    if(!email.trim()&&!contactNumber.trim()){ alert("Please enter an email address or a contact number."); return false; }
    return true;
  }

  function handleSave(andNew){
    if(!validate()) return;
    onSave(buildRecord());
    if(andNew){
      setFoundryName("");setLeadSource("");setFirstName("");setLastName("");setStreet("");setEmail("");setCity("");
      setContactNumber("");setZip("");setState("");setDesignation("");setLeadStatus("Not Started");
      setRegion("");setBusinessArea("");setCustomerPotential([]);setFoundryInfo([]);setSandTypes([]);
      setMixerMake("");setMixerType("");setMixerBatchSize("");setHourlySandOutput("");setPainPoints("");
      setCreatedDate(todayISO());
    } else {
      onClose();
    }
  }

  useModalHotkeys(onClose,()=>handleSave(false));

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:920,maxWidth:"94vw",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>{initial?"Edit Lead":"New Lead"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>

        <div style={{padding:"6px 24px",textAlign:"right",fontSize:12,color:"#6b7280",flexShrink:0}}>{reqMark} = Required Information</div>

        <div style={{overflowY:"auto",flex:1}}>
          <div style={sectionHeaderStyle}>Contact Information</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div><label style={labelStyle}>Foundry Name {reqMark}</label><input style={inputStyle} value={foundryName} onChange={e=>setFoundryName(e.target.value)} placeholder="Enter foundry name"/></div>
            <div><label style={labelStyle}>Lead Source {reqMark}</label>
              <select style={inputStyle} value={leadSource} onChange={e=>setLeadSource(e.target.value)}>
                <option value="">--None--</option>
                {leadSourceOptions.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Contact Person First Name {reqMark}</label><input style={inputStyle} value={firstName} onChange={e=>setFirstName(e.target.value)}/></div>
            <div><label style={labelStyle}>Country / Territory</label>
              <select style={inputStyle} value={country} onChange={e=>setCountry(e.target.value)}>
                {COUNTRY_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Contact Person Last Name</label><input style={inputStyle} value={lastName} onChange={e=>setLastName(e.target.value)}/></div>
            <div><label style={labelStyle}>Street</label><textarea style={{...inputStyle,minHeight:60,resize:"vertical"}} value={street} onChange={e=>setStreet(e.target.value)}/></div>
            <div><label style={labelStyle}>Email Address {reqMark}</label><input type="email" style={inputStyle} value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div><label style={labelStyle}>City</label><input style={inputStyle} value={city} onChange={e=>setCity(e.target.value)}/></div>
            <div><label style={labelStyle}>Contact Person Number {reqMark}</label><input style={inputStyle} value={contactNumber} onChange={e=>setContactNumber(e.target.value)}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={labelStyle}>ZIP / Postal Code</label><input style={inputStyle} value={zip} onChange={e=>setZip(e.target.value)}/></div>
              <div><label style={labelStyle}>State</label>
                <select style={inputStyle} value={state} onChange={e=>setState(e.target.value)}>
                  <option value="">--None--</option>
                  {STATE_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div><label style={labelStyle}>Designation</label><input style={inputStyle} value={designation} onChange={e=>setDesignation(e.target.value)}/></div>
            <div><label style={labelStyle}>Lead Status</label>
              <select style={inputStyle} value={leadStatus} onChange={e=>setLeadStatus(e.target.value)}>
                {LEAD_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div><label style={labelStyle}>Region</label>
              <select style={inputStyle} value={region} onChange={e=>setRegion(e.target.value)}>
                <option value="">--None--</option>
                {REGION_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Business Area</label>
              <div style={{display:"flex",gap:8}}>
                <select style={inputStyle} value={businessArea} onChange={e=>setBusinessArea(e.target.value)}>
                  <option value="">--None--</option>
                  {businessAreaOptions.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                <button type="button" onClick={onOpenBusinessAreaMaster} title="Manage business areas" style={{flexShrink:0,padding:"0 12px",borderRadius:8,border:"1px solid #fde68a",background:"#fff",color:"#b45309",fontWeight:600,fontSize:13,cursor:"pointer"}}>+</button>
              </div>
            </div>
          </div>

          <div style={sectionHeaderStyle}>Customer Potential</div>
          <div style={{padding:"18px 24px"}}>
            <CheckboxGrid options={productOptions} selected={customerPotential} onToggle={v=>toggle(customerPotential,setCustomerPotential,v)}/>
          </div>

          <div style={{...sectionHeaderStyle,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Foundry Information</span>
            <button type="button" onClick={onOpenFoundryTypeMaster} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",color:"#374151",fontWeight:600,fontSize:11,cursor:"pointer",textTransform:"none",letterSpacing:0}}>+ Manage</button>
          </div>
          <div style={{padding:"18px 24px"}}>
            <CheckboxGrid options={foundryInfoOptions} selected={foundryInfo} onToggle={v=>toggle(foundryInfo,setFoundryInfo,v)}/>
          </div>

          <div style={{...sectionHeaderStyle,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Sand System Information</span>
            <button type="button" onClick={onOpenSandTypeMaster} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",color:"#374151",fontWeight:600,fontSize:11,cursor:"pointer",textTransform:"none",letterSpacing:0}}>+ Manage</button>
          </div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <CheckboxGrid options={sandTypeOptions} selected={sandTypes} onToggle={v=>toggle(sandTypes,setSandTypes,v)}/>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={labelStyle}>Mixer Make</label><input style={inputStyle} value={mixerMake} onChange={e=>setMixerMake(e.target.value)}/></div>
              <div><label style={labelStyle}>Mixer Type</label><input style={inputStyle} value={mixerType} onChange={e=>setMixerType(e.target.value)}/></div>
              <div><label style={labelStyle}>Mixer Batch Size</label><input style={inputStyle} value={mixerBatchSize} onChange={e=>setMixerBatchSize(e.target.value)}/></div>
              <div><label style={labelStyle}>Hourly Sand Output</label><input style={inputStyle} value={hourlySandOutput} onChange={e=>setHourlySandOutput(e.target.value)}/></div>
            </div>
          </div>

          <div style={sectionHeaderStyle}>Remarks</div>
          <div style={{padding:"18px 24px"}}>
            <label style={labelStyle}>Description</label>
            <textarea style={{...inputStyle,minHeight:80,resize:"vertical"}} value={painPoints} onChange={e=>setPainPoints(e.target.value)}/>
          </div>

          <div style={sectionHeaderStyle}>System Information</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Owner</label>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#2563eb",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{owner[0]}</div>
                <select style={inputStyle} value={owner} onChange={e=>setOwner(e.target.value)}>
                  {ownerOptions.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Lead Number</label>
              <input style={{...inputStyle,background:"#f3f4f6",color:"#6b7280"}} value={"Lead - "+leadNo} readOnly/>
            </div>
            <div>
              <label style={labelStyle}>Created Date</label>
              <input type="date" style={inputStyle} value={createdDate} onChange={e=>setCreatedDate(e.target.value)}/>
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>handleSave(true)} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #2563eb",background:"#fff",fontWeight:600,fontSize:13,color:"#2563eb",cursor:"pointer"}}>Save & New</button>
          <button onClick={()=>handleSave(false)} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#2563eb",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ChangeOwnerModal({count,onClose,onApply,ownerOptions}){
  const [newOwner,setNewOwner]=useState("");

  function handleApply(){
    if(!newOwner){ alert("Please select a new owner."); return; }
    onApply(newOwner);
  }

  useModalHotkeys(onClose,handleApply);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:440,maxWidth:"92vw",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>Change Owner ({count} lead{count===1?"":"s"})</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>
        <div style={{padding:"20px 24px"}}>
          <label style={labelStyle}>New Owner</label>
          <select style={inputStyle} value={newOwner} onChange={e=>setNewOwner(e.target.value)}>
            <option value="">— Select Owner —</option>
            {ownerOptions.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb"}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>
          <button onClick={handleApply} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#2563eb",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// Generic master-list modal (used by Product Master, Lead Source Master, Business Area Master —
// same add/edit/delete-with-usage-count UI, only the labels/icon/accent differ).
function MasterListModal({title,itemNoun,icon,accent,placeholder,items,onClose,onAdd,onEdit,onDelete,leadCounts,usageNoun="lead",onManagePhases}){
  const [newName,setNewName]=useState("");
  const [editingId,setEditingId]=useState(null);
  const [editName,setEditName]=useState("");

  function handleAdd(){
    const name=newName.trim();
    if(!name) return;
    if(items.some(i=>i.name.toLowerCase()===name.toLowerCase())){
      alert(`That ${itemNoun} already exists.`);
      return;
    }
    onAdd(name);
    setNewName("");
  }
  function startEdit(i){ setEditingId(i.id); setEditName(i.name); }
  function saveEdit(i){
    const name=editName.trim();
    if(!name) return;
    onEdit(i.id,name);
    setEditingId(null);
  }
  function handleDelete(i){
    const count=leadCounts[i.name]||0;
    const msg=count>0
      ? `"${i.name}" is used by ${count} ${usageNoun}(s). Delete it anyway? Existing ${usageNoun}s will keep the label but it won't be selectable for new ones.`
      : `Delete ${itemNoun} "${i.name}"?`;
    if(window.confirm(msg)) onDelete(i.id);
  }

  // Enter is left to the per-row Add/Save inputs (each already handles its own Enter key);
  // this modal only adds the Escape-to-close convention.
  useModalHotkeys(onClose,null);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:520,maxWidth:"92vw",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>

        <div style={{padding:"20px 24px",flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:8,flexShrink:0}}>ADD NEW {itemNoun.toUpperCase()}</div>
          <div style={{display:"flex",gap:8,marginBottom:24,flexShrink:0}}>
            <input
              style={inputStyle}
              value={newName}
              onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") handleAdd(); }}
              placeholder={placeholder}
            />
            <button onClick={handleAdd} style={{padding:"9px 20px",borderRadius:8,border:"none",background:accent,color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>Add</button>
          </div>

          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:10,flexShrink:0}}>{itemNoun.toUpperCase()}S ({items.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,overflowY:"auto",flex:1,paddingRight:4}}>
            {items.map(i=>(
              <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px"}}>
                <div style={{width:32,height:32,borderRadius:8,background:"#f5f3ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{icon}</div>
                {editingId===i.id?(
                  <input
                    style={{...inputStyle,flex:1,padding:"6px 10px"}}
                    value={editName}
                    autoFocus
                    onChange={e=>setEditName(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") saveEdit(i); }}
                  />
                ):(
                  <div style={{flex:1,fontSize:14,fontWeight:600,color:"#111827"}}>{i.name}</div>
                )}
                <div style={{fontSize:12,color:"#9ca3af",whiteSpace:"nowrap"}}>{leadCounts[i.name]||0} {usageNoun}s</div>
                {onManagePhases&&(
                  <button onClick={()=>onManagePhases(i)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:12,color:"#111827",cursor:"pointer"}}>Phases</button>
                )}
                {editingId===i.id?(
                  <button onClick={()=>saveEdit(i)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid "+accent,background:accent,color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}}>Save</button>
                ):(
                  <button onClick={()=>startEdit(i)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:12,color:"#111827",cursor:"pointer"}}>Edit</button>
                )}
                <button onClick={()=>handleDelete(i)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #fecaca",background:"#fee2e2",fontWeight:600,fontSize:12,color:"#b91c1c",cursor:"pointer"}}>Delete</button>
              </div>
            ))}
            {items.length===0&&<div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:20}}>No {itemNoun}s yet.</div>}
          </div>
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"9px 22px",borderRadius:8,border:"none",background:accent,fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Product Phases Modal ---------------- */
function PhaseFormPanel({product,initial,onCancel,onSave}){
  const [phaseNumber,setPhaseNumber]=useState(initial?String(initial.phase_number):"");
  const [title,setTitle]=useState(initial?.title||"");
  const [weeks,setWeeks]=useState(initial?.weeks||"");
  const [description,setDescription]=useState(initial?.description||"");
  const [stepsText,setStepsText]=useState((initial?.steps||[]).join("\n"));

  function handleSave(){
    if(phaseNumber===""){ alert("Please enter a phase number."); return; }
    if(!title.trim()){ alert("Please enter a phase title."); return; }
    onSave({
      product_id:product.id,
      phase_number:Number(phaseNumber),
      title:title.trim(),
      weeks:weeks.trim(),
      description:description.trim(),
      steps:stepsText.split("\n").map(s=>s.trim()).filter(Boolean),
    });
  }

  return(
    <div style={{padding:"18px 20px",border:"1px solid #e5e7eb",borderRadius:10,marginBottom:16,background:"#fafbfc"}}>
      <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:14}}>{initial?"Edit Phase":"New Phase"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Phase Number {reqMark}</label>
          <input type="number" style={inputStyle} value={phaseNumber} onChange={e=>setPhaseNumber(e.target.value)} placeholder="e.g. 0"/>
        </div>
        <div>
          <label style={labelStyle}>Weeks</label>
          <input style={inputStyle} value={weeks} onChange={e=>setWeeks(e.target.value)} placeholder="e.g. 4–6 Weeks"/>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Title {reqMark}</label>
        <input style={inputStyle} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Phase 0: Kickoff"/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Description</label>
        <input style={inputStyle} value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g. Start → Proposal → Receipt of PO → Data Audit"/>
      </div>
      <div style={{marginBottom:16}}>
        <label style={labelStyle}>Steps <span style={{color:"#9ca3af",fontWeight:500}}>(one per line)</span></label>
        <textarea style={{...inputStyle,minHeight:100,resize:"vertical"}} value={stepsText} onChange={e=>setStepsText(e.target.value)} placeholder={"Start\nProposal\nReceipt of PO\nData Audit"}/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>
        <button onClick={handleSave} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#2563eb",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save Phase</button>
      </div>
    </div>
  );
}

function ProductPhasesModal({product,onClose}){
  const [phases,setPhases]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [editingPhase,setEditingPhase]=useState(null);

  function load(){
    return marketingApi.getProductPhases(product.id).then(r=>{ setPhases(r.data); setLoading(false); })
      .catch(err=>{ console.error(err); setLoading(false); });
  }
  useEffect(()=>{ load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function handleAddNew(){ setEditingPhase(null); setShowForm(true); }
  function handleEdit(p){ setEditingPhase(p); setShowForm(true); }
  function handleDelete(p){
    if(!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    marketingApi.removeProductPhase(p.id).then(load).catch(err=>alert(err?.response?.data?.error||"Failed to delete phase."));
  }
  function handleSave(data){
    const req=editingPhase?marketingApi.updateProductPhase(editingPhase.id,data):marketingApi.createProductPhase(data);
    req.then(()=>{ setShowForm(false); setEditingPhase(null); load(); })
      .catch(err=>alert(err?.response?.data?.error||"Failed to save phase."));
  }

  // Enter is left to the phase-form panel's own fields; this modal only adds Escape-to-close.
  useModalHotkeys(onClose,null);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:640,maxWidth:"94vw",maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:0.4,textTransform:"uppercase"}}>Implementation Phases</div>
            <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>{product.name}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>

        <div style={{padding:"20px 24px",flex:1,overflowY:"auto"}}>
          {!showForm&&(
            <button onClick={handleAddNew} style={{marginBottom:16,padding:"8px 16px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}>+ Add Phase</button>
          )}

          {showForm&&(
            <PhaseFormPanel product={product} initial={editingPhase} onCancel={()=>{setShowForm(false);setEditingPhase(null);}} onSave={handleSave}/>
          )}

          {loading?(
            <div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:20}}>Loading…</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {phases.map(p=>(
                <div key={p.id} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:"#eff6ff",color:"#2563eb",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{p.phase_number}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{p.title} {p.weeks&&<span style={{fontWeight:500,color:"#9ca3af",fontSize:11}}>· {p.weeks}</span>}</div>
                        {p.description&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{p.description}</div>}
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{(p.steps||[]).length} step{(p.steps||[]).length===1?"":"s"}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>handleEdit(p)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:11,color:"#111827",cursor:"pointer"}}>Edit</button>
                      <button onClick={()=>handleDelete(p)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #fecaca",background:"#fee2e2",fontWeight:600,fontSize:11,color:"#b91c1c",cursor:"pointer"}}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {phases.length===0&&<div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:20}}>No phases yet for this product.</div>}
            </div>
          )}
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"9px 22px",borderRadius:8,border:"none",background:"#2563eb",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Demo Modal ---------------- */
function ProductTagPicker({selected,onAdd,onRemove,productOptions}){
  const available=productOptions.filter(p=>!selected.includes(p));
  return(
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:selected.length?10:0}}>
        {selected.map(p=>(
          <span key={p} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,fontSize:12,fontWeight:600,...(PRODUCT_COLORS[p]||{bg:"#f3f4f6",color:"#374151"})}}>
            {p}
            <span onClick={()=>onRemove(p)} style={{cursor:"pointer",fontWeight:800}}>×</span>
          </span>
        ))}
      </div>
      <select style={inputStyle} value="" onChange={e=>{ if(e.target.value) onAdd(e.target.value); }}>
        <option value="" disabled hidden>--Select product--</option>
        {available.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function DemoModal({onClose,onSave,nextDemoNumber,initial,productOptions,ownerOptions,customerOptions,demoTypeOptions,onOpenDemoTypeMaster}){
  const [demoNo]=useState(initial?.demoNo||nextDemoNumber);
  const [customer,setCustomer]=useState(initial?.customer||"");
  const [products,setProducts]=useState(initial?.product?initial.product.split(" + "):[]);
  const [demoDate,setDemoDate]=useState(initial?.demoDate||todayISO());
  const [type,setType]=useState(initial?.type||demoTypeOptions[0]||"");
  const [contactPerson,setContactPerson]=useState(initial?.contactPerson||"");
  const [conductedBy,setConductedBy]=useState(initial?.conductedBy||ownerOptions[0]);
  const [status,setStatus]=useState(initial?.status||"Requested");
  const [createdDate,setCreatedDate]=useState(initial?.createdDate||todayISO());

  function addProduct(p){ setProducts(prev=>[...prev,p]); }
  function removeProduct(p){ setProducts(prev=>prev.filter(x=>x!==p)); }

  function validate(){
    if(!customer.trim()){ alert("Please select a customer."); return false; }
    if(products.length===0){ alert("Please select at least one product."); return false; }
    if(!demoDate){ alert("Please select a demo date."); return false; }
    return true;
  }
  function handleSave(){
    if(!validate()) return;
    onSave({
      demoNo,
      customer:customer.trim(),
      contactPerson:contactPerson.trim(),
      product:products.join(" + "),
      demoDate,type,conductedBy,status,createdDate,
      nextFollowUp:initial?.nextFollowUp||null,
      activities:initial?.activities||[],
    });
  }

  useModalHotkeys(onClose,handleSave);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:700,maxWidth:"94vw",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>{initial?"Edit Demo":"New Demo"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>

        <div style={{padding:"6px 24px",textAlign:"right",fontSize:12,color:"#6b7280",flexShrink:0}}>{reqMark} = Required</div>

        <div style={{overflowY:"auto",flex:1}}>
          <div style={sectionHeaderStyle}>Demonstration Request</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Customer {reqMark}</label>
              <select style={inputStyle} value={customer} onChange={e=>setCustomer(e.target.value)}>
                <option value="">--Select customer--</option>
                {customerOptions.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tentative Demo Start Date {reqMark}</label>
              <input type="date" style={inputStyle} value={demoDate} onChange={e=>setDemoDate(e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Products {reqMark}</label>
              <ProductTagPicker selected={products} onAdd={addProduct} onRemove={removeProduct} productOptions={productOptions}/>
            </div>
            <div>
              <label style={labelStyle}>Type of Demonstration {reqMark}</label>
              <div style={{display:"flex",gap:8}}>
                <select style={inputStyle} value={type} onChange={e=>setType(e.target.value)}>
                  {demoTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                <button type="button" onClick={onOpenDemoTypeMaster} title="Manage demonstration types" style={{flexShrink:0,padding:"0 12px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",color:"#374151",fontWeight:600,fontSize:13,cursor:"pointer"}}>+</button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Demo Contact Person <span style={{color:"#9ca3af",fontWeight:500}}>(at customer)</span></label>
              <input style={inputStyle} value={contactPerson} onChange={e=>setContactPerson(e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Conducted By</label>
              <select style={inputStyle} value={conductedBy} onChange={e=>setConductedBy(e.target.value)}>
                {ownerOptions.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Demo Status</label>
              <select style={inputStyle} value={status} onChange={e=>setStatus(e.target.value)}>
                {DEMO_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={sectionHeaderStyle}>System Information</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Demo Number</label>
              <input style={{...inputStyle,background:"#f3f4f6",color:"#6b7280"}} value={demoNo} readOnly/>
            </div>
            <div>
              <label style={labelStyle}>Created Date</label>
              <input type="date" style={inputStyle} value={createdDate} onChange={e=>setCreatedDate(e.target.value)}/>
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#2563eb",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Order Modal ---------------- */
function OrderModal({onClose,onSave,nextOrderNumber,initial,productOptions,ownerOptions,customerOptions,mandatory}){
  const [orderNo]=useState(initial?.orderNo||nextOrderNumber);
  const [customer,setCustomer]=useState(initial?.customer||"");
  const [product,setProduct]=useState(initial?.product||productOptions[0]||"");
  const [date,setDate]=useState(initial?.date||todayISO());
  const [value,setValue]=useState(initial?.value!=null?String(initial.value).replace(/[₹,]/g,""):"");
  const [paid,setPaid]=useState(initial?.paid!=null?String(initial.paid).replace(/[₹,]/g,""):"0");
  const [poNo,setPoNo]=useState(initial?.poNo||"");
  const [poDocumentUrl,setPoDocumentUrl]=useState(initial?.poDocumentUrl||"");
  const [poDocumentName,setPoDocumentName]=useState(initial?.poDocumentName||"");
  const [uploadingPo,setUploadingPo]=useState(false);
  const [orderStatus,setOrderStatus]=useState(initial?.orderStatus||"Draft");
  const [paymentStatus,setPaymentStatus]=useState(initial?.paymentStatus||"Pending");
  const [assignedTo,setAssignedTo]=useState(initial?.assignedTo||ownerOptions[0]);

  function validate(){
    if(!customer.trim()){ alert("Please select a customer."); return false; }
    if(!product){ alert("Please select a product."); return false; }
    if(!date){ alert("Please select an order date."); return false; }
    if(!value||Number(value)<=0){ alert("Please enter a valid order value."); return false; }
    return true;
  }
  function handleSave(){
    if(!validate()) return;
    const v=Number(value)||0;
    const p=Math.min(Number(paid)||0,v);
    const outstanding=v-p;
    onSave({
      orderNo,customer:customer.trim(),product,date,
      value:formatRupee(v),paid:formatRupee(p),outstanding:formatRupee(outstanding),
      status:outstanding<=0?"Paid":p>0?"Partial":"Pending",
      poNo:poNo.trim()||null,poDocumentUrl:poDocumentUrl||null,poDocumentName:poDocumentName||null,orderStatus,paymentStatus,assignedTo,
    });
  }
  async function handlePoFile(e){
    const file=e.target.files?.[0];
    if(!file) return;
    setUploadingPo(true);
    try{
      const res=await uploadFile(file);
      setPoDocumentUrl(res.data.url);
      setPoDocumentName(file.name);
    }catch{ alert("Upload failed — max 10 MB, and only jpg/png/gif/webp/pdf/doc/docx/xls/xlsx/txt/zip files are allowed."); }
    finally{ setUploadingPo(false); e.target.value=""; }
  }

  useModalHotkeys(onClose,handleSave,{disableEscape:mandatory});

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={mandatory?undefined:onClose}>
      <div style={{background:"#fff",borderRadius:12,width:700,maxWidth:"94vw",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>{initial?.orderNo?"Edit Order":"New Order"}</div>
          {!mandatory&&<button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>}
        </div>
        {mandatory&&(
          <div style={{background:"#eff6ff",borderBottom:"1px solid #bfdbfe",padding:"8px 24px",fontSize:12,fontWeight:600,color:"#1d4ed8"}}>
            This demo was converted to an order — complete and save the details below to create it.
          </div>
        )}

        <div style={{padding:"6px 24px",textAlign:"right",fontSize:12,color:"#6b7280",flexShrink:0}}>{reqMark} = Required</div>

        <div style={{overflowY:"auto",flex:1}}>
          <div style={sectionHeaderStyle}>Order Details</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Customer {reqMark}</label>
              <select style={inputStyle} value={customer} onChange={e=>setCustomer(e.target.value)}>
                <option value="">--Select customer--</option>
                {customerOptions.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Product {reqMark}</label>
              <select style={inputStyle} value={product} onChange={e=>setProduct(e.target.value)}>
                {productOptions.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Order Date {reqMark}</label>
              <input type="date" style={inputStyle} value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Order Value (₹) {reqMark}</label>
              <input type="text" inputMode="numeric" style={inputStyle} value={value===""?"":Number(value).toLocaleString("en-IN")} onChange={e=>setValue(e.target.value.replace(/[^0-9]/g,""))} placeholder="e.g. 1,80,000"/>
            </div>
            <div>
              <label style={labelStyle}>Amount Paid (₹)</label>
              <input type="text" inputMode="numeric" style={inputStyle} value={paid===""?"":Number(paid).toLocaleString("en-IN")} onChange={e=>setPaid(e.target.value.replace(/[^0-9]/g,""))} placeholder="0"/>
            </div>
            <div>
              <label style={labelStyle}>Assigned To</label>
              <select style={inputStyle} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
                {ownerOptions.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div style={sectionHeaderStyle}>Purchase Order</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"end"}}>
            <div>
              <label style={labelStyle}>PO Number</label>
              <input style={inputStyle} value={poNo} onChange={e=>setPoNo(e.target.value)} placeholder="e.g. PO-2026-012"/>
            </div>
            <div style={{paddingBottom:2}}>
              <label style={labelStyle}>PO Document</label>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <label style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"1px dashed #bfdbfe",background:"#eff6ff",color:"#2563eb",fontSize:12,fontWeight:600,cursor:uploadingPo?"wait":"pointer"}}>
                  📎 {uploadingPo?"Uploading…":poDocumentUrl?"Replace":"Upload"}
                  <input type="file" style={{display:"none"}} disabled={uploadingPo} onChange={handlePoFile}/>
                </label>
                {poDocumentUrl&&(
                  <a href={fileUrl(poDocumentUrl)} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#059669",fontWeight:600,textDecoration:"none"}}>✓ {poDocumentName||"View file"}</a>
                )}
              </div>
            </div>
          </div>

          <div style={sectionHeaderStyle}>Status</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Order Status</label>
              <select style={inputStyle} value={orderStatus} onChange={e=>setOrderStatus(e.target.value)}>
                {[...ORDER_STATUSES,"Cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Payment Status</label>
              <select style={inputStyle} value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)}>
                {PAYMENT_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{padding:"0 24px 18px"}}>
            <label style={labelStyle}>Order Number</label>
            <input style={{...inputStyle,background:"#f3f4f6",color:"#6b7280",width:200}} value={orderNo} readOnly/>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
          {!mandatory&&<button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>}
          <button onClick={handleSave} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#2563eb",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Add Follow-up Modal ---------------- */
function AddFollowUpModal({demo,onClose,onSave,ownerOptions}){
  const [outcome,setOutcome]=useState("Positive");
  const [activityDate,setActivityDate]=useState(todayISO());
  const [nextFollowUp,setNextFollowUp]=useState("");
  const [notes,setNotes]=useState("");
  const [addedBy,setAddedBy]=useState(ownerOptions[0]);

  function handleSave(){
    if(!notes.trim()){ alert("Please enter remarks / notes."); return; }
    onSave({
      outcome,
      date:activityDate,
      next:nextFollowUp||null,
      note:notes.trim(),
      by:addedBy,
    });
  }

  useModalHotkeys(onClose,handleSave);

  const activities=demo.activities||[];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:720,maxWidth:"95vw",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>Add Follow-up — {demo.demoNo}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"#2563eb",color:"#fff",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{demo.customer[0]}</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{demo.customer}</div>
              <div style={{fontSize:12,color:"#2563eb",fontWeight:600}}>Demo: {demo.demoDate} · {demo.type}</div>
            </div>
          </div>
          <StatusPill label={demo.status}/>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>
          <div style={{width:260,borderRight:"1px solid #e5e7eb",padding:"18px 20px",overflowY:"auto",flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:12}}>HISTORY ({activities.length})</div>
            {activities.map((a,ai)=>{
              const o=OUTCOME_STYLES[a.outcome]||{dot:"#9ca3af",icon:""};
              return(
                <div key={ai} style={{display:"flex",gap:8,paddingBottom:14,marginBottom:14,borderBottom:ai<activities.length-1?"1px solid #f0f2f5":"none"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:o.dot,marginTop:5,flexShrink:0}}/>
                  <div style={{fontSize:12}}>
                    <div style={{fontWeight:700,color:o.color||"#374151"}}>{o.icon} {a.outcome}</div>
                    <div style={{color:"#9ca3af",marginTop:1}}>Logged {a.date}</div>
                    {a.next&&<div style={{color:"#2563eb",fontWeight:600,marginTop:3,display:"flex",alignItems:"center",gap:3}}>📅 Next follow-up: {a.next}</div>}
                    <div style={{color:"#374151",marginTop:4}}>{a.note}</div>
                    <div style={{color:"#9ca3af",marginTop:3}}>— {a.by}</div>
                  </div>
                </div>
              );
            })}
            {activities.length===0&&<div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic"}}>No history yet.</div>}
          </div>

          <div style={{flex:1,padding:"18px 24px",overflowY:"auto"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:16}}>+ New Follow-up Entry</div>

            <label style={labelStyle}>OUTCOME</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
              {OUTCOME_OPTIONS.map(o=>{
                const style=OUTCOME_STYLES[o];
                const active=outcome===o;
                return(
                  <button key={o} onClick={()=>setOutcome(o)} style={{
                    padding:"8px 14px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
                    border:"1px solid "+(active?style.color:"#d1d5db"),
                    background:active?style.bg:"#fff",
                    color:active?style.color:"#374151",
                  }}>{style.icon} {o}</button>
                );
              })}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div>
                <label style={labelStyle}>ACTIVITY DATE</label>
                <input type="date" style={inputStyle} value={activityDate} onChange={e=>setActivityDate(e.target.value)}/>
              </div>
              <div>
                <label style={labelStyle}>NEXT FOLLOW-UP</label>
                <input type="date" style={inputStyle} value={nextFollowUp} onChange={e=>setNextFollowUp(e.target.value)}/>
              </div>
            </div>

            <label style={labelStyle}>REMARKS / NOTES {reqMark}</label>
            <textarea style={{...inputStyle,minHeight:90,resize:"vertical",marginBottom:16}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Customer feedback, discussion points, next steps..."/>

            <label style={labelStyle}>ADDED BY</label>
            <select style={inputStyle} value={addedBy} onChange={e=>setAddedBy(e.target.value)}>
              {ownerOptions.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#2563eb",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save Follow-up</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Demos Tab ---------------- */
function ActivityCell({demo,onTrack}){
  const hasActivity=demo.activities&&demo.activities.length>0;
  return(
    <div>
      {hasActivity?(
        <>
          <div onClick={()=>onTrack(demo)} title="View follow-up history" style={{cursor:"pointer"}}>
            {demo.nextFollowUp?(
              <div style={{fontSize:12,color:"#2563eb",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>📅 Next: {demo.nextFollowUp}</div>
            ):(
              <div style={{fontSize:12,color:"#6b7280",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>🕓 Last: {demo.activities[demo.activities.length-1].date}</div>
            )}
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{demo.activities.length} {demo.activities.length===1?"activity":"activities"}</div>
          </div>
          <button onClick={()=>onTrack(demo)} style={{marginTop:4,padding:"3px 10px",borderRadius:6,border:"1px solid #bfdbfe",background:"#eff6ff",color:"#2563eb",fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Follow-up</button>
        </>
      ):(
        <>
          <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic"}}>No tracking</div>
          <button onClick={()=>onTrack(demo)} style={{marginTop:4,padding:"3px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",color:"#374151",fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Track</button>
        </>
      )}
    </div>
  );
}

function DemosTab({demos,onAddNew,onEdit,onDelete,onTrack}){
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [sortKey,setSortKey]=useState("demoNo");
  const [sortDir,setSortDir]=useState("asc");
  const [expanded,setExpanded]=useState(null);
  const [page,setPage]=useState(1);
  const pageSize=10;

  const counts={
    All:demos.length,
    Requested:demos.filter(d=>d.status==="Requested").length,
    Scheduled:demos.filter(d=>d.status==="Scheduled").length,
    Completed:demos.filter(d=>d.status==="Completed").length,
    "Follow-Up":demos.filter(d=>d.status==="Follow-Up").length,
    "Converted to Order":demos.filter(d=>d.status==="Converted to Order").length,
    Cancelled:demos.filter(d=>d.status==="Cancelled").length,
  };
  const subTabs=["All","Requested","Scheduled","Completed","Follow-Up","Converted to Order","Cancelled"];

  const filtered=useMemo(()=>{
    let rows=demos;
    if(statusFilter!=="All") rows=rows.filter(d=>d.status===statusFilter);
    const term=search.trim().toLowerCase();
    if(term) rows=rows.filter(d=>
      d.customer.toLowerCase().includes(term)||
      d.contactPerson.toLowerCase().includes(term)||
      d.conductedBy.toLowerCase().includes(term)||
      d.demoNo.toLowerCase().includes(term)
    );
    const sorted=[...rows].sort((a,b)=>{
      const av=a[sortKey]||"", bv=b[sortKey]||"";
      const cmp=String(av).localeCompare(String(bv));
      return sortDir==="asc"?cmp:-cmp;
    });
    return sorted;
  },[demos,statusFilter,search,sortKey,sortDir]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const pageRows=filtered.slice((page-1)*pageSize,page*pageSize);

  function toggleSort(key){
    if(sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }
  function pickTab(t){ setStatusFilter(t); setPage(1); }

  const cols=[
    {key:"demoNo",header:"DEMO NO"},
    {key:"customer",header:"CUSTOMER"},
    {key:"product",header:"PRODUCT"},
    {key:"demoDate",header:"DEMO DATE"},
    {key:"type",header:"TYPE"},
    {key:"conductedBy",header:"CONDUCTED BY"},
    {key:"status",header:"STATUS"},
  ];

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontSize:12,color:"#6b7280",fontWeight:600}}>Demos</div>
          <div style={{fontSize:18,fontWeight:800,color:"#111827"}}>{statusFilter}</div>
        </div>
        <button onClick={onAddNew} style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}>+ New Demo</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <select value={statusFilter} onChange={e=>pickTab(e.target.value)} style={{...inputStyle,width:220}}>
          {subTabs.map(t=><option key={t} value={t}>{t} ({counts[t]})</option>)}
        </select>
        <div style={{marginLeft:"auto",position:"relative",width:220}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search demos..." style={{...inputStyle,paddingLeft:34}}/>
        </div>
      </div>

      <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>{filtered.length} demos · Sorted by {cols.find(c=>c.key===sortKey)?.header||"Demo No"}</div>

      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {cols.map(c=>(
                  <th key={c.key} style={{...thStyle,cursor:"pointer"}} onClick={()=>toggleSort(c.key)}>
                    {c.header} {sortKey===c.key?(sortDir==="asc"?"↑":"↓"):"⇅"}
                  </th>
                ))}
                <th style={thStyle}>ACTIVITY</th>
                <th style={thStyle}/>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((d,i)=>(
                <Fragment key={d.demoNo+"-frag"}>
                  <tr key={d.demoNo} style={expanded===d.demoNo?{background:"#eff6ff"}:undefined}>
                    <td style={{...tdStyle,color:"#111827",fontWeight:700,whiteSpace:"nowrap"}}>
                      <div>{(page-1)*pageSize+i+1}</div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        {d.demoNo}
                        <button onClick={()=>setExpanded(prev=>prev===d.demoNo?null:d.demoNo)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:10}}>{expanded===d.demoNo?"▲":"▼"}</button>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{fontWeight:600,color:"#111827"}}>{d.customer}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>{d.contactPerson}</div>
                    </td>
                    <td style={tdStyle}>{d.product}</td>
                    <td style={{...tdStyle,color:"#6b7280",whiteSpace:"nowrap"}}>{d.demoDate}</td>
                    <td style={tdStyle}><span style={{padding:"3px 9px",borderRadius:6,fontSize:11,fontWeight:600,background:"#f3f4f6",color:"#374151"}}>{d.type}</span></td>
                    <td style={tdStyle}>{d.conductedBy}</td>
                    <td style={tdStyle}><DotStatusPill label={d.status}/></td>
                    <td style={tdStyle}><ActivityCell demo={d} onTrack={onTrack}/></td>
                    <td style={tdStyle}>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>onEdit(d)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:12,color:"#111827",cursor:"pointer"}}>Edit</button>
                        <button onClick={()=>onDelete(d)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #fecaca",background:"#fee2e2",fontWeight:600,fontSize:12,color:"#b91c1c",cursor:"pointer"}}>Del</button>
                      </div>
                    </td>
                  </tr>
                  {expanded===d.demoNo&&(
                    <tr key={d.demoNo+"-detail"}>
                      <td colSpan={9} style={{padding:0,borderBottom:"1px solid #f3f4f6"}}>
                        <div style={{background:"#fafbfc",padding:"18px 24px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:16}}>📋</span>
                              <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>Activity History</span>
                              <DotStatusPill label={d.status}/>
                              <span style={{fontSize:13,color:"#6b7280"}}>{d.customer}</span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:14}}>
                              <span style={{fontSize:12,color:"#6b7280",fontWeight:600}}>{(d.activities||[]).length} {(d.activities||[]).length===1?"activity":"activities"}</span>
                              <button onClick={()=>onTrack?onTrack(d):null} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Add Follow-up</button>
                            </div>
                          </div>

                          {d.activities&&d.activities.length>0?(
                            <div>
                              {d.activities.map((a,ai)=>{
                                const o=OUTCOME_STYLES[a.outcome]||{dot:"#9ca3af"};
                                const isLast=ai===d.activities.length-1;
                                return(
                                  <div key={ai} style={{display:"flex",gap:14}}>
                                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:14,flexShrink:0}}>
                                      <div style={{width:12,height:12,borderRadius:"50%",background:o.dot,marginTop:6}}/>
                                      {!isLast&&<div style={{width:2,flex:1,background:o.dot,opacity:0.3,marginTop:2}}/>}
                                    </div>
                                    <div style={{flex:1,background:"#fff",border:"1px solid #e5e7eb",borderLeft:"3px solid "+o.dot,borderRadius:8,padding:"12px 16px",marginBottom:14}}>
                                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                                          <OutcomeBadge label={a.outcome}/>
                                          <span style={{fontSize:12,color:"#6b7280"}}>· {a.date}</span>
                                          {a.next&&(
                                            <span style={{fontSize:12,color:"#2563eb",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>📅 Next: {a.next}</span>
                                          )}
                                        </div>
                                        <span style={{fontSize:12,color:"#9ca3af"}}>— {a.by}</span>
                                      </div>
                                      <div style={{fontSize:13,color:"#374151"}}>{a.note}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ):(
                            <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic",padding:"10px 0"}}>No activity logged yet.</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {pageRows.length===0&&<tr><td colSpan={9} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:32}}>No demos match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:"1px solid #e5e7eb",fontSize:13,color:"#6b7280"}}>
          <span>Showing {filtered.length===0?0:(page-1)*pageSize+1}–{Math.min(page*pageSize,filtered.length)} of {filtered.length} demos</span>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setPage(1)} disabled={page===1} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",cursor:page===1?"default":"pointer",opacity:page===1?0.5:1}}>«</button>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",cursor:page===1?"default":"pointer",opacity:page===1?0.5:1}}>‹ Prev</button>
            <span style={{padding:"5px 10px",borderRadius:6,background:"#2563eb",color:"#fff",fontWeight:700}}>{page}</span>
            <span>of {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",cursor:page===totalPages?"default":"pointer",opacity:page===totalPages?0.5:1}}>Next ›</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",cursor:page===totalPages?"default":"pointer",opacity:page===totalPages?0.5:1}}>»</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Orders Tab ---------------- */
function ProgressDots({status,onSelect}){
  const count=orderProgressCount(status);
  const accent=ORDER_STATUS_ACCENT[status]||"#9ca3af";
  return(
    <div style={{display:"flex",gap:4}}>
      {ORDER_STATUSES.map((stage,i)=>(
        <span
          key={stage}
          title={stage}
          onClick={onSelect?()=>onSelect(stage):undefined}
          style={{
            width:8,height:8,borderRadius:"50%",
            background:i<count-1?"#059669":i===count-1?accent:"#e5e7eb",
            cursor:onSelect?"pointer":"default",
            transition:"transform 0.1s",
          }}
          onMouseEnter={e=>{ if(onSelect) e.currentTarget.style.transform="scale(1.4)"; }}
          onMouseLeave={e=>{ if(onSelect) e.currentTarget.style.transform="scale(1)"; }}
        />
      ))}
    </div>
  );
}

function OrdersTab({orders,onAddNew,onEdit,onDelete,onSetStatus}){
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [sortKey,setSortKey]=useState("orderNo");
  const [sortDir,setSortDir]=useState("desc");

  const paymentPending=orders.filter(o=>parseRupee(o.outstanding)>0);

  const counts={
    All:orders.length,
    Draft:orders.filter(o=>o.orderStatus==="Draft").length,
    Confirmed:orders.filter(o=>o.orderStatus==="Confirmed").length,
    "PO Received":orders.filter(o=>o.orderStatus==="PO Received").length,
    Invoiced:orders.filter(o=>o.orderStatus==="Invoiced").length,
    "Payment Done":orders.filter(o=>o.orderStatus==="Payment Done").length,
    "Active (Go-Live)":orders.filter(o=>o.orderStatus==="Active (Go-Live)").length,
    Cancelled:orders.filter(o=>o.orderStatus==="Cancelled").length,
  };
  const subTabs=["All","Draft","Confirmed","PO Received","Invoiced","Payment Done","Active (Go-Live)","Cancelled"];

  const totalValue=useMemo(()=>orders.reduce((s,o)=>s+parseRupee(o.value),0),[orders]);

  const filtered=useMemo(()=>{
    let rows=orders;
    if(statusFilter==="PaymentPending") rows=rows.filter(o=>parseRupee(o.outstanding)>0);
    else if(statusFilter!=="All") rows=rows.filter(o=>o.orderStatus===statusFilter);
    const term=search.trim().toLowerCase();
    if(term) rows=rows.filter(o=>
      o.customer.toLowerCase().includes(term)||
      o.orderNo.toLowerCase().includes(term)||
      (o.poNo||"").toLowerCase().includes(term)||
      o.assignedTo.toLowerCase().includes(term)
    );
    const sorted=[...rows].sort((a,b)=>{
      const av=a[sortKey]||"", bv=b[sortKey]||"";
      const cmp=String(av).localeCompare(String(bv));
      return sortDir==="asc"?cmp:-cmp;
    });
    return sorted;
  },[orders,statusFilter,search,sortKey,sortDir]);

  function toggleSort(key){
    if(sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const cols=[
    {key:"orderNo",header:"ORDER NO"},
    {key:"customer",header:"CUSTOMER"},
    {key:"product",header:"PRODUCT"},
    {key:"date",header:"ORDER DATE"},
    {key:"value",header:"VALUE (₹)"},
    {key:"poNo",header:"PO NO"},
    {key:"orderStatus",header:"ORDER STATUS"},
    {key:"paymentStatus",header:"PAYMENT"},
    {key:"assignedTo",header:"ASSIGNED TO"},
  ];

  return(
    <div>
      {paymentPending.length>0&&(
        <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <span style={{fontSize:20}}>💳</span>
            <span style={{fontSize:14,fontWeight:700,color:"#dc2626"}}>{paymentPending.length} orders with payment pending</span>
            {paymentPending.map(o=>(
              <span key={o.orderNo} style={{fontSize:12,fontWeight:600,color:"#374151",background:"#fff",border:"1px solid #fecaca",borderRadius:20,padding:"4px 12px"}}>{o.orderNo} · {o.customer} · {o.orderStatus}</span>
            ))}
          </div>
          <button onClick={()=>setStatusFilter("PaymentPending")} style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>View All →</button>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:12,color:"#6b7280",fontWeight:600}}>Orders</div>
          <div style={{fontSize:18,fontWeight:800,color:"#111827"}}>{statusFilter==="PaymentPending"?"Payment Pending":statusFilter}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:13,fontWeight:700,color:"#059669",background:"#ecfdf5",padding:"7px 14px",borderRadius:20}}>₹{Math.round(totalValue/1000)}K total</span>
          <button onClick={onAddNew} style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}>+ New Order</button>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inputStyle,width:220}}>
          {subTabs.map(t=><option key={t} value={t}>{t} ({counts[t]})</option>)}
          <option value="PaymentPending">💳 Payment Pending ({paymentPending.length})</option>
        </select>
        <div style={{marginLeft:"auto",position:"relative",width:220}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders..." style={{...inputStyle,paddingLeft:34}}/>
        </div>
      </div>

      <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>{filtered.length} orders</div>

      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                {cols.map(c=>(
                  <th key={c.key} style={{...thStyle,cursor:"pointer"}} onClick={()=>toggleSort(c.key)}>
                    {c.header} {sortKey===c.key?(sortDir==="asc"?"↑":"↓"):"⇅"}
                  </th>
                ))}
                <th style={thStyle}>PROGRESS</th>
                <th style={thStyle}/>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o,i)=>(
                <tr key={o.orderNo}>
                  <td style={{...tdStyle,color:"#9ca3af"}}>{i+1}</td>
                  <td style={{...tdStyle,color:"#111827",fontWeight:700}}>{o.orderNo}</td>
                  <td style={{...tdStyle,fontWeight:600}}>{o.customer}</td>
                  <td style={tdStyle}>{o.product}</td>
                  <td style={{...tdStyle,color:"#6b7280",whiteSpace:"nowrap"}}>{o.date}</td>
                  <td style={tdStyle}>
                    <div style={{fontWeight:700,color:"#111827"}}>{o.value}</div>
                    {parseRupee(o.paid)>0&&<div style={{fontSize:11,color:"#6b7280"}}>✓ {o.paid}</div>}
                    {parseRupee(o.outstanding)>0&&<div style={{fontSize:11,color:"#6b7280"}}>⚠ {o.outstanding} due</div>}
                  </td>
                  <td style={tdStyle}>
                    <div style={{color:"#111827"}}>{o.poNo||"—"}</div>
                    {o.poDocumentUrl?(
                      <a href={fileUrl(o.poDocumentUrl)} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#059669",fontWeight:600,textDecoration:"none"}}>✓ {o.poDocumentName||"View file"}</a>
                    ):(
                      <div style={{fontSize:11,color:"#6b7280"}}>⚠ Not uploaded</div>
                    )}
                  </td>
                  <td style={tdStyle}><StatusPill label={o.orderStatus}/></td>
                  <td style={tdStyle}>{o.paymentStatus}</td>
                  <td style={tdStyle}>{o.assignedTo}</td>
                  <td style={tdStyle}><ProgressDots status={o.orderStatus} onSelect={onSetStatus?stage=>onSetStatus(o,stage):undefined}/></td>
                  <td style={tdStyle}>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>onEdit(o)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:12,color:"#111827",cursor:"pointer"}}>Edit</button>
                      <button onClick={()=>onDelete(o)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #fecaca",background:"#fee2e2",fontWeight:600,fontSize:12,color:"#b91c1c",cursor:"pointer"}}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={12} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:32}}>No orders match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:"1px solid #e5e7eb",fontSize:13,color:"#6b7280"}}>
          <span>Showing 1–{filtered.length} of {filtered.length}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Implementation Tab ---------------- */
function PhaseCard({p,onUpdate}){
  const [open,setOpen]=useState(false);
  const displayStatus=phaseDisplayStatus(p);
  const badgeColor=displayStatus==="Completed"?"#059669":displayStatus==="In Progress"?"#2563eb":displayStatus==="On Hold"?"#d97706":"#9ca3af";
  const completed=p.steps.filter(s=>s.done).length;
  const total=p.steps.length;
  const pct=total===0?0:Math.round((completed/total)*100);

  // Steps must be completed in order, and once checked they're locked — no unchecking.
  const nextIndex=p.steps.findIndex(s=>!s.done);
  function toggleStep(i){
    if(i!==nextIndex) return;
    const steps=p.steps.map((s,idx)=>idx===i?{...s,done:true}:s);
    const status=steps.every(s=>s.done)?"Completed":"In Progress";
    onUpdate({steps,status});
  }
  function setField(field,value){ onUpdate({[field]:value}); }

  return(
    <div style={{...cardStyle,padding:0,overflow:"hidden",marginBottom:14}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",cursor:"pointer"}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:badgeColor,color:"#fff",fontSize:15,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{p.phase}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>{p.title}</span>
            {p.weeks&&<span style={{fontSize:12,color:"#9ca3af"}}>{p.weeks}</span>}
            <StatusPill label={displayStatus}/>
          </div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>{p.desc}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:100,height:6,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:badgeColor,borderRadius:4}}/>
          </div>
          <span style={{fontSize:13,fontWeight:700,color:"#111827",whiteSpace:"nowrap"}}>{completed}/{total}</span>
          <span style={{color:"#9ca3af",fontSize:13}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open&&(
        <div style={{padding:"0 20px 20px 76px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
          <div>
            <label style={labelStyle}>CHECKLIST</label>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {p.steps.map((s,i)=>{
                const isNext=i===nextIndex;
                return(
                  <label key={i} style={{display:"flex",alignItems:"center",gap:9,fontSize:13,cursor:s.done?"default":isNext?"pointer":"not-allowed",color:s.done?"#9ca3af":isNext?"#111827":"#c4c9d1",textDecoration:s.done?"line-through":"none"}}>
                    <input type="checkbox" checked={s.done} disabled={!isNext} onChange={()=>toggleStep(i)}/>
                    {s.text}
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={labelStyle}>PHASE STATUS</label>
              <select style={inputStyle} value={p.status} onChange={e=>setField("status",e.target.value)}>
                {["Not Started","In Progress","Completed","On Hold"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={labelStyle}>START DATE</label>
                <input type="date" style={inputStyle} value={p.startDate||""} onChange={e=>setField("startDate",e.target.value)}/>
              </div>
              <div>
                <label style={labelStyle}>END DATE</label>
                <input type="date" style={inputStyle} value={p.endDate||""} onChange={e=>setField("endDate",e.target.value)}/>
              </div>
            </div>
            <div>
              <label style={labelStyle}>RESPONSIBLE PERSON</label>
              <input style={inputStyle} value={p.responsiblePerson||""} onChange={e=>setField("responsiblePerson",e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>NOTES</label>
              <textarea style={{...inputStyle,minHeight:70,resize:"vertical"}} value={p.notes||""} onChange={e=>setField("notes",e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>DOCUMENTS</label>
              <label style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"1px dashed #bfdbfe",background:"#eff6ff",color:"#2563eb",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                📎 Upload
                <input type="file" style={{display:"none"}} onChange={e=>{ if(e.target.files[0]) setField("documents",[...(p.documents||[]),e.target.files[0].name]); }}/>
              </label>
              {(p.documents||[]).length>0&&(
                <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
                  {p.documents.map((d,i)=><div key={i} style={{fontSize:12,color:"#374151"}}>📄 {d}</div>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImplementationTab({records,onUpdatePhase,onAddPhases,productOptions}){
  const [filter,setFilter]=useState("Active");
  const [activeTab,setActiveTab]=useState("Active");
  const [search,setSearch]=useState("");
  const [productFilter,setProductFilter]=useState("All Products");
  const [selectedOrderNo,setSelectedOrderNo]=useState(records[0]?.orderNo||null);

  const visible=useMemo(()=>{
    let rows=records;
    if(filter==="Active") rows=rows.filter(r=>implOverallPct(r)<100);
    if(productFilter!=="All Products") rows=rows.filter(r=>r.product===productFilter);
    const term=search.trim().toLowerCase();
    if(term) rows=rows.filter(r=>r.customer.toLowerCase().includes(term));
    return rows;
  },[records,filter,productFilter,search]);

  const selected=visible.find(r=>r.orderNo===selectedOrderNo)||visible[0]||null;
  const overallPct=selected?implOverallPct(selected):0;

  return(
    <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:18,alignItems:"start"}}>
      <div>
        <div style={{display:"flex",gap:0,marginBottom:10,background:"#fff",border:"1px solid #e4e7ec",borderRadius:8,padding:3,alignItems:"stretch"}}>
          <button onClick={()=>{setActiveTab("Active");setFilter("Active");setProductFilter("All Products");}} style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",background:activeTab==="Active"?"#2563eb":"transparent",color:activeTab==="Active"?"#fff":"#6b7280",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Active ({records.filter(r=>implOverallPct(r)<100).length})
          </button>
          <button onClick={()=>setActiveTab("Product")} style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",background:activeTab==="Product"?"#2563eb":"transparent",color:activeTab==="Product"?"#fff":"#6b7280",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Product
          </button>
          <button onClick={()=>{setActiveTab("All");setFilter("All");setProductFilter("All Products");}} style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",background:activeTab==="All"?"#2563eb":"transparent",color:activeTab==="All"?"#fff":"#6b7280",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            All ({records.length})
          </button>
        </div>
        {activeTab==="Product"&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:"#6b7280",whiteSpace:"nowrap"}}>Product:</label>
            <select value={productFilter} onChange={e=>setProductFilter(e.target.value)} style={{...inputStyle,flex:1,padding:"7px 10px",fontSize:12}}>
              <option value="All Products">All Products</option>
              {productOptions.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <div style={{position:"relative",marginBottom:12}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer..." style={{...inputStyle,paddingLeft:34}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {visible.map(r=>{
            const pct=implOverallPct(r);
            const active=selected&&r.orderNo===selected.orderNo;
            return(
              <div key={r.orderNo} onClick={()=>setSelectedOrderNo(r.orderNo)} style={{
                cursor:"pointer",border:"1px solid "+(active?"#2563eb":"#e5e7eb"),
                background:active?"#eff6ff":"#fff",borderRadius:10,padding:"12px 14px",
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>{r.customer}</span>
                  {pct===100&&<span style={{fontSize:10,fontWeight:800,color:"#059669",background:"#ecfdf5",padding:"2px 7px",borderRadius:10}}>✓ DONE</span>}
                </div>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{r.orderNo} · {r.product}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                  <div style={{flex:1,height:6,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:pct===100?"#059669":"#2563eb",borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:"#6b7280"}}>{r.phases.filter(p=>phaseDisplayStatus(p)==="Completed").length}/{r.phases.length}</span>
                </div>
              </div>
            );
          })}
          {visible.length===0&&<div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:20}}>No customers found.</div>}
        </div>
      </div>

      <div>
        {selected?(
          <>
            <div style={{...cardStyle,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:"#111827"}}>{selected.customer}</div>
                <div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{selected.orderNo} · {selected.product}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:26,fontWeight:800,color:overallPct===100?"#059669":"#2563eb"}}>{overallPct}%</div>
                <div style={{display:"flex",gap:4,justifyContent:"flex-end",marginTop:2}}>
                  {selected.phases.map(p=>(
                    <span key={p.phase} style={{width:8,height:8,borderRadius:"50%",background:p.status==="Completed"?"#059669":p.status==="In Progress"?"#2563eb":"#e5e7eb"}}/>
                  ))}
                </div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Overall</div>
              </div>
            </div>
            {selected.phases.length===0?(
              <div style={{...cardStyle,padding:40,textAlign:"center"}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:6}}>No phases configured for {selected.product}</div>
                <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>Add an implementation phase template for this product to start tracking progress.</div>
                <button onClick={()=>onAddPhases(selected.product)} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}>+ Add Phases for {selected.product}</button>
              </div>
            ):(
              selected.phases.map(p=><PhaseCard key={p.phase} p={p} onUpdate={patch=>onUpdatePhase(selected,p.phase,patch)}/>)
            )}
          </>
        ):(
          <div style={{...cardStyle,padding:60,textAlign:"center",color:"#9ca3af"}}>Select a customer to view implementation progress.</div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Renewals Tab ---------------- */
const RENEWAL_STATUS_OPTIONS=["Active","Due Soon","Overdue","Renewed","Churned"];

function EditRenewalModal({renewal,onClose,onSave}){
  const [license,setLicense]=useState(renewal.license||"");
  const [users,setUsers]=useState(renewal.users||"");
  const [contractStart,setContractStart]=useState(renewal.contractStart||"");
  const [contractEnd,setContractEnd]=useState(renewal.contractEnd||"");
  const [value,setValue]=useState(String(renewal.value||"").replace(/[₹,]/g,""));
  const [assignedTo,setAssignedTo]=useState(renewal.assignedTo||"");
  const [notes,setNotes]=useState(renewal.notes||"");

  function handleSave(){
    onSave({
      ...renewal,
      license:license.trim(),
      users:users?Number(users):"",
      contractStart,contractEnd,
      value:formatRupee(Number(value)||0),
      assignedTo:assignedTo.trim(),
      notes:notes.trim(),
    });
  }

  useModalHotkeys(onClose,handleSave);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:520,maxWidth:"92vw",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>{renewal.id?"Edit Contract":"Complete Renewal"} — {renewal.customer}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>
        {!renewal.id&&(
          <div style={{background:"#eff6ff",borderBottom:"1px solid #bfdbfe",padding:"8px 24px",fontSize:12,fontWeight:600,color:"#1d4ed8"}}>
            This customer's implementation is complete — fill in the contract details below to create the renewal.
          </div>
        )}
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>License</label>
              <input style={inputStyle} value={license} onChange={e=>setLicense(e.target.value)} placeholder="e.g. Annual"/>
            </div>
            <div>
              <label style={labelStyle}>Users</label>
              <input type="number" style={inputStyle} value={users} onChange={e=>setUsers(e.target.value)}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Contract Start</label>
              <input type="date" style={inputStyle} value={contractStart} onChange={e=>setContractStart(e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Contract End</label>
              <input type="date" style={inputStyle} value={contractEnd} onChange={e=>setContractEnd(e.target.value)}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Order Value (₹)</label>
              <input type="number" style={inputStyle} value={value} onChange={e=>setValue(e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Assigned To</label>
              <input style={inputStyle} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}/>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{...inputStyle,minHeight:70,resize:"vertical"}} value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb"}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#2563eb",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

function RenewModal({renewal,onClose,onSave}){
  const [newStartDate,setNewStartDate]=useState(renewal.contractEnd);
  const [newEndDate,setNewEndDate]=useState(()=>{
    const d=new Date(renewal.contractEnd);
    d.setFullYear(d.getFullYear()+1);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  });
  const [newValue,setNewValue]=useState(String(renewal.value).replace(/[₹,]/g,""));
  const [renewStatus,setRenewStatus]=useState("Active");
  const [renewNotes,setRenewNotes]=useState("");

  function handleSave(){
    if(!newStartDate){ alert("Please select a new contract start date."); return; }
    if(!newEndDate){ alert("Please select a new contract end date."); return; }
    onSave({
      contractStart:newStartDate,
      contractEnd:newEndDate,
      value:formatRupee(Number(newValue)||0),
      renewalStatus:renewStatus,
      notes:renewNotes.trim()||"—",
    });
  }

  useModalHotkeys(onClose,handleSave);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:500,maxWidth:"92vw",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>Renew Contract — {renewal.customer}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>New Contract Start {reqMark}</label>
              <input type="date" style={inputStyle} value={newStartDate} onChange={e=>setNewStartDate(e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>New Contract End {reqMark}</label>
              <input type="date" style={inputStyle} value={newEndDate} onChange={e=>setNewEndDate(e.target.value)}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Renewal Value (₹)</label>
              <input type="number" style={inputStyle} value={newValue} onChange={e=>setNewValue(e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Renewal Status</label>
              <select style={inputStyle} value={renewStatus} onChange={e=>setRenewStatus(e.target.value)}>
                {RENEWAL_STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Renewal Notes</label>
            <textarea style={{...inputStyle,minHeight:80,resize:"vertical"}} value={renewNotes} onChange={e=>setRenewNotes(e.target.value)} placeholder="e.g. Customer confirmed renewal via email on..."/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb"}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#059669",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>✓ Save Renewal</button>
        </div>
      </div>
    </div>
  );
}

function RenewalsTab({renewals,onRenew,onEdit}){
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [renewing,setRenewing]=useState(null);
  const [expanded,setExpanded]=useState(null);

  const withStatus=useMemo(()=>renewals.map(r=>({...r,computedStatus:renewalStatusFor(r),daysLeftNum:daysLeftFrom(r.contractEnd)})),[renewals]);

  const counts={
    All:withStatus.length,
    Active:withStatus.filter(r=>r.computedStatus==="Active").length,
    "Due Soon":withStatus.filter(r=>r.computedStatus==="Due Soon").length,
    Overdue:withStatus.filter(r=>r.computedStatus==="Overdue").length,
    Renewed:withStatus.filter(r=>r.computedStatus==="Renewed").length,
    Churned:withStatus.filter(r=>r.computedStatus==="Churned").length,
  };
  const subTabs=["All","Active","Due Soon","Overdue","Renewed","Churned"];

  const filtered=useMemo(()=>{
    let rows=withStatus;
    if(statusFilter!=="All") rows=rows.filter(r=>r.computedStatus===statusFilter);
    const term=search.trim().toLowerCase();
    if(term) rows=rows.filter(r=>r.customer.toLowerCase().includes(term)||r.assignedTo.toLowerCase().includes(term));
    return rows;
  },[withStatus,statusFilter,search]);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontSize:12,color:"#6b7280",fontWeight:600}}>Renewals</div>
          <div style={{fontSize:18,fontWeight:800,color:"#111827"}}>Contract Tracker</div>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inputStyle,width:200}}>
          {subTabs.map(t=><option key={t} value={t}>{t} ({counts[t]})</option>)}
        </select>
        <div style={{marginLeft:"auto",position:"relative",width:220}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer..." style={{...inputStyle,paddingLeft:34}}/>
        </div>
      </div>

      <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>{filtered.length} contracts</div>

      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>CUSTOMER</th>
                <th style={thStyle}>PRODUCT</th>
                <th style={thStyle}>LICENSE</th>
                <th style={thStyle}>USERS</th>
                <th style={thStyle}>CONTRACT START</th>
                <th style={thStyle}>CONTRACT END</th>
                <th style={thStyle}>DAYS LEFT</th>
                <th style={thStyle}>ORDER VALUE</th>
                <th style={thStyle}>RENEWAL STATUS</th>
                <th style={thStyle}>ASSIGNED TO</th>
                <th style={thStyle}>NOTES</th>
                <th style={thStyle}/>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i)=>{
                const hist=r.history||[];
                const isOpen=expanded===r.id;
                return(
                  <Fragment key={r.id+"-frag"}>
                    <tr key={r.id} style={isOpen?{background:"#eff6ff"}:undefined}>
                      <td style={{...tdStyle,color:"#9ca3af"}}>
                        <div>{i+1}</div>
                        <button onClick={()=>setExpanded(prev=>prev===r.id?null:r.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:10}}>{isOpen?"▲":"▼"}</button>
                      </td>
                      <td style={{...tdStyle,fontWeight:700,cursor:"pointer"}} onClick={()=>setExpanded(prev=>prev===r.id?null:r.id)}>{r.customer}</td>
                      <td style={tdStyle}>{r.product}</td>
                      <td style={tdStyle}>{r.license}</td>
                      <td style={tdStyle}>{r.users}</td>
                      <td style={{...tdStyle,color:"#6b7280"}}>{r.contractStart}</td>
                      <td style={{...tdStyle,color:"#6b7280",fontWeight:700}}>{r.contractEnd}</td>
                      <td style={tdStyle}>
                        <span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap",
                          background:r.daysLeftNum<0?"#fef2f2":r.daysLeftNum<=30?"#fffbeb":"#ecfdf5",
                          color:r.daysLeftNum<0?"#dc2626":r.daysLeftNum<=30?"#d97706":"#059669"}}>
                          {r.daysLeftNum<0?Math.abs(r.daysLeftNum)+"d overdue":r.daysLeftNum+"d left"}
                        </span>
                      </td>
                      <td style={{...tdStyle,fontWeight:700}}>{r.value}</td>
                      <td style={tdStyle}><StatusPill label={r.computedStatus}/></td>
                      <td style={tdStyle}>{r.assignedTo}</td>
                      <td style={{...tdStyle,color:"#6b7280"}}>{r.notes||"—"}</td>
                      <td style={tdStyle}>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>onEdit(r)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",color:"#111827",fontWeight:600,fontSize:12,cursor:"pointer"}}>Edit</button>
                          <button onClick={()=>setRenewing(r)} style={{padding:"6px 14px",borderRadius:6,border:"none",background:"#059669",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>↻ Renew</button>
                        </div>
                      </td>
                    </tr>
                    {isOpen&&(
                      <tr key={r.id+"-detail"}>
                        <td colSpan={13} style={{padding:0,borderBottom:"1px solid #f3f4f6"}}>
                          <div style={{background:"#f0fdf6",padding:"14px 24px"}}>
                            <div style={{fontSize:13,fontWeight:700,color:"#059669",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                              ↻ Renewal History — {r.customer} <span style={{fontWeight:500,color:"#6b7280",fontSize:12}}>{hist.length} renewal{hist.length===1?"":"s"}</span>
                            </div>
                            {hist.length>0?(
                              <div style={{background:"#fff",borderRadius:8,border:"1px solid #d1fae5",overflow:"hidden"}}>
                                <table style={{width:"100%",borderCollapse:"collapse"}}>
                                  <thead>
                                    <tr>
                                      <th style={thStyle}>#</th>
                                      <th style={thStyle}>RENEWED ON</th>
                                      <th style={thStyle}>CONTRACT START</th>
                                      <th style={thStyle}>CONTRACT END</th>
                                      <th style={thStyle}>VALUE</th>
                                      <th style={thStyle}>STATUS</th>
                                      <th style={thStyle}>NOTES</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {hist.map((h,hi)=>(
                                      <tr key={hi}>
                                        <td style={{...tdStyle,color:"#9ca3af"}}>{hi+1}</td>
                                        <td style={{...tdStyle,fontWeight:700}}>{h.renewedOn}</td>
                                        <td style={{...tdStyle,color:"#6b7280"}}>{h.contractStart}</td>
                                        <td style={{...tdStyle,color:"#6b7280"}}>{h.contractEnd}</td>
                                        <td style={{...tdStyle,fontWeight:700,color:"#059669"}}>{h.value}</td>
                                        <td style={tdStyle}><StatusPill label={h.status}/></td>
                                        <td style={{...tdStyle,color:"#374151"}}>{h.notes}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ):(
                              <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic",padding:"6px 0"}}>No renewals recorded yet for this contract.</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length===0&&<tr><td colSpan={13} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:32}}>No contracts match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:"1px solid #e5e7eb",fontSize:13,color:"#6b7280"}}>
          <span>Showing 1–{filtered.length} of {filtered.length}</span>
        </div>
      </div>

      {renewing&&(
        <RenewModal
          renewal={renewing}
          onClose={()=>setRenewing(null)}
          onSave={(patch)=>{ onRenew(renewing.id,patch); setRenewing(null); }}
        />
      )}
    </div>
  );
}

/* ---------------- Reports Tab ---------------- */
const REPORTS_LIST=[
  {id:"demoActivity",icon:"🎬",tag:"MOM",tagColor:{bg:"#eff6ff",color:"#2563eb"},title:"Demo Activity Report",subtitle:"Full demo history with activity timeline, …",description:"Full demo history with activity timeline, outcomes and next steps per customer."},
  {id:"poReceipt",icon:"📄",tag:"Orders",tagColor:{bg:"#eff6ff",color:"#2563eb"},title:"PO Receipt Report",subtitle:"Purchase order summary for all customers w…",description:"Purchase order summary for all customers with payment status and contract details."},
  {id:"leadStatus",icon:"🎯",tag:"Leads",tagColor:{bg:"#eff6ff",color:"#2563eb"},title:"Lead Status Report",subtitle:"Lead pipeline overview with status, owner, product interest and follow-…",description:"Lead pipeline overview with status, owner, product interest and follow-up summary."},
];

function ReportCard({report,onOpen}){
  return(
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
      <div style={{background:"#1e2a56",padding:"18px 20px",display:"flex",gap:12,alignItems:"flex-start"}}>
        <div style={{width:38,height:38,borderRadius:8,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{report.icon}</div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{report.title}</div>
          <div style={{fontSize:12,color:"#93c5fd",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{report.subtitle}</div>
        </div>
      </div>
      <div style={{padding:"18px 20px"}}>
        <div style={{fontSize:13,color:"#374151",marginBottom:16,minHeight:40}}>{report.description}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:report.tagColor.bg,color:report.tagColor.color}}>{report.tag}</span>
          <button onClick={()=>onOpen(report.id)} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #2563eb",background:"#fff",color:"#2563eb",fontWeight:700,fontSize:13,cursor:"pointer"}}>Generate Report →</button>
        </div>
      </div>
    </div>
  );
}

function ReportsHome({onOpen}){
  return(
    <div>
      <div style={{fontSize:12,color:"#6b7280",fontWeight:600,marginBottom:2}}>Marketing Hub</div>
      <div style={{fontSize:22,fontWeight:800,color:"#111827",marginBottom:20}}>Reports</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {REPORTS_LIST.map(r=><ReportCard key={r.id} report={r} onOpen={onOpen}/>)}
      </div>
    </div>
  );
}

function ReportShell({title,icon,onBack,children}){
  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:"#2563eb",fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:14,padding:0}}>← Back to Reports</button>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:38,height:38,borderRadius:8,background:"#1e2a56",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{icon}</div>
        <div style={{fontSize:18,fontWeight:800,color:"#111827"}}>{title}</div>
      </div>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
        {children}
      </div>
    </div>
  );
}

function ReportFilterBar({children}){
  return(
    <div style={{padding:"18px 24px",borderBottom:"1px solid #e5e7eb",background:"#fafbfc"}}>
      <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:0.5,marginBottom:14}}>REPORT FILTERS</div>
      {children}
    </div>
  );
}
function ReportKpi({value,label,accent}){
  return(
    <div style={{flex:1,borderTop:"3px solid "+accent,background:"#fff",border:"1px solid #e5e7eb",borderTopWidth:3,borderTopColor:accent,borderRadius:8,padding:"14px 16px"}}>
      <div style={{fontSize:26,fontWeight:800,color:accent}}>{value}</div>
      <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{label}</div>
    </div>
  );
}

function todayDisplayDate(){
  const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const d=new Date();
  return d.getDate()+" "+months[d.getMonth()]+" "+d.getFullYear();
}

function ReportDocument({title,subtitle,dateLabel,count,countLabel,totalValueDisplay,kpis,children}){
  return(
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          .mp-print-area, .mp-print-area * { visibility: visible !important; }
          .mp-print-area {
            position: absolute !important;
            left: 0; top: 0; width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .mp-print-area table { page-break-inside: auto; }
          .mp-print-area tr { page-break-inside: avoid; page-break-after: auto; }
          .mp-print-area thead { display: table-header-group; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>
      <div className="mp-print-area" style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"28px 32px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:"#2563eb",letterSpacing:0.6}}>MPM INFOSOFT PVT. LTD.</div>
            <div style={{fontSize:24,fontWeight:800,color:"#111827",marginTop:6}}>{title}</div>
            <div style={{fontSize:13,color:"#6b7280",marginTop:4}}>{subtitle}</div>
          </div>
          <div style={{textAlign:"right",fontSize:13,color:"#374151",lineHeight:1.8}}>
            <div><b>Date:</b> {dateLabel}</div>
            <div><b>{countLabel}:</b> {count}</div>
            {totalValueDisplay&&<div><b>Total Value:</b> {totalValueDisplay}</div>}
          </div>
        </div>
        <div style={{borderTop:"3px solid #2563eb",marginBottom:24}}/>

        <div style={{display:"flex",gap:16,marginBottom:24,flexWrap:"wrap"}}>
          {kpis.map(k=>(
            <div key={k.label} style={{flex:1,minWidth:140,border:"1px solid #e5e7eb",borderTop:"3px solid "+k.accent,borderRadius:8,padding:"14px 16px"}}>
              <div style={{fontSize:26,fontWeight:800,color:k.accent}}>{k.value}</div>
              <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{k.label}</div>
            </div>
          ))}
        </div>

        {children}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24,paddingTop:14,borderTop:"1px solid #e5e7eb",fontSize:12,color:"#9ca3af"}}>
          <span>MPM Infosoft Pvt. Ltd. — Confidential</span>
          <span>Generated {dateLabel} · MPulse</span>
        </div>
      </div>
    </>
  );
}

async function downloadReportPdf(title){
  const node=document.querySelector(".mp-print-area");
  if(!node) return;
  const canvas=await html2canvas(node,{scale:2,backgroundColor:"#ffffff"});
  const img=canvas.toDataURL("image/png");
  const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  const pageW=pdf.internal.pageSize.getWidth();
  const pageH=pdf.internal.pageSize.getHeight();
  const imgH=(canvas.height*pageW)/canvas.width;
  let heightLeft=imgH;
  let y=0;
  pdf.addImage(img,"PNG",0,y,pageW,imgH);
  heightLeft-=pageH;
  while(heightLeft>0){
    y=heightLeft-imgH;
    pdf.addPage();
    pdf.addImage(img,"PNG",0,y,pageW,imgH);
    heightLeft-=pageH;
  }
  const fileSlug=title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  pdf.save(`${fileSlug}-${todayISO()}.pdf`);
}

function downloadReportExcel(title){
  const table=document.querySelector(".mp-print-area table");
  if(!table) return;
  const wb=XLSX.utils.table_to_book(table,{sheet:title.replace(/[\\/*?:[\]]/g,"").slice(0,31)||"Report"});
  const fileSlug=title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  XLSX.writeFile(wb,`${fileSlug}-${todayISO()}.xlsx`);
}

function ReportPrintToolbar({title,count,countLabel,dateLabel,onBack,onAllReports}){
  const [downloading,setDownloading]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  async function handleDownloadPdf(){
    setMenuOpen(false);
    setDownloading(true);
    try{ await downloadReportPdf(title); }
    catch(err){ console.error(err); alert("Failed to generate PDF."); }
    finally{ setDownloading(false); }
  }
  function handleDownloadExcel(){
    setMenuOpen(false);
    try{ downloadReportExcel(title); }
    catch(err){ console.error(err); alert("Failed to generate Excel file."); }
  }
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={onBack} style={{padding:"8px 14px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#374151",cursor:"pointer"}}>← Back</button>
        <button onClick={onAllReports} style={{padding:"8px 14px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#374151",cursor:"pointer"}}>← All Reports</button>
        <span style={{fontSize:13,color:"#6b7280"}}>{title} · {count} {countLabel} · {dateLabel}</span>
      </div>
      <div style={{position:"relative"}}>
        <button onClick={()=>setMenuOpen(o=>!o)} disabled={downloading} style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:13,cursor:downloading?"wait":"pointer",display:"flex",alignItems:"center",gap:6}}>⬇️ {downloading?"Generating…":"Download"} {!downloading&&"▾"}</button>
        {menuOpen&&(
          <>
            <div style={{position:"fixed",inset:0,zIndex:19}} onClick={()=>setMenuOpen(false)}/>
            <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,boxShadow:"0 8px 20px rgba(0,0,0,0.15)",overflow:"hidden",zIndex:20,minWidth:170}}>
              <button onClick={handleDownloadPdf} style={{display:"block",width:"100%",textAlign:"left",padding:"10px 14px",border:"none",background:"#fff",fontSize:13,fontWeight:600,color:"#374151",cursor:"pointer"}}>📄 PDF (full report)</button>
              <button onClick={handleDownloadExcel} style={{display:"block",width:"100%",textAlign:"left",padding:"10px 14px",border:"none",borderTop:"1px solid #f3f4f6",background:"#fff",fontSize:13,fontWeight:600,color:"#374151",cursor:"pointer"}}>📊 Excel (table only)</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DemoActivityReport({demos,ownerOptions,onBack}){
  const [statusFilter,setStatusFilter]=useState("All Statuses");
  const [conductedByFilter,setConductedByFilter]=useState("All");
  const [dateFrom,setDateFrom]=useState(()=>{
    const d=new Date(todayISO());
    d.setDate(d.getDate()-7);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  });
  const [dateTo,setDateTo]=useState(todayISO());
  const [generated,setGenerated]=useState(false);

  const conductedByOptions=ownerOptions;

  const filteredDemos=useMemo(()=>{
    return demos.filter(d=>{
      if(statusFilter!=="All Statuses"&&d.status!==statusFilter) return false;
      if(conductedByFilter!=="All"&&d.conductedBy!==conductedByFilter) return false;
      if(dateFrom&&d.demoDate<dateFrom) return false;
      if(dateTo&&d.demoDate>dateTo) return false;
      return true;
    });
  },[demos,statusFilter,conductedByFilter,dateFrom,dateTo]);

  const totalActivities=useMemo(()=>filteredDemos.reduce((s,d)=>s+(d.activities||[]).length,0),[filteredDemos]);
  const convertedCount=filteredDemos.filter(d=>d.status==="Converted to Order").length;
  const followUpPendingCount=filteredDemos.filter(d=>d.status==="Follow-Up").length;

  const rows=useMemo(()=>{
    const out=[];
    filteredDemos.forEach(d=>{
      (d.activities||[]).forEach(a=>{
        out.push({customer:d.customer,demoNo:d.demoNo,product:d.product,date:a.date,outcome:a.outcome,next:a.next,note:a.note,by:a.by});
      });
      if(!(d.activities||[]).length){
        out.push({customer:d.customer,demoNo:d.demoNo,product:d.product,date:d.demoDate,outcome:null,next:d.nextFollowUp,note:"No activity logged yet.",by:d.conductedBy});
      }
    });
    return out;
  },[filteredDemos]);

  const dateLabel=todayDisplayDate();

  if(generated){
    const kpis=[
      {label:"Demos in Report",value:filteredDemos.length,accent:"#2563eb"},
      {label:"Total Activities",value:totalActivities,accent:"#1d4ed8"},
      {label:"Converted",value:convertedCount,accent:"#059669"},
      {label:"Follow-Up Pending",value:followUpPendingCount,accent:"#d97706"},
    ];
    return(
      <div>
        <ReportPrintToolbar title="Demo Activity Report" count={filteredDemos.length} countLabel="demos" dateLabel={dateLabel}
          onBack={()=>setGenerated(false)} onAllReports={onBack}/>
        <ReportDocument title="Demo Activity Report" subtitle="Demo Activity Summary — All Customers" dateLabel={dateLabel}
          count={filteredDemos.length} countLabel="Demos" kpis={kpis}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>{["#","Customer","Demo No","Product","Date","Outcome","Next Follow-up","Notes","By"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td style={{...tdStyle,color:"#9ca3af"}}>{i+1}</td>
                    <td style={{...tdStyle,fontWeight:700}}>{r.customer}</td>
                    <td style={{...tdStyle,color:"#111827",fontWeight:700}}>{r.demoNo}</td>
                    <td style={tdStyle}><ProductPill label={r.product}/></td>
                    <td style={{...tdStyle,color:"#6b7280"}}>{r.date}</td>
                    <td style={tdStyle}>{r.outcome?<OutcomeBadge label={r.outcome}/>:"—"}</td>
                    <td style={{...tdStyle,color:"#111827"}}>{r.next||"—"}</td>
                    <td style={{...tdStyle,color:"#374151"}}>{r.note}</td>
                    <td style={tdStyle}>{r.by}</td>
                  </tr>
                ))}
                {rows.length===0&&<tr><td colSpan={9} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:32}}>No demo activity recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </ReportDocument>
      </div>
    );
  }

  return(
    <ReportShell title="Demo Activity Report" icon="🎬" onBack={onBack}>
      <ReportFilterBar>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16,marginBottom:16}}>
          <div>
            <label style={labelStyle}>Demo Status</label>
            <select style={inputStyle} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option>All Statuses</option>
              {DEMO_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Conducted By</label>
            <select style={inputStyle} value={conductedByFilter} onChange={e=>setConductedByFilter(e.target.value)}>
              <option>All</option>
              {conductedByOptions.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date From</label>
            <input type="date" style={inputStyle} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
          </div>
          <div>
            <label style={labelStyle}>Date To</label>
            <input type="date" style={inputStyle} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
          </div>
        </div>
        <div style={{display:"flex",gap:16,marginBottom:16}}>
          <ReportKpi value={filteredDemos.length} label="Demos in Report" accent="#2563eb"/>
          <ReportKpi value={totalActivities} label="Total Activities" accent="#1d4ed8"/>
          <ReportKpi value={convertedCount} label="Converted" accent="#059669"/>
          <ReportKpi value={followUpPendingCount} label="Follow-Up Pending" accent="#d97706"/>
        </div>
        <button onClick={()=>setGenerated(true)} style={{padding:"11px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
          Generate Report → ({filteredDemos.length} demos)
        </button>
      </ReportFilterBar>
    </ReportShell>
  );
}

function PoReceiptReport({orders,onBack}){
  const [statusFilter,setStatusFilter]=useState("All Statuses");
  const [generated,setGenerated]=useState(false);

  const filteredOrders=useMemo(()=>{
    return orders.filter(o=>{
      if(statusFilter!=="All Statuses"&&o.orderStatus!==statusFilter) return false;
      return true;
    });
  },[orders,statusFilter]);

  const totalValue=useMemo(()=>filteredOrders.reduce((s,o)=>s+parseRupee(o.value),0),[filteredOrders]);
  const poUploadedCount=filteredOrders.filter(o=>o.poUploaded).length;
  const activeGoLiveCount=filteredOrders.filter(o=>o.orderStatus==="Active (Go-Live)").length;
  const dateLabel=todayDisplayDate();

  if(generated){
    const kpis=[
      {label:"Total Orders",value:filteredOrders.length,accent:"#2563eb"},
      {label:"Total Value",value:money(totalValue),accent:"#059669"},
      {label:"PO Received",value:poUploadedCount,accent:"#d97706"},
      {label:"Active Go-Live",value:activeGoLiveCount,accent:"#059669"},
    ];
    return(
      <div>
        <ReportPrintToolbar title="PO Receipt Report" count={filteredOrders.length} countLabel="orders" dateLabel={dateLabel}
          onBack={()=>setGenerated(false)} onAllReports={onBack}/>
        <ReportDocument title="PO Receipt Report" subtitle="Purchase Order Summary — All Customers" dateLabel={dateLabel}
          count={filteredOrders.length} countLabel="Orders" totalValueDisplay={money(totalValue)} kpis={kpis}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>{["#","Order No","Customer","Product","Order Date","Value","PO Number","Order Status","Payment Status","Assigned To","PO Document"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredOrders.map((o,i)=>(
                  <tr key={o.orderNo}>
                    <td style={{...tdStyle,color:"#9ca3af"}}>{i+1}</td>
                    <td style={{...tdStyle,color:"#111827",fontWeight:700}}>{o.orderNo}</td>
                    <td style={{...tdStyle,fontWeight:700}}>{o.customer}</td>
                    <td style={tdStyle}><ProductPill label={o.product}/></td>
                    <td style={{...tdStyle,color:"#6b7280"}}>{o.date}</td>
                    <td style={{...tdStyle,fontWeight:700}}>{o.value}</td>
                    <td style={tdStyle}>{o.poNo||"—"}</td>
                    <td style={tdStyle}><StatusPill label={o.orderStatus}/></td>
                    <td style={tdStyle}><StatusPill label={o.paymentStatus}/></td>
                    <td style={tdStyle}>{o.assignedTo}</td>
                    <td style={{...tdStyle,fontStyle:o.poDocumentUrl?"normal":"italic"}}>
                      {o.poDocumentUrl?(
                        <a href={fileUrl(o.poDocumentUrl)} target="_blank" rel="noopener noreferrer" style={{color:"#059669",fontWeight:600,textDecoration:"none"}}>✓ {o.poDocumentName||"View file"}</a>
                      ):(
                        <span style={{color:"#9ca3af"}}>Not uploaded</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length===0&&<tr><td colSpan={11} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:32}}>No orders match your filters.</td></tr>}
              </tbody>
              {filteredOrders.length>0&&(
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{...tdStyle,fontWeight:800,borderTop:"2px solid #e5e7eb"}}>Total ({filteredOrders.length} orders)</td>
                    <td style={{...tdStyle,fontWeight:800,color:"#059669",borderTop:"2px solid #e5e7eb"}}>{formatRupee(totalValue)}</td>
                    <td colSpan={5} style={{...tdStyle,borderTop:"2px solid #e5e7eb"}}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </ReportDocument>
      </div>
    );
  }

  return(
    <ReportShell title="PO Receipt Report" icon="📄" onBack={onBack}>
      <ReportFilterBar>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16,marginBottom:16}}>
          <div>
            <label style={labelStyle}>Order Status</label>
            <select style={inputStyle} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option>All Statuses</option>
              {[...ORDER_STATUSES,"Cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"flex",gap:16,marginBottom:16}}>
          <ReportKpi value={filteredOrders.length} label="Orders in Report" accent="#2563eb"/>
          <ReportKpi value={money(totalValue)} label="Total Value" accent="#059669"/>
          <ReportKpi value={poUploadedCount} label="With PO Uploaded" accent="#d97706"/>
          <ReportKpi value={activeGoLiveCount} label="Active Go-Live" accent="#059669"/>
        </div>
        <button onClick={()=>setGenerated(true)} style={{padding:"11px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
          Generate Report → ({filteredOrders.length} orders)
        </button>
      </ReportFilterBar>
    </ReportShell>
  );
}

function LeadStatusReport({leads,onBack}){
  const [statusFilter,setStatusFilter]=useState("All");
  const [ownerFilter,setOwnerFilter]=useState("All");
  const [generated,setGenerated]=useState(false);

  const ownerOptions=useMemo(()=>Array.from(new Set(leads.map(l=>l.owner))).sort(),[leads]);

  const filteredLeads=useMemo(()=>{
    return leads.filter(l=>{
      if(statusFilter!=="All"&&l.status!==statusFilter) return false;
      if(ownerFilter!=="All"&&l.owner!==ownerFilter) return false;
      return true;
    });
  },[leads,statusFilter,ownerFilter]);

  const followUpCount=filteredLeads.filter(l=>l.status==="Follow Up").length;
  const convertedCount=filteredLeads.filter(l=>l.status==="Converted").length;
  const notStartedCount=filteredLeads.filter(l=>l.status==="Not Started").length;
  const dateLabel=todayDisplayDate();

  if(generated){
    const kpis=[
      {label:"Leads in Report",value:filteredLeads.length,accent:"#2563eb"},
      {label:"Follow-Up",value:followUpCount,accent:"#d97706"},
      {label:"Converted",value:convertedCount,accent:"#059669"},
      {label:"Not Started",value:notStartedCount,accent:"#6b7280"},
    ];
    return(
      <div>
        <ReportPrintToolbar title="Lead Status Report" count={filteredLeads.length} countLabel="leads" dateLabel={dateLabel}
          onBack={()=>setGenerated(false)} onAllReports={onBack}/>
        <ReportDocument title="Lead Status Report" subtitle="Lead Pipeline Overview — All Owners" dateLabel={dateLabel}
          count={filteredLeads.length} countLabel="Leads" kpis={kpis}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>{["#","Lead No","Customer","Owner","Products","Status","Lead Source","Created","Last Modified"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredLeads.map((l,i)=>(
                  <tr key={l.leadNo}>
                    <td style={{...tdStyle,color:"#9ca3af"}}>{i+1}</td>
                    <td style={{...tdStyle,color:"#111827",fontWeight:700}}>Lead - {l.leadNo}</td>
                    <td style={{...tdStyle,fontWeight:700}}>{l.customer}</td>
                    <td style={tdStyle}>{l.owner}</td>
                    <td style={tdStyle}><ProductPill label={l.product}/></td>
                    <td style={tdStyle}><StatusPill label={l.status}/></td>
                    <td style={{...tdStyle,color:"#6b7280"}}>{l.leadSource||"—"}</td>
                    <td style={{...tdStyle,color:"#6b7280"}}>{l.createdDate}</td>
                    <td style={{...tdStyle,color:"#6b7280"}}>{l.lastModified}</td>
                  </tr>
                ))}
                {filteredLeads.length===0&&<tr><td colSpan={9} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:32}}>No leads match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </ReportDocument>
      </div>
    );
  }

  return(
    <ReportShell title="Lead Status Report" icon="🎯" onBack={onBack}>
      <ReportFilterBar>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16,marginBottom:16}}>
          <div>
            <label style={labelStyle}>Lead Status</label>
            <select style={inputStyle} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option>All</option>
              {LEAD_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Owner</label>
            <select style={inputStyle} value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}>
              <option>All</option>
              {ownerOptions.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"flex",gap:16,marginBottom:16}}>
          <ReportKpi value={filteredLeads.length} label="Leads in Report" accent="#2563eb"/>
          <ReportKpi value={followUpCount} label="Follow-Up" accent="#d97706"/>
          <ReportKpi value={convertedCount} label="Converted" accent="#059669"/>
          <ReportKpi value={notStartedCount} label="Not Started" accent="#6b7280"/>
        </div>
        <button onClick={()=>setGenerated(true)} style={{padding:"11px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
          Generate Report → ({filteredLeads.length} leads)
        </button>
      </ReportFilterBar>
    </ReportShell>
  );
}

function ReportsTab({leads,demos,orders,ownerOptions}){
  const [activeReport,setActiveReport]=useState(null);
  if(activeReport==="demoActivity") return <DemoActivityReport demos={demos} ownerOptions={ownerOptions} onBack={()=>setActiveReport(null)}/>;
  if(activeReport==="poReceipt") return <PoReceiptReport orders={orders} onBack={()=>setActiveReport(null)}/>;
  if(activeReport==="leadStatus") return <LeadStatusReport leads={leads} onBack={()=>setActiveReport(null)}/>;
  return <ReportsHome onOpen={setActiveReport}/>;
}

/* ---------------- Leads Tab ---------------- */
function LeadsTab({leads,onAddNew,onEdit,onDelete,onOpenProductMaster,onOpenLeadSourceMaster,onChangeOwner,ownerOptions}){
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [sortKey,setSortKey]=useState("leadNo");
  const [sortDir,setSortDir]=useState("asc");
  const [selected,setSelected]=useState([]);
  const [showChangeOwner,setShowChangeOwner]=useState(false);

  function handleOpenChangeOwner(){
    if(selected.length===0){ alert("Please select at least one lead first."); return; }
    setShowChangeOwner(true);
  }
  function handleApplyChangeOwner(newOwner){
    onChangeOwner(selected,newOwner);
    setShowChangeOwner(false);
    setSelected([]);
  }

  const counts={
    All:leads.length,
    "Not Started":leads.filter(l=>l.status==="Not Started").length,
    "Follow Up":leads.filter(l=>l.status==="Follow Up").length,
    "On Hold":leads.filter(l=>l.status==="On Hold").length,
    "Converted":leads.filter(l=>l.status==="Converted").length,
  };

  const filtered=useMemo(()=>{
    let rows=leads;
    if(statusFilter!=="All") rows=rows.filter(l=>l.status===statusFilter);
    const term=search.trim().toLowerCase();
    if(term) rows=rows.filter(l=>
      l.customer.toLowerCase().includes(term)||
      l.owner.toLowerCase().includes(term)||
      l.email.toLowerCase().includes(term)||
      l.leadNo.includes(term)
    );
    const sorted=[...rows].sort((a,b)=>{
      const av=a[sortKey]||"", bv=b[sortKey]||"";
      const cmp=String(av).localeCompare(String(bv));
      return sortDir==="asc"?cmp:-cmp;
    });
    return sorted;
  },[leads,statusFilter,search,sortKey,sortDir]);

  function toggleSort(key){
    if(sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  }
  function toggleSelect(leadNo){
    setSelected(prev=>prev.includes(leadNo)?prev.filter(x=>x!==leadNo):[...prev,leadNo]);
  }
  function toggleSelectAll(){
    setSelected(prev=>prev.length===filtered.length?[]:filtered.map(l=>l.leadNo));
  }

  const subTabs=["All","Not Started","Follow Up","On Hold","Converted"];
  const cols=[
    {key:"leadNo",header:"LEAD NUMBER"},
    {key:"owner",header:"OWNER"},
    {key:"customer",header:"CUSTOMER NAME"},
    {key:"email",header:"EMAIL ADDRESS"},
    {key:"phone",header:"PHONE"},
    {key:"createdDate",header:"CREATED DATE"},
    {key:"lastModified",header:"LAST MODIFIED"},
    {key:"status",header:"LEAD STATUS"},
  ];

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontSize:12,color:"#6b7280",fontWeight:600}}>Leads</div>
          <div style={{fontSize:18,fontWeight:800,color:"#111827"}}>{statusFilter}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onAddNew} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #2563eb",background:"#fff",color:"#2563eb",fontWeight:600,fontSize:13,cursor:"pointer"}}>New</button>
          <button onClick={handleOpenChangeOwner} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",color:"#111827",fontWeight:600,fontSize:13,cursor:"pointer"}}>Change Owner</button>
          <button onClick={onOpenProductMaster} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #a7f3d0",background:"#fff",color:"#059669",fontWeight:600,fontSize:13,cursor:"pointer"}}>⚙ Product Master</button>
          <button onClick={onOpenLeadSourceMaster} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #bfdbfe",background:"#fff",color:"#2563eb",fontWeight:600,fontSize:13,cursor:"pointer"}}>⚙ Lead Source Master</button>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inputStyle,width:200}}>
          {subTabs.map(t=><option key={t} value={t}>{t} ({counts[t]})</option>)}
        </select>
        <div style={{marginLeft:"auto",position:"relative",width:260}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search this list..." style={{...inputStyle,paddingLeft:34}}/>
        </div>
      </div>

      <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>{filtered.length} items · Sorted by {cols.find(c=>c.key===sortKey)?.header||"Lead Number"}</div>

      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{...thStyle,width:36}}><input type="checkbox" checked={selected.length>0&&selected.length===filtered.length} onChange={toggleSelectAll}/></th>
                {cols.map(c=>(
                  <th key={c.key} style={{...thStyle,cursor:"pointer"}} onClick={()=>toggleSort(c.key)}>
                    {c.header} {sortKey===c.key?(sortDir==="asc"?"↑":"↓"):"⇅"}
                  </th>
                ))}
                <th style={thStyle}>PRODUCTS</th>
                <th style={thStyle}/>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l,i)=>(
                <tr key={l.leadNo}>
                  <td style={tdStyle}><input type="checkbox" checked={selected.includes(l.leadNo)} onChange={()=>toggleSelect(l.leadNo)}/></td>
                  <td style={{...tdStyle,color:"#111827",fontWeight:700,whiteSpace:"nowrap"}}>Lead - {l.leadNo}</td>
                  <td style={{...tdStyle,color:"#111827",fontWeight:600}}>{l.owner}</td>
                  <td style={{...tdStyle,fontWeight:600}}>{l.customer}</td>
                  <td style={tdStyle}><a href={"mailto:"+l.email} style={{color:"#111827"}}>{l.email}</a></td>
                  <td style={{...tdStyle,whiteSpace:"nowrap"}}>{l.phone}</td>
                  <td style={{...tdStyle,whiteSpace:"nowrap"}}>{l.createdDate}</td>
                  <td style={{...tdStyle,whiteSpace:"nowrap"}}>{l.lastModified}</td>
                  <td style={tdStyle}><StatusPill label={l.status}/></td>
                  <td style={tdStyle}>{l.product}</td>
                  <td style={tdStyle}>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>onEdit(l)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:12,color:"#111827",cursor:"pointer"}}>Edit</button>
                      <button onClick={()=>onDelete(l)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #fecaca",background:"#fee2e2",fontWeight:600,fontSize:12,color:"#b91c1c",cursor:"pointer"}}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={11} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:32}}>No leads match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:"1px solid #e5e7eb",fontSize:13,color:"#6b7280"}}>
          <span>Showing 1–{filtered.length} of {filtered.length}</span>
          <span>Rows: 25</span>
        </div>
      </div>

      {showChangeOwner&&(
        <ChangeOwnerModal
          count={selected.length}
          ownerOptions={ownerOptions}
          onClose={()=>setShowChangeOwner(false)}
          onApply={handleApplyChangeOwner}
        />
      )}
    </div>
  );
}

function fromBackendLead(row){
  const potential=row.customer_potential||[];
  return{
    id:row.id,
    leadNo:row.lead_no,
    foundryName:row.foundry_name,
    customer:row.foundry_name,
    leadSource:row.lead_source_name||"",
    contactFirstName:row.contact_first_name||"",
    contactLastName:row.contact_last_name||"",
    country:row.country||"India",
    street:row.street||"",
    email:row.email||"",
    city:row.city||"",
    phone:row.phone||"",
    zip:row.zip||"",
    state:row.state||"",
    designation:row.designation||"",
    status:row.status,
    region:row.region||"",
    businessArea:row.business_area||"",
    customerPotential:potential,
    foundryInfo:row.foundry_info||[],
    sandTypes:row.sand_types||[],
    mixerMake:row.mixer_make||"",
    mixerType:row.mixer_type||"",
    mixerBatchSize:row.mixer_batch_size||"",
    hourlySandOutput:row.hourly_sand_output||"",
    painPoints:row.pain_points||"",
    product:potential.length?potential.join(" + "):"—",
    owner:row.owner||"",
    createdDate:row.created_date?String(row.created_date).slice(0,10):"",
    lastModified:row.last_modified?String(row.last_modified).slice(0,10):"",
  };
}
function toBackendLead(record,leadSources){
  const source=leadSources.find(s=>s.name===record.leadSource);
  return{
    lead_no:record.leadNo,
    foundry_name:record.foundryName,
    lead_source_id:source?source.id:null,
    contact_first_name:record.contactFirstName,
    contact_last_name:record.contactLastName,
    country:record.country,
    street:record.street,
    email:record.email,
    city:record.city,
    phone:record.phone,
    zip:record.zip,
    state:record.state,
    designation:record.designation,
    status:record.status,
    region:record.region,
    business_area:record.businessArea,
    customer_potential:record.customerPotential||[],
    foundry_info:record.foundryInfo||[],
    sand_types:record.sandTypes||[],
    mixer_make:record.mixerMake,
    mixer_type:record.mixerType,
    mixer_batch_size:record.mixerBatchSize,
    hourly_sand_output:record.hourlySandOutput,
    pain_points:record.painPoints,
    owner:record.owner,
    created_date:record.createdDate,
  };
}

function fromBackendOrder(row){
  return{
    id:row.id,
    orderNo:row.order_no,
    customer:row.customer,
    product:row.product,
    date:row.order_date?String(row.order_date).slice(0,10):"",
    value:formatRupee(row.value),
    paid:formatRupee(row.paid),
    outstanding:formatRupee(row.outstanding),
    status:row.payment_progress,
    poNo:row.po_no||"",
    poDocumentUrl:row.po_document_url||"",
    poDocumentName:row.po_document_name||"",
    poUploaded:!!row.po_document_url,
    orderStatus:row.order_status,
    paymentStatus:row.payment_status,
    assignedTo:row.assigned_to||"",
  };
}
function toBackendOrder(record){
  return{
    order_no:record.orderNo,
    customer:record.customer,
    product:record.product,
    order_date:record.date,
    value:parseRupee(record.value),
    paid:parseRupee(record.paid),
    outstanding:parseRupee(record.outstanding),
    payment_progress:record.status,
    po_no:record.poNo||null,
    po_document_url:record.poDocumentUrl||null,
    po_document_name:record.poDocumentName||null,
    order_status:record.orderStatus,
    payment_status:record.paymentStatus,
    assigned_to:record.assignedTo||null,
  };
}
// Orders reach the Implementation tab once they've progressed past order/PO drafting.
const IMPLEMENTATION_STAGE_STATUSES=["PO Received","Invoiced","Payment Done","Active (Go-Live)"];

function fromBackendRenewal(row){
  return{
    id:row.id,
    renewalNo:row.renewal_no,
    orderId:row.order_id,
    customer:row.customer,
    product:row.product,
    license:row.license||"",
    users:row.users||"",
    contractStart:row.contract_start?String(row.contract_start).slice(0,10):"",
    contractEnd:row.contract_end?String(row.contract_end).slice(0,10):"",
    value:formatRupee(row.value),
    assignedTo:row.assigned_to||"",
    notes:row.notes||"",
    renewalStatus:row.renewal_status,
    history:(row.history||[]).map(h=>({
      renewedOn:h.renewed_on?String(h.renewed_on).slice(0,10):"",
      contractStart:h.contract_start?String(h.contract_start).slice(0,10):"",
      contractEnd:h.contract_end?String(h.contract_end).slice(0,10):"",
      value:formatRupee(h.value),
      status:h.status,
      notes:h.notes||"",
    })),
  };
}
function toBackendRenewal(record){
  return{
    customer:record.customer,
    product:record.product,
    license:record.license||null,
    users:record.users?Number(record.users):null,
    contract_start:record.contractStart||null,
    contract_end:record.contractEnd||null,
    value:parseRupee(record.value),
    assigned_to:record.assignedTo||null,
    notes:record.notes||null,
    renewal_status:record.renewalStatus||"Active",
  };
}
function nextRenewalNo(renewals){
  const max=renewals.reduce((m,r)=>Math.max(m,parseInt(String(r.renewalNo).replace("REN-",""),10)||0),0);
  return "REN-"+String(max+1).padStart(3,"0");
}

function fromBackendDemo(row){
  return{
    id:row.id,
    demoNo:row.demo_no,
    customer:row.customer,
    contactPerson:row.contact_person||"",
    product:row.product,
    demoDate:row.demo_date?String(row.demo_date).slice(0,10):"",
    type:row.type||"",
    conductedBy:row.conducted_by||"",
    status:row.status,
    nextFollowUp:row.next_follow_up?String(row.next_follow_up).slice(0,10):null,
    createdDate:row.created_date?String(row.created_date).slice(0,10):"",
    activities:(row.activities||[]).map(a=>({
      date:a.activity_date?String(a.activity_date).slice(0,10):"",
      outcome:a.outcome,
      next:a.next_follow_up?String(a.next_follow_up).slice(0,10):null,
      note:a.note||"",
      by:a.logged_by||"",
    })),
  };
}
function toBackendDemo(record){
  return{
    demo_no:record.demoNo,
    customer:record.customer,
    contact_person:record.contactPerson||null,
    product:record.product,
    demo_date:record.demoDate,
    type:record.type||null,
    conducted_by:record.conductedBy||null,
    status:record.status,
    next_follow_up:record.nextFollowUp||null,
    created_date:record.createdDate||null,
  };
}

export default function MarketingHub(){
  const [tab,setTab]=useState("Dashboard");
  const [period,setPeriod]=useState("All Time");
  const [year,setYear]=useState("All Years");
  const [month,setMonth]=useState("All Months");
  const [activeDrill,setActiveDrill]=useState(null);
  const [leads,setLeads]=useState([]);
  const [showLeadModal,setShowLeadModal]=useState(false);
  const [editingLead,setEditingLead]=useState(null);
  const [products,setProducts]=useState([]);
  const [showProductMaster,setShowProductMaster]=useState(false);
  const [phasesProduct,setPhasesProduct]=useState(null);
  const [leadSources,setLeadSources]=useState([]);
  const [showLeadSourceMaster,setShowLeadSourceMaster]=useState(false);
  const [businessAreas,setBusinessAreas]=useState([]);
  const [showBusinessAreaMaster,setShowBusinessAreaMaster]=useState(false);
  const [foundryTypes,setFoundryTypes]=useState([]);
  const [showFoundryTypeMaster,setShowFoundryTypeMaster]=useState(false);
  const [sandTypeMaster,setSandTypeMaster]=useState([]);
  const [showSandTypeMaster,setShowSandTypeMaster]=useState(false);
  const [demoTypes,setDemoTypes]=useState([]);
  const [showDemoTypeMaster,setShowDemoTypeMaster]=useState(false);
  const [marketingOwners,setMarketingOwners]=useState([]);

  function apiError(err,fallback){
    console.error(err);
    alert(err?.response?.data?.error||fallback);
  }
  function loadLeads(){
    return marketingApi.getLeads().then(r=>setLeads(r.data.map(fromBackendLead)))
      .catch(err=>apiError(err,"Failed to load leads."));
  }
  function loadProducts(){
    return marketingApi.getProducts().then(r=>setProducts(r.data))
      .catch(err=>apiError(err,"Failed to load products."));
  }
  function loadLeadSources(){
    return marketingApi.getLeadSources().then(r=>setLeadSources(r.data))
      .catch(err=>apiError(err,"Failed to load lead sources."));
  }
  function loadBusinessAreas(){
    return marketingApi.getBusinessAreas().then(r=>setBusinessAreas(r.data))
      .catch(err=>apiError(err,"Failed to load business areas."));
  }
  function loadFoundryTypes(){
    return marketingApi.getFoundryTypes().then(r=>setFoundryTypes(r.data))
      .catch(err=>apiError(err,"Failed to load foundry types."));
  }
  function loadSandTypeMaster(){
    return marketingApi.getSandTypes().then(r=>setSandTypeMaster(r.data))
      .catch(err=>apiError(err,"Failed to load sand types."));
  }
  function loadDemoTypes(){
    return marketingApi.getDemoTypes().then(r=>setDemoTypes(r.data))
      .catch(err=>apiError(err,"Failed to load demo types."));
  }
  function loadMarketingOwners(){
    return employeesApi.getMarketingTeam().then(r=>setMarketingOwners(r.data.map(e=>e.name)))
      .catch(err=>apiError(err,"Failed to load marketing team."));
  }
  useEffect(()=>{
    loadLeads(); loadProducts(); loadLeadSources(); loadBusinessAreas();
    loadFoundryTypes(); loadSandTypeMaster(); loadDemoTypes(); loadMarketingOwners(); loadOrders(); loadRenewals(); loadDemos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function handleAddProduct(name){ marketingApi.createProduct(name).then(loadProducts).catch(err=>apiError(err,"Failed to add product.")); }
  function handleEditProduct(id,name){ marketingApi.updateProduct(id,name).then(loadProducts).catch(err=>apiError(err,"Failed to update product.")); }
  function handleDeleteProduct(id){ marketingApi.removeProduct(id).then(loadProducts).catch(err=>apiError(err,"Failed to delete product.")); }

  function handleAddLeadSource(name){ marketingApi.createLeadSource(name).then(loadLeadSources).catch(err=>apiError(err,"Failed to add lead source.")); }
  function handleEditLeadSource(id,name){ marketingApi.updateLeadSource(id,name).then(loadLeadSources).catch(err=>apiError(err,"Failed to update lead source.")); }
  function handleDeleteLeadSource(id){ marketingApi.removeLeadSource(id).then(loadLeadSources).catch(err=>apiError(err,"Failed to delete lead source.")); }

  function handleAddBusinessArea(name){ marketingApi.createBusinessArea(name).then(loadBusinessAreas).catch(err=>apiError(err,"Failed to add business area.")); }
  function handleEditBusinessArea(id,name){ marketingApi.updateBusinessArea(id,name).then(loadBusinessAreas).catch(err=>apiError(err,"Failed to update business area.")); }
  function handleDeleteBusinessArea(id){ marketingApi.removeBusinessArea(id).then(loadBusinessAreas).catch(err=>apiError(err,"Failed to delete business area.")); }

  function handleAddFoundryType(name){ marketingApi.createFoundryType(name).then(loadFoundryTypes).catch(err=>apiError(err,"Failed to add foundry type.")); }
  function handleEditFoundryType(id,name){ marketingApi.updateFoundryType(id,name).then(loadFoundryTypes).catch(err=>apiError(err,"Failed to update foundry type.")); }
  function handleDeleteFoundryType(id){ marketingApi.removeFoundryType(id).then(loadFoundryTypes).catch(err=>apiError(err,"Failed to delete foundry type.")); }

  function handleAddSandType(name){ marketingApi.createSandType(name).then(loadSandTypeMaster).catch(err=>apiError(err,"Failed to add sand type.")); }
  function handleEditSandType(id,name){ marketingApi.updateSandType(id,name).then(loadSandTypeMaster).catch(err=>apiError(err,"Failed to update sand type.")); }
  function handleDeleteSandType(id){ marketingApi.removeSandType(id).then(loadSandTypeMaster).catch(err=>apiError(err,"Failed to delete sand type.")); }

  function handleAddDemoType(name){ marketingApi.createDemoType(name).then(loadDemoTypes).catch(err=>apiError(err,"Failed to add demo type.")); }
  function handleEditDemoType(id,name){ marketingApi.updateDemoType(id,name).then(loadDemoTypes).catch(err=>apiError(err,"Failed to update demo type.")); }
  function handleDeleteDemoType(id){ marketingApi.removeDemoType(id).then(loadDemoTypes).catch(err=>apiError(err,"Failed to delete demo type.")); }

  const [demos,setDemos]=useState([]);
  const [showDemoModal,setShowDemoModal]=useState(false);
  const [editingDemo,setEditingDemo]=useState(null);
  const [trackingDemo,setTrackingDemo]=useState(null);
  function loadDemos(){
    return marketingApi.getDemos().then(r=>setDemos(r.data.map(fromBackendDemo)))
      .catch(err=>apiError(err,"Failed to load demos."));
  }

  function handleSaveFollowUp(entry){
    marketingApi.addDemoActivity(trackingDemo.id,{
      activity_date:entry.date,
      outcome:entry.outcome,
      next_follow_up:entry.next||null,
      note:entry.note,
      logged_by:entry.by,
    }).then(loadDemos)
      .catch(err=>apiError(err,"Failed to log follow-up."));
    setTrackingDemo(null);
  }

  function handleAddDemo(){ setEditingDemo(null); setShowDemoModal(true); }
  function handleEditDemo(demo){ setEditingDemo(demo); setShowDemoModal(true); }
  function handleDeleteDemo(demo){
    if(!window.confirm(`Delete ${demo.demoNo} (${demo.customer})? This cannot be undone.`)) return;
    marketingApi.removeDemo(demo.id).then(loadDemos).catch(err=>apiError(err,"Failed to delete demo."));
  }
  // A lead's status always tracks its customer's most recent demo — no demo means
  // "Not Started"; otherwise it mirrors that demo's status. Deriving this live from
  // current state (instead of pushing an update from inside the save handlers) avoids
  // races where a stale closure silently skips the update.
  useEffect(()=>{
    leads.forEach(lead=>{
      const customerDemos=demos.filter(d=>d.customer===lead.customer);
      const latestDemo=customerDemos.reduce((a,b)=>(!a||b.id>a.id?b:a),null);
      const desiredStatus=latestDemo?(DEMO_STATUS_TO_LEAD_STATUS[latestDemo.status]||lead.status):"Not Started";
      if(lead.status!==desiredStatus){
        marketingApi.updateLead(lead.id,toBackendLead({...lead,status:desiredStatus},leadSources))
          .then(loadLeads)
          .catch(err=>console.error("Failed to sync lead status for "+lead.customer,err));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[leads,demos]);

  function handleSaveDemo(data){
    const wasConverted=editingDemo?.status==="Converted to Order";
    const nowConverted=data.status==="Converted to Order";
    const payload=toBackendDemo(data);
    const req=editingDemo?marketingApi.updateDemo(editingDemo.id,payload):marketingApi.createDemo(payload);
    req.then(()=>loadDemos()).then(()=>{
      setEditingDemo(null);
      setShowDemoModal(false);

      // Converting a demo to an order opens a pre-filled New Order form for the team to complete,
      // rather than silently creating an order behind the scenes.
      if(nowConverted&&!wasConverted){
        const firstProduct=(data.product||"").split(" + ")[0];
        setPrefillOrder({
          customer:data.customer,
          product:firstProduct,
          date:todayISO(),
          assignedTo:data.conductedBy||"",
        });
        setEditingOrder(null);
        setShowOrderModal(true);
        setTab("Orders");
      }
    }).catch(err=>apiError(err,"Failed to save demo."));
  }

  const [orders,setOrders]=useState([]);
  function loadOrders(){
    return marketingApi.getOrders().then(r=>setOrders(r.data.map(fromBackendOrder)))
      .catch(err=>apiError(err,"Failed to load orders."));
  }

  // ── Implementation: phases come from the order's product template (Product Master → Phases);
  // per-order progress (steps done, status, dates, notes) is persisted separately and merged on top.
  const [productPhasesByName,setProductPhasesByName]=useState({});
  const [implProgress,setImplProgress]=useState({});

  useEffect(()=>{
    const names=Array.from(new Set(orders.map(o=>o.product))).filter(n=>n&&!(n in productPhasesByName));
    names.forEach(name=>{
      const product=products.find(p=>p.name===name);
      if(!product) return;
      marketingApi.getProductPhases(product.id).then(r=>{
        setProductPhasesByName(prev=>({...prev,[name]:r.data}));
      }).catch(err=>console.error("Failed to load phases for "+name,err));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[orders,products]);

  useEffect(()=>{
    orders.forEach(o=>{
      if(o.id in implProgress) return;
      marketingApi.getImplementationProgress(o.id).then(r=>{
        const byPhase={};
        r.data.forEach(row=>{
          byPhase[row.phase_number]={
            status:row.status,
            doneSteps:row.done_steps||[],
            startDate:row.start_date?String(row.start_date).slice(0,10):"",
            endDate:row.end_date?String(row.end_date).slice(0,10):"",
            responsiblePerson:row.responsible_person||"",
            notes:row.notes||"",
            documents:row.documents||[],
          };
        });
        setImplProgress(prev=>({...prev,[o.id]:byPhase}));
      }).catch(err=>console.error("Failed to load implementation progress for order "+o.id,err));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[orders]);

  const implRecords=useMemo(()=>{
    return orders
      .filter(o=>IMPLEMENTATION_STAGE_STATUSES.includes(o.orderStatus))
      .map(o=>{
        const template=productPhasesByName[o.product]||[];
        const progressForOrder=implProgress[o.id]||{};
        const phases=template.map(t=>{
          const prog=progressForOrder[t.phase_number]||{};
          const doneSteps=prog.doneSteps||[];
          const steps=(t.steps||[]).map((text,i)=>({text,done:!!doneSteps[i]}));
          const status=prog.status||(steps.length>0&&steps.every(s=>s.done)?"Completed":steps.some(s=>s.done)?"In Progress":"Not Started");
          return {
            phase:t.phase_number,title:t.title,weeks:t.weeks,desc:t.description,steps,status,
            startDate:prog.startDate||"",endDate:prog.endDate||"",
            responsiblePerson:prog.responsiblePerson||"",notes:prog.notes||"",documents:prog.documents||[],
          };
        });
        return {id:o.id,customer:o.customer,orderNo:o.orderNo,product:o.product,date:o.date,orderStatus:o.orderStatus,phases};
      });
  },[orders,productPhasesByName,implProgress]);

  function handleUpdateImplPhase(order,phaseNum,patch){
    setImplProgress(prev=>{
      const orderProg={...(prev[order.id]||{})};
      const merged={...(orderProg[phaseNum]||{})};
      if(patch.steps!==undefined) merged.doneSteps=patch.steps.map(s=>s.done);
      if(patch.status!==undefined) merged.status=patch.status;
      if(patch.startDate!==undefined) merged.startDate=patch.startDate;
      if(patch.endDate!==undefined) merged.endDate=patch.endDate;
      if(patch.responsiblePerson!==undefined) merged.responsiblePerson=patch.responsiblePerson;
      if(patch.notes!==undefined) merged.notes=patch.notes;
      if(patch.documents!==undefined) merged.documents=patch.documents;
      orderProg[phaseNum]=merged;

      marketingApi.saveImplementationProgress({
        order_id:order.id,
        phase_number:phaseNum,
        status:merged.status||"Not Started",
        done_steps:merged.doneSteps||[],
        start_date:merged.startDate||null,
        end_date:merged.endDate||null,
        responsible_person:merged.responsiblePerson||null,
        notes:merged.notes||null,
        documents:merged.documents||[],
      }).catch(err=>apiError(err,"Failed to save implementation progress."));

      return {...prev,[order.id]:orderProg};
    });
  }

  const [renewalsList,setRenewalsList]=useState([]);
  function loadRenewals(){
    return marketingApi.getRenewals().then(r=>setRenewalsList(r.data.map(fromBackendRenewal)))
      .catch(err=>apiError(err,"Failed to load renewals."));
  }
  function handleRenewContract(id,patch){
    marketingApi.renewRenewal(id,{
      new_contract_start:patch.contractStart,
      new_contract_end:patch.contractEnd,
      new_value:parseRupee(patch.value),
      renewal_status:patch.renewalStatus,
      notes:patch.notes,
    }).then(loadRenewals).catch(err=>apiError(err,"Failed to record renewal."));
  }
  const [editingRenewal,setEditingRenewal]=useState(null);
  const [dismissedRenewalOrderIds,setDismissedRenewalOrderIds]=useState(()=>new Set());
  function handleEditRenewal(renewal){ setEditingRenewal(renewal); }
  function handleCloseRenewalEdit(){
    // A cancelled auto-prompt (no id yet = never saved) shouldn't pop right back up this session.
    if(!editingRenewal?.id&&editingRenewal?.orderId!=null){
      setDismissedRenewalOrderIds(prev=>new Set(prev).add(editingRenewal.orderId));
    }
    setEditingRenewal(null);
  }
  function handleSaveRenewalEdit(data){
    const payload=toBackendRenewal(data);
    const req=editingRenewal?.id
      ?marketingApi.updateRenewal(editingRenewal.id,payload)
      :marketingApi.createRenewal({...payload,renewal_no:nextRenewalNo(renewalsList),order_id:editingRenewal?.orderId??null});
    req.then(()=>{ setEditingRenewal(null); loadRenewals(); })
      .catch(err=>apiError(err,"Failed to save renewal."));
  }

  // Once every phase of an implementation is complete, open a pre-filled Renewal form for the
  // team to complete — same pattern as converting a demo into an order.
  useEffect(()=>{
    if(editingRenewal) return;
    const rec=implRecords.find(r=>
      implOverallPct(r)===100&&
      !renewalsList.some(rw=>rw.orderId===r.id)&&
      !dismissedRenewalOrderIds.has(r.id)
    );
    if(!rec) return;
    const order=orders.find(o=>o.id===rec.id);
    const start=todayISO();
    const endDate=new Date(start);
    endDate.setFullYear(endDate.getFullYear()+1);
    const end=endDate.getFullYear()+"-"+String(endDate.getMonth()+1).padStart(2,"0")+"-"+String(endDate.getDate()).padStart(2,"0");
    setEditingRenewal({
      orderId:rec.id,
      customer:rec.customer,
      product:rec.product,
      license:"",
      users:"",
      contractStart:start,
      contractEnd:end,
      value:order?order.value:"₹0",
      assignedTo:order?.assignedTo||"",
      notes:"",
      renewalStatus:"Active",
    });
    setTab("Renewals");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[implRecords,renewalsList,editingRenewal,dismissedRenewalOrderIds]);
  const [showOrderModal,setShowOrderModal]=useState(false);
  const [editingOrder,setEditingOrder]=useState(null);
  const [prefillOrder,setPrefillOrder]=useState(null);
  function handleAddOrder(){ setEditingOrder(null); setPrefillOrder(null); setShowOrderModal(true); }
  function handleEditOrder(order){ setEditingOrder(order); setPrefillOrder(null); setShowOrderModal(true); }
  function handleDeleteOrder(order){
    if(!window.confirm(`Delete ${order.orderNo} (${order.customer})? This cannot be undone.`)) return;
    marketingApi.removeOrder(order.id).then(loadOrders).catch(err=>apiError(err,"Failed to delete order."));
  }
  function handleSaveOrder(data){
    const payload=toBackendOrder(data);
    const req=editingOrder?marketingApi.updateOrder(editingOrder.id,payload):marketingApi.createOrder(payload);
    req.then(()=>{ setEditingOrder(null); setPrefillOrder(null); setShowOrderModal(false); loadOrders(); })
      .catch(err=>apiError(err,"Failed to save order."));
  }
  function handleSetOrderStatus(order,stage){
    marketingApi.updateOrder(order.id,toBackendOrder({...order,orderStatus:stage}))
      .then(loadOrders).catch(err=>apiError(err,"Failed to update order status."));
  }

  function toggleDrill(key){ setActiveDrill(prev=>prev===key?null:key); }
  function pickQuick(p){ setPeriod(p); if(p==="All Time"){ setYear("All Years"); setMonth("All Months"); } }
  function pickYear(y){ setYear(y); setPeriod("Custom"); }
  function pickMonth(m){ setMonth(m); setPeriod("Custom"); }
  function clearFilter(){ setPeriod("All Time"); setYear("All Years"); setMonth("All Months"); }

  function handleAddLead(){ setEditingLead(null); setShowLeadModal(true); }
  function handleEditLead(lead){ setEditingLead(lead); setShowLeadModal(true); }
  function handleDeleteLead(lead){
    if(!window.confirm(`Delete Lead - ${lead.leadNo} (${lead.customer})? This cannot be undone.`)) return;
    marketingApi.removeLead(lead.id).then(loadLeads).catch(err=>apiError(err,"Failed to delete lead."));
  }
  function handleSaveLead(data){
    const payload=toBackendLead(data,leadSources);
    const req=editingLead
      ? marketingApi.updateLead(editingLead.id,payload)
      : marketingApi.createLead(payload);
    req.then(loadLeads).catch(err=>apiError(err,"Failed to save lead."));
    setEditingLead(null);
  }
  function handleChangeLeadOwner(leadNos,newOwner){
    const ids=leads.filter(l=>leadNos.includes(l.leadNo)).map(l=>l.id);
    marketingApi.bulkChangeOwner(ids,newOwner).then(loadLeads).catch(err=>apiError(err,"Failed to change owner."));
  }

  const win=useMemo(()=>getPeriodWindow(period,year,month),[period,year,month]);
  const productLeadCounts=useMemo(()=>{
    const counts={};
    products.forEach(p=>{ counts[p.name]=leads.filter(l=>(l.customerPotential||[]).includes(p.name)).length; });
    return counts;
  },[products,leads]);
  const leadSourceCounts=useMemo(()=>{
    const counts={};
    leadSources.forEach(s=>{ counts[s.name]=leads.filter(l=>l.leadSource===s.name).length; });
    return counts;
  },[leadSources,leads]);
  const businessAreaCounts=useMemo(()=>{
    const counts={};
    businessAreas.forEach(b=>{ counts[b.name]=leads.filter(l=>l.businessArea===b.name).length; });
    return counts;
  },[businessAreas,leads]);
  const foundryTypeCounts=useMemo(()=>{
    const counts={};
    foundryTypes.forEach(f=>{ counts[f.name]=leads.filter(l=>(l.foundryInfo||[]).includes(f.name)).length; });
    return counts;
  },[foundryTypes,leads]);
  const sandTypeCounts=useMemo(()=>{
    const counts={};
    sandTypeMaster.forEach(s=>{ counts[s.name]=leads.filter(l=>(l.sandTypes||[]).includes(s.name)).length; });
    return counts;
  },[sandTypeMaster,leads]);
  const demoTypeCounts=useMemo(()=>{
    const counts={};
    demoTypes.forEach(t=>{ counts[t.name]=demos.filter(d=>d.type===t.name).length; });
    return counts;
  },[demoTypes,demos]);

  const filteredLeads=useMemo(()=>leads.filter(l=>inWindow(l.lastModified,win)),[leads,win]);
  const followUpLeadsFiltered=useMemo(()=>filteredLeads.filter(l=>l.status==="Follow Up"),[filteredLeads]);
  const filteredDemos=useMemo(()=>demos.filter(d=>inWindow(d.demoDate,win)),[demos,win]);
  const demoFollowUps=useMemo(()=>{
    return demos
      .filter(d=>d.nextFollowUp && d.nextFollowUp<todayISO())
      .map(d=>{
        const lastActivity=(d.activities||[])[0];
        const days=Math.round((new Date(todayISO())-new Date(d.nextFollowUp))/86400000);
        return {
          customer:d.customer,
          ref:d.demoNo+" · "+d.conductedBy,
          note:lastActivity?lastActivity.note:"No notes yet.",
          overdue:"Overdue "+days+"d",
          outcome:lastActivity?lastActivity.outcome:d.status,
        };
      });
  },[demos]);
  const recentDemos=useMemo(()=>{
    const rows=[];
    demos.forEach(d=>{
      (d.activities||[]).forEach(a=>{
        rows.push({customer:d.customer,demoNo:d.demoNo,outcome:a.outcome,date:a.date,remarks:a.note,by:a.by});
      });
      if(!(d.activities||[]).length){
        rows.push({customer:d.customer,demoNo:d.demoNo,outcome:d.status,date:d.demoDate,remarks:"No activity logged yet.",by:d.conductedBy});
      }
    });
    return rows.filter(r=>r.date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  },[demos]);
  const filteredOrders=useMemo(()=>orders.filter(o=>inWindow(o.date,win)),[orders,win]);
  const implGoLiveAll=useMemo(()=>implRecords
    .filter(rec=>rec.orderStatus==="Active (Go-Live)")
    .map(rec=>({...rec,progress:implOverallPct(rec),phase:currentPhaseOf(rec),goLiveDate:rec.date})),
  [implRecords]);
  const filteredGoLive=useMemo(()=>implGoLiveAll.filter(im=>inWindow(im.goLiveDate,win)),[implGoLiveAll,win]);

  const totalOrderValue=useMemo(()=>filteredOrders.reduce((s,o)=>s+parseRupee(o.value),0),[filteredOrders]);
  const paymentReceived=useMemo(()=>filteredOrders.reduce((s,o)=>s+parseRupee(o.paid),0),[filteredOrders]);
  const outstandingPayment=useMemo(()=>filteredOrders.reduce((s,o)=>s+parseRupee(o.outstanding),0),[filteredOrders]);
  const outstandingCount=useMemo(()=>filteredOrders.filter(o=>parseRupee(o.outstanding)>0).length,[filteredOrders]);

  const renewalsWithComputedStatus=useMemo(()=>renewalsList.map(r=>({...r,computedStatus:renewalStatusFor(r),daysLeftNum:daysLeftFrom(r.contractEnd)})),[renewalsList]);
  const renewalsOverdue=useMemo(()=>renewalsWithComputedStatus.filter(r=>r.computedStatus==="Overdue"),[renewalsWithComputedStatus]);
  const renewalsDueSoon=useMemo(()=>renewalsWithComputedStatus.filter(r=>r.computedStatus==="Due Soon"),[renewalsWithComputedStatus]);
  const renewalsDueList=useMemo(()=>[...renewalsOverdue,...renewalsDueSoon],[renewalsOverdue,renewalsDueSoon]);

  const followUpDemosFiltered=useMemo(()=>filteredDemos.filter(d=>d.status==="Follow-Up"),[filteredDemos]);
  const pipeline=useMemo(()=>{
    const stages=[
      {label:"Leads",value:filteredLeads.length,color:"#2563eb"},
      {label:"Demos Conducted",value:filteredDemos.length,color:"#2563eb"},
      {label:"Follow-Up",value:followUpDemosFiltered.length,color:"#2563eb"},
      {label:"Orders",value:filteredOrders.length,color:"#2563eb"},
      {label:"Active Go-Live",value:filteredGoLive.length,color:"#2563eb"},
    ];
    const max=Math.max(1,...stages.map(s=>s.value));
    return stages.map(s=>({...s,pct:Math.round((s.value/max)*100)}));
  },[filteredLeads,filteredDemos,followUpDemosFiltered,filteredOrders,filteredGoLive]);
  const leadToOrderConversion=useMemo(()=>filteredLeads.length?Math.round((filteredOrders.length/filteredLeads.length)*100):0,[filteredLeads,filteredOrders]);

  const kpiRow1=[
    {label:"Total Leads",value:String(filteredLeads.length),sub:win.label,accent:"#2563eb",icon:"🎯",drillKey:"totalLeads"},
    {label:"Follow-up Leads",value:String(followUpLeadsFiltered.length),sub:"Pending action",accent:"#d97706",icon:"📞",drillKey:"followUpLeads"},
    {label:"Demos Conducted",value:String(filteredDemos.length),sub:win.label,accent:"#2563eb",icon:"🖥️",drillKey:"demosConducted"},
    {label:"Overdue Follow-ups",value:String(demoFollowUps.length),sub:"Need action now",accent:"#dc2626",icon:"⚠️",drillKey:"overdueFollowUps"},
  ];
  const kpiRow2=[
    {label:"Active Go-Live",value:String(filteredGoLive.length),sub:"Implementations",accent:"#059669",icon:"🚀",drillKey:"activeGoLive"},
    {label:"Total Order Value",value:money(totalOrderValue),sub:win.label,accent:"#059669",icon:"💰",drillKey:"orders"},
    {label:"Payment Received",value:money(paymentReceived),sub:win.label,accent:"#059669",icon:"✅",drillKey:"orders"},
    {label:"Outstanding Payment",value:money(outstandingPayment),sub:outstandingCount+" orders pending",accent:"#dc2626",icon:"🧾",drillKey:"orders"},
    {label:"Renewals Due",value:String(renewalsDueList.length),sub:renewalsOverdue.length+" overdue · "+renewalsDueSoon.length+" due soon",accent:renewalsOverdue.length>0?"#dc2626":"#6b7280",icon:"🔄",drillKey:"renewalsDue"},
  ];

  const drillConfigs={
    totalLeads:{title:"All Leads",icon:"🎯",data:filteredLeads,columns:[
      {header:"Lead No",cell:l=>"Lead - "+l.leadNo,style:{color:"#111827",fontWeight:700}},
      {header:"Customer",cell:l=>l.customer,style:{fontWeight:600}},
      {header:"Owner",cell:l=>l.owner},
      {header:"Status",cell:l=><StatusPill label={l.status}/>},
      {header:"Products",cell:l=><ProductPill label={l.product}/>},
      {header:"Last Modified",cell:l=>l.lastModified,style:{color:"#6b7280"}},
    ]},
    followUpLeads:{title:"Follow-up Leads",icon:"📞",data:followUpLeadsFiltered,columns:[
      {header:"Lead No",cell:l=>"Lead - "+l.leadNo,style:{color:"#111827",fontWeight:700}},
      {header:"Customer",cell:l=>l.customer,style:{fontWeight:600}},
      {header:"Owner",cell:l=>l.owner},
      {header:"Products",cell:l=><ProductPill label={l.product}/>},
      {header:"Last Modified",cell:l=>l.lastModified,style:{color:"#6b7280"}},
    ]},
    demosConducted:{title:"All Demos",icon:"🖥️",data:filteredDemos,columns:[
      {header:"Customer",cell:d=>d.customer,style:{fontWeight:600}},
      {header:"Demo No",cell:d=>d.demoNo,style:{color:"#111827",fontWeight:700}},
      {header:"Outcome",cell:d=><StatusPill label={d.outcome}/>},
      {header:"Date",cell:d=>d.date,style:{color:"#6b7280"}},
      {header:"By",cell:d=>d.by},
    ]},
    overdueFollowUps:{title:"Overdue Follow-ups",icon:"⚠️",data:demoFollowUps,columns:[
      {header:"Customer",cell:d=>d.customer,style:{fontWeight:600}},
      {header:"Reference",cell:d=>d.ref,style:{color:"#6b7280"}},
      {header:"Overdue",cell:d=>d.overdue,style:{color:"#dc2626",fontWeight:700}},
      {header:"Note",cell:d=>d.note,style:{color:"#4b5563"}},
    ]},
    activeGoLive:{title:"Active Go-Live",icon:"🚀",data:filteredGoLive,columns:[
      {header:"Customer",cell:im=>im.customer,style:{fontWeight:600}},
      {header:"Product",cell:im=><ProductPill label={im.product}/>},
      {header:"Progress",cell:im=>im.progress+"%",style:{fontWeight:700}},
      {header:"Phase",cell:im=>im.phase+" of "+(im.phases.length-1)},
      {header:"Go-Live Date",cell:im=>im.goLiveDate,style:{color:"#6b7280"}},
    ]},
    orders:{title:"Orders",icon:"💰",data:filteredOrders,columns:[
      {header:"Order No",cell:o=>o.orderNo,style:{color:"#111827",fontWeight:700}},
      {header:"Customer",cell:o=>o.customer,style:{fontWeight:600}},
      {header:"Product",cell:o=><ProductPill label={o.product}/>},
      {header:"Value",cell:o=>o.value,style:{fontWeight:700}},
      {header:"Paid",cell:o=>o.paid,style:{color:"#059669"}},
      {header:"Outstanding",cell:o=>o.outstanding,style:{color:"#dc2626"}},
      {header:"Status",cell:o=><StatusPill label={o.status}/>},
      {header:"Date",cell:o=>o.date,style:{color:"#6b7280"}},
    ]},
    renewalsDue:{title:"Renewals Due",icon:"🔄",data:renewalsDueList,columns:[
      {header:"Customer",cell:r=>r.customer,style:{fontWeight:600}},
      {header:"Product",cell:r=><ProductPill label={r.product}/>},
      {header:"Contract End",cell:r=>r.contractEnd,style:{color:"#6b7280"}},
      {header:"Days Left",cell:r=>r.daysLeftNum<0?Math.abs(r.daysLeftNum)+"d overdue":r.daysLeftNum+"d left",style:{fontWeight:700}},
    ]},
  };

  return(
    <div style={{fontFamily:"system-ui, -apple-system, sans-serif"}}>
      <div style={{display:"flex",gap:0,marginBottom:16,background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:3,boxShadow:"0 1px 3px rgba(0,0,0,.05)",flexWrap:"wrap"}}>
        {tabs.map(t=>{
          const active=tab===t;
          return(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"9px 18px",borderRadius:7,border:"none",background:active?"#2563eb":"transparent",color:active?"#fff":"#6b7280",fontSize:13,fontWeight:active?700:500,cursor:"pointer",whiteSpace:"nowrap"}}>
              {t}
            </button>
          );
        })}
      </div>

      {tab==="Dashboard"&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:600,color:"#374151",display:"flex",alignItems:"center",gap:6}}>📅 Period:</span>
            {["All Time","Today","This Week","This Month","Last Month","This Year"].map(p=>(
              <button key={p} onClick={()=>pickQuick(p)} style={{padding:"7px 14px",borderRadius:7,border:"1px solid "+(period===p?"#2563eb":"#d1d5db"),background:period===p?"#2563eb":"#fff",color:period===p?"#fff":"#374151",fontSize:12,fontWeight:600,cursor:"pointer"}}>{p}</button>
            ))}
            <select value={year} onChange={e=>pickYear(e.target.value)} style={{...inputStyle,width:120,padding:"7px 10px"}}>
              <option>All Years</option>
              {YEARS.map(y=><option key={y}>{y}</option>)}
            </select>
            <select value={month} onChange={e=>pickMonth(e.target.value)} style={{...inputStyle,width:130,padding:"7px 10px"}}>
              <option>All Months</option>
              {MONTHS.map(m=><option key={m}>{m}</option>)}
            </select>
            {period!=="All Time"&&(
              <button onClick={clearFilter} style={{padding:"7px 14px",borderRadius:7,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",fontSize:12,fontWeight:600,cursor:"pointer"}}>✕ Clear</button>
            )}
            <span style={{marginLeft:"auto",fontSize:12,fontWeight:600,color:"#2563eb",background:"#eff6ff",padding:"6px 12px",borderRadius:20}}>Showing: {win.label}</span>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
            {kpiRow1.map(k=><KpiCard key={k.label} {...k} activeDrill={activeDrill} onToggle={toggleDrill}/>)}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:20}}>
            {kpiRow2.map(k=><KpiCard key={k.label} {...k} activeDrill={activeDrill} onToggle={toggleDrill}/>)}
          </div>

          {activeDrill&&drillConfigs[activeDrill]&&(
            <DrillPanel {...drillConfigs[activeDrill]} periodLabel={win.label} onClose={()=>setActiveDrill(null)}/>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16,marginBottom:20}}>
            <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:"1px solid #f0f2f5"}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>Demo Follow-up Action Centre</div>
                {demoFollowUps.length>0&&<span style={{fontSize:11,fontWeight:700,color:"#dc2626"}}>{demoFollowUps.length} OVERDUE</span>}
              </div>
              <div style={{padding:14}}>
                {demoFollowUps.map((d,i)=>(
                  <div key={i} style={{background:"#fef2f2",border:"1px solid #fecaca",borderLeft:"3px solid #dc2626",borderRadius:8,padding:"12px 14px",display:"flex",justifyContent:"space-between",gap:12}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{d.customer} <span style={{fontWeight:500,color:"#9ca3af",fontSize:12}}>{d.ref}</span></div>
                      <div style={{fontSize:12,color:"#4b5563",marginTop:4}}>{d.note}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>{d.overdue}</div>
                      <div style={{fontSize:11,fontWeight:600,color:"#059669",marginTop:4}}>✅ {d.outcome}</div>
                    </div>
                  </div>
                ))}
                {demoFollowUps.length===0&&<div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:20}}>No pending follow-ups.</div>}
              </div>
            </div>

            <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>Sales Pipeline</div>
              <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
                {pipeline.map(p=>(
                  <div key={p.label}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                      <span style={{color:"#374151",fontWeight:500}}>{p.label}</span>
                      <span style={{fontWeight:700,color:"#111827"}}>{p.value}</span>
                    </div>
                    <div style={{height:6,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}>
                      <div style={{height:"100%",width:p.pct+"%",background:p.color,borderRadius:4}}/>
                    </div>
                  </div>
                ))}
                <div style={{background:"#f8f9fb",borderRadius:8,padding:"12px 14px",marginTop:4}}>
                  <div style={{fontSize:12,color:"#6b7280"}}>Lead → Order Conversion</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#2563eb"}}>{leadToOrderConversion}%</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>Leads – Follow-Up Required ({followUpLeadsFiltered.length})</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Lead No","Customer","Owner","Product","Last Modified"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {followUpLeadsFiltered.map(l=>(
                      <tr key={l.leadNo}>
                        <td style={{...tdStyle,color:"#111827",fontWeight:700}}>Lead - {l.leadNo}</td>
                        <td style={{...tdStyle,fontWeight:600}}>{l.customer}</td>
                        <td style={tdStyle}>{l.owner}</td>
                        <td style={tdStyle}><ProductPill label={l.product}/></td>
                        <td style={{...tdStyle,color:"#6b7280"}}>{l.lastModified}</td>
                      </tr>
                    ))}
                    {followUpLeadsFiltered.length===0&&<tr><td colSpan={5} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:20}}>No follow-ups pending.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>Implementation Status ({implGoLiveAll.length} active)</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Customer","Product","Progress","Phases"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {implGoLiveAll.map(im=>(
                      <tr key={im.orderNo}>
                        <td style={{...tdStyle,fontWeight:600}}>{im.customer}</td>
                        <td style={tdStyle}><ProductPill label={im.product}/></td>
                        <td style={tdStyle}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:60,height:6,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}>
                              <div style={{height:"100%",width:im.progress+"%",background:"#2563eb",borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>{im.progress}%</span>
                          </div>
                        </td>
                        <td style={tdStyle}><PhaseStepper phase={im.phase} totalPhases={im.phases.length}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{...cardStyle,padding:0,overflow:"hidden",marginBottom:20}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>Contract Renewals Status</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Customer","Product","Contract End","Days Left","Renewal Status","Value","Last Renewed"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {renewalsList.map(r=>{
                    const daysNum=daysLeftFrom(r.contractEnd);
                    const daysLeft=daysNum<0?Math.abs(daysNum)+"d overdue":daysNum+"d left";
                    return(
                      <tr key={r.id}>
                        <td style={{...tdStyle,fontWeight:600}}>{r.customer}</td>
                        <td style={tdStyle}><ProductPill label={r.product}/></td>
                        <td style={{...tdStyle,color:"#6b7280"}}>{r.contractEnd}</td>
                        <td style={tdStyle}><span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:"#ecfdf5",color:"#059669"}}>{daysLeft}</span></td>
                        <td style={tdStyle}><StatusPill label={renewalStatusFor(r)}/></td>
                        <td style={{...tdStyle,fontWeight:700,color:"#059669"}}>{r.value}</td>
                        <td style={{...tdStyle,color:"#6b7280"}}>{(r.history&&r.history[0])?r.history[0].renewedOn:"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>Recent Demo Activity</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Customer","Demo No","Outcome","Date","Remarks","By"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {recentDemos.map((d,i)=>(
                    <tr key={i}>
                      <td style={{...tdStyle,fontWeight:600}}>{d.customer}</td>
                      <td style={{...tdStyle,color:"#111827",fontWeight:700}}>{d.demoNo}</td>
                      <td style={tdStyle}><StatusPill label={d.outcome}/></td>
                      <td style={{...tdStyle,color:"#6b7280"}}>{d.date}</td>
                      <td style={{...tdStyle,color:"#4b5563",maxWidth:280}}>{d.remarks}</td>
                      <td style={tdStyle}>{d.by}</td>
                    </tr>
                  ))}
                  {recentDemos.length===0&&<tr><td colSpan={6} style={{...tdStyle,textAlign:"center",color:"#9ca3af",padding:20}}>No recent demo activity.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab==="Leads"&&(
        <LeadsTab leads={leads} onAddNew={handleAddLead} onEdit={handleEditLead} onDelete={handleDeleteLead}
          onOpenProductMaster={()=>setShowProductMaster(true)}
          onOpenLeadSourceMaster={()=>setShowLeadSourceMaster(true)}
          onChangeOwner={handleChangeLeadOwner}
          ownerOptions={marketingOwners}/>
      )}

      {tab==="Demos"&&(
        <DemosTab demos={demos} onAddNew={handleAddDemo} onEdit={handleEditDemo} onDelete={handleDeleteDemo}
          onTrack={(demo)=>setTrackingDemo(demo)}/>
      )}

      {tab==="Orders"&&(
        <OrdersTab orders={orders} onAddNew={handleAddOrder} onEdit={handleEditOrder} onDelete={handleDeleteOrder} onSetStatus={handleSetOrderStatus}/>
      )}

      {tab==="Implementation"&&(
        <ImplementationTab records={implRecords} onUpdatePhase={handleUpdateImplPhase}
          productOptions={products.map(p=>p.name)}
          onAddPhases={(productName)=>{
            const p=products.find(pp=>pp.name===productName);
            if(p) setPhasesProduct(p);
          }}/>
      )}

      {tab==="Renewals"&&(
        <RenewalsTab renewals={renewalsList} onRenew={handleRenewContract} onEdit={handleEditRenewal}/>
      )}

      {editingRenewal&&(
        <EditRenewalModal renewal={editingRenewal} onClose={handleCloseRenewalEdit} onSave={handleSaveRenewalEdit}/>
      )}

      {tab==="Reports"&&(
        <ReportsTab leads={leads} demos={demos} orders={orders} ownerOptions={marketingOwners}/>
      )}

      {showLeadModal&&(
        <LeadModal
          onClose={()=>{setShowLeadModal(false);setEditingLead(null);}}
          onSave={handleSaveLead}
          nextLeadNumber={nextLeadNo(leads)}
          initial={editingLead}
          productOptions={products.map(p=>p.name)}
          leadSourceOptions={leadSources.map(s=>s.name)}
          businessAreaOptions={businessAreas.map(b=>b.name)}
          foundryInfoOptions={foundryTypes.map(f=>f.name)}
          sandTypeOptions={sandTypeMaster.map(s=>s.name)}
          ownerOptions={marketingOwners}
          onOpenBusinessAreaMaster={()=>setShowBusinessAreaMaster(true)}
          onOpenFoundryTypeMaster={()=>setShowFoundryTypeMaster(true)}
          onOpenSandTypeMaster={()=>setShowSandTypeMaster(true)}
          existingCustomers={leads.filter(l=>l.id!==editingLead?.id).map(l=>l.customer)}
        />
      )}

      {showProductMaster&&(
        <MasterListModal
          title="Product Master" itemNoun="product" icon="📦" accent="#2563eb" placeholder="e.g. IndustiQ"
          items={products}
          leadCounts={productLeadCounts}
          onClose={()=>setShowProductMaster(false)}
          onAdd={handleAddProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onManagePhases={(p)=>setPhasesProduct(p)}
        />
      )}

      {phasesProduct&&(
        <ProductPhasesModal product={phasesProduct} onClose={()=>setPhasesProduct(null)}/>
      )}

      {showLeadSourceMaster&&(
        <MasterListModal
          title="Lead Source Master" itemNoun="lead source" icon="🚀" accent="#2563eb" placeholder="e.g. Cold Email"
          items={leadSources}
          leadCounts={leadSourceCounts}
          onClose={()=>setShowLeadSourceMaster(false)}
          onAdd={handleAddLeadSource}
          onEdit={handleEditLeadSource}
          onDelete={handleDeleteLeadSource}
        />
      )}

      {showBusinessAreaMaster&&(
        <MasterListModal
          title="Business Area Master" itemNoun="business area" icon="🏭" accent="#b45309" placeholder="e.g. Foundry Equipment"
          items={businessAreas}
          leadCounts={businessAreaCounts}
          onClose={()=>setShowBusinessAreaMaster(false)}
          onAdd={handleAddBusinessArea}
          onEdit={handleEditBusinessArea}
          onDelete={handleDeleteBusinessArea}
        />
      )}

      {showFoundryTypeMaster&&(
        <MasterListModal
          title="Foundry Information Master" itemNoun="foundry type" icon="🏗️" accent="#374151" placeholder="e.g. Ductile Iron"
          items={foundryTypes}
          leadCounts={foundryTypeCounts}
          onClose={()=>setShowFoundryTypeMaster(false)}
          onAdd={handleAddFoundryType}
          onEdit={handleEditFoundryType}
          onDelete={handleDeleteFoundryType}
        />
      )}

      {showSandTypeMaster&&(
        <MasterListModal
          title="Sand System Master" itemNoun="sand type" icon="🏖️" accent="#0891b2" placeholder="e.g. Furan Sand"
          items={sandTypeMaster}
          leadCounts={sandTypeCounts}
          onClose={()=>setShowSandTypeMaster(false)}
          onAdd={handleAddSandType}
          onEdit={handleEditSandType}
          onDelete={handleDeleteSandType}
        />
      )}

      {showDemoTypeMaster&&(
        <MasterListModal
          title="Demonstration Type Master" itemNoun="demo type" icon="🖥️" accent="#1d4ed8" placeholder="e.g. Hybrid"
          items={demoTypes}
          leadCounts={demoTypeCounts}
          usageNoun="demo"
          onClose={()=>setShowDemoTypeMaster(false)}
          onAdd={handleAddDemoType}
          onEdit={handleEditDemoType}
          onDelete={handleDeleteDemoType}
        />
      )}

      {showDemoModal&&(
        <DemoModal
          onClose={()=>{setShowDemoModal(false);setEditingDemo(null);}}
          onSave={handleSaveDemo}
          nextDemoNumber={nextDemoNo(demos)}
          initial={editingDemo}
          productOptions={products.map(p=>p.name)}
          ownerOptions={marketingOwners}
          customerOptions={Array.from(new Set(leads.map(l=>l.customer))).sort()}
          demoTypeOptions={demoTypes.map(t=>t.name)}
          onOpenDemoTypeMaster={()=>setShowDemoTypeMaster(true)}
        />
      )}

      {trackingDemo&&(
        <AddFollowUpModal
          demo={trackingDemo}
          onClose={()=>setTrackingDemo(null)}
          onSave={handleSaveFollowUp}
          ownerOptions={marketingOwners}
        />
      )}

      {showOrderModal&&(
        <OrderModal
          onClose={()=>{setShowOrderModal(false);setEditingOrder(null);setPrefillOrder(null);}}
          onSave={handleSaveOrder}
          nextOrderNumber={nextOrderNo(orders)}
          initial={editingOrder||prefillOrder}
          mandatory={!editingOrder&&!!prefillOrder}
          productOptions={products.map(p=>p.name)}
          ownerOptions={marketingOwners}
          customerOptions={Array.from(new Set(leads.map(l=>l.customer))).sort()}
        />
      )}
    </div>
  );
}