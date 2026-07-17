import { useState, useMemo, Fragment, useEffect } from "react";
const inputStyle={width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #d1d5db",fontSize:14,color:"#111827",boxSizing:"border-box"};
const cardStyle={background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"16px 20px"};
const thStyle={textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:0.4,padding:"10px 14px",borderBottom:"1px solid #e5e7eb",whiteSpace:"nowrap"};
const tdStyle={padding:"11px 14px",fontSize:13,color:"#111827",borderBottom:"1px solid #f3f4f6",verticalAlign:"middle"};
const labelStyle={display:"block",fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:6};

const tabs=["Dashboard","Leads","Demos","Orders","Implementation","Renewals","Reports"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS=["2026","2025"];
const LEAD_STATUSES=["Not Started","Follow Up","On Hold","Converted"];
const PRODUCT_OPTIONS=["Sandman","DigiSmart","Sandman +VComp","Gateway","Energy Analytics"];

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
  "Follow-Up":{bg:"#f5f3ff",color:"#7c3aed"},
  "Converted to Order":{bg:"#ecfdf5",color:"#059669"},
  "Cancelled":{bg:"#fef2f2",color:"#dc2626"},
  "In Progress":{bg:"#eff6ff",color:"#2563eb"},
  "Draft":{bg:"#f3f4f6",color:"#6b7280"},
  "Confirmed":{bg:"#eff6ff",color:"#2563eb"},
  "PO Received":{bg:"#f5f3ff",color:"#7c3aed"},
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
const seedLeads=[
  {leadNo:"00001",customer:"Narayanan Castings",owner:"Ravi Kumar",email:"vn@nrcastings.com",phone:"9841234567",createdDate:"2026-01-05",lastModified:"2026-03-14",status:"Converted",product:"Sandman"},
  {leadNo:"00002",customer:"Coimbatore Forge Works",owner:"Anitha",email:"bm@cfw.in",phone:"9843456789",createdDate:"2026-01-12",lastModified:"2026-03-18",status:"Follow Up",product:"DigiSmart"},
  {leadNo:"00003",customer:"Sri Murugan Iron Works",owner:"Meena",email:"sk@smiw.in",phone:"9876543210",createdDate:"2026-01-18",lastModified:"2026-03-20",status:"Follow Up",product:"Sandman +VComp"},
  {leadNo:"00004",customer:"Vijay Steel India",owner:"Anitha",email:"vr@vijsteel.com",phone:"9952341678",createdDate:"2026-02-03",lastModified:"2026-03-22",status:"Not Started",product:"Gateway"},
  {leadNo:"00005",customer:"Madurai Metal Crafts",owner:"Suresh",email:"ds@mmc.co.in",phone:"9944123456",createdDate:"2026-02-10",lastModified:"2026-03-25",status:"Not Started",product:"Energy Analytics"},
];

const allDemos=[
  {customer:"Narayanan Castings",demoNo:"DEMO-001",outcome:"Positive",date:"2026-04-06",remarks:"Customer reviewed quote. Interested. Next step: PO approval from management.",by:"Ravi Kumar"},
  {customer:"Coimbatore Forge Works",demoNo:"DEMO-002",outcome:"Neutral",date:"2026-03-25",remarks:"Demo completed. Awaiting internal budget approval.",by:"Anitha"},
  {customer:"Sri Murugan Iron Works",demoNo:"DEMO-003",outcome:"Positive",date:"2026-03-28",remarks:"Very interested, requested pricing for VComp add-on.",by:"Meena"},
  {customer:"Salem Alloy Foundry",demoNo:"DEMO-004",outcome:"Positive",date:"2026-02-15",remarks:"Demo led to signed order.",by:"Anitha"},
];
const recentDemos=[allDemos[0]];
const demoFollowUps=[
  {customer:"Narayanan Castings",ref:"DEMO-001 · Ravi Kumar",note:"Customer reviewed quote. Interested. Next step: PO approval from management.",overdue:"Overdue 90d",outcome:"Positive"},
];

const pipeline=[
  {label:"Leads",value:5,pct:100,color:"#4f46e5"},
  {label:"Demos Conducted",value:4,pct:80,color:"#4f46e5"},
  {label:"Follow-Up",value:1,pct:20,color:"#4f46e5"},
  {label:"Orders",value:4,pct:80,color:"#4f46e5"},
  {label:"Active Go-Live",value:2,pct:40,color:"#4f46e5"},
];

const implementations=[
  {customer:"Salem Alloy Foundry",product:"DigiSmart",progress:75,phase:2,goLiveDate:"2025-11-15"},
  {customer:"Narayanan Castings",product:"Sandman",progress:100,phase:3,goLiveDate:"2025-12-20"},
];

function mkSteps(texts,doneCount){
  return texts.map((t,i)=>({text:t,done:i<doneCount}));
}
const implementationRecords=[
  {
    customer:"Narayanan Castings",orderNo:"ORD-001",product:"Sandman",billingType:"Annual",users:5,done:true,
    phases:[
      {phase:0,title:"Phase 0: Kickoff",weeks:null,status:"Completed",desc:"Start → SandMan Proposal → Receipt of PO → SandMan Data Audit",
        steps:mkSteps(["Start","SandMan Proposal shared with customer","PO received from customer","SandMan Data Audit completed","Kickoff meeting scheduled"],5),
        startDate:"2025-10-15",endDate:"2025-10-25",responsiblePerson:"Ravi Kumar",notes:"PO received on time. Data audit done in 2 days.",documents:[]},
      {phase:1,title:"Phase 1: Data Collection",weeks:"4–6 Weeks",status:"Completed",desc:"Virtual Kickoff Meeting · Data collection (Historical 6 months + SCADA handshaking)",
        steps:mkSteps(["Virtual Kickoff Meeting","Data collection - Historical 6 months","SCADA handshaking","Sensor mapping","Baseline report","Data cleanup","QA pass 1","QA pass 2","Client review call","Sign-off doc drafted","Sign-off doc signed","Handover to analysis team"],12),
        startDate:"2025-10-26",endDate:"2025-11-20",responsiblePerson:"Ravi Kumar",notes:"",documents:[]},
      {phase:2,title:"Phase 2: Analysis & Modelling",weeks:"4–5 Weeks",status:"Completed",desc:"Documentation · Data Analysis Modelling · Data Science Team Review · Data Validation Checklist",
        steps:mkSteps(["Documentation","Data Analysis Modelling","Data Science Team Review","Data Validation Checklist","Final model sign-off"],5),
        startDate:"2025-11-21",endDate:"2025-12-15",responsiblePerson:"Meena",notes:"",documents:[]},
      {phase:3,title:"Phase 3: Go-Live",weeks:"1–2 Weeks",status:"Completed",desc:"Sandmix Implementation · Virtual Meeting · Sign Off",
        steps:mkSteps(["Sandmix Implementation","Virtual Meeting","Sign Off","Post go-live support call","Handover to CS team","Training session","Documentation delivered","Final closure"],8),
        startDate:"2025-12-16",endDate:"2025-12-20",responsiblePerson:"Anitha",notes:"",documents:[]},
    ]
  },
  {
    customer:"Salem Alloy Foundry",orderNo:"ORD-002",product:"DigiSmart",billingType:"Annual",users:3,done:false,
    phases:[
      {phase:0,title:"Phase 0: Kickoff",weeks:null,status:"Completed",desc:"Start → Proposal → Receipt of PO → Data Audit",
        steps:mkSteps(["Start","Proposal","Receipt of PO","Data Audit"],4),
        startDate:"2025-09-01",endDate:"2025-09-10",responsiblePerson:"Anitha",notes:"",documents:[]},
      {phase:1,title:"Phase 1: Data Collection",weeks:"4–6 Weeks",status:"Completed",desc:"Virtual Kickoff Meeting · Data collection",
        steps:mkSteps(["Virtual Kickoff Meeting","Data collection","Sensor mapping","Baseline report","QA pass","Client review call","Sign-off doc drafted","Sign-off doc signed"],8),
        startDate:"2025-09-11",endDate:"2025-10-10",responsiblePerson:"Anitha",notes:"",documents:[]},
      {phase:2,title:"Phase 2: Analysis & Modelling",weeks:"4–5 Weeks",status:"In Progress",desc:"Documentation · Data Analysis Modelling",
        steps:mkSteps(["Documentation","Data Analysis Modelling","Data Science Team Review","Data Validation Checklist","Final model sign-off"],2),
        startDate:"2025-10-11",endDate:"",responsiblePerson:"Meena",notes:"",documents:[]},
      {phase:3,title:"Phase 3: Go-Live",weeks:"1–2 Weeks",status:"Not Started",desc:"Sandmix Implementation · Virtual Meeting · Sign Off",
        steps:mkSteps(["Sandmix Implementation","Virtual Meeting","Sign Off"],0),
        startDate:"",endDate:"",responsiblePerson:"",notes:"",documents:[]},
    ]
  }
];
function implOverallPct(rec){
  const totC=rec.phases.reduce((s,p)=>s+p.steps.filter(st=>st.done).length,0);
  const totT=rec.phases.reduce((s,p)=>s+p.steps.length,0);
  return totT===0?0:Math.round((totC/totT)*100);
}

const renewals=[
  {customer:"Narayanan Castings",product:"Sandman",contractEnd:"2026-10-31",daysLeft:"109d left",status:"Active",value:"₹1,80,000",lastRenewed:"2026-10-01"},
  {customer:"Salem Alloy Foundry",product:"DigiSmart",contractEnd:"2026-11-30",daysLeft:"139d left",status:"Active",value:"₹1,20,000",lastRenewed:"—"},
];

const seedRenewals=[
  {id:"REN-001",customer:"Narayanan Castings",product:"Sandman",license:"Annual",users:5,contractStart:"2025-11-01",contractEnd:"2026-10-31",value:"₹1,80,000",assignedTo:"Ravi Kumar",notes:"",renewalStatus:"Active",history:[
    {renewedOn:"2026-10-01",contractStart:"2025-11-01",contractEnd:"2026-10-31",value:"₹1,80,000",status:"Renewed",notes:"Annual renewal confirmed via email. No changes to scope."},
  ]},
  {id:"REN-002",customer:"Salem Alloy Foundry",product:"DigiSmart",license:"Annual",users:3,contractStart:"2025-12-01",contractEnd:"2026-11-30",value:"₹1,20,000",assignedTo:"Anitha",notes:"",renewalStatus:"Active",history:[]},
];
function daysLeftFrom(dateStr){
  const now=new Date("2026-07-14");
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

const allOrders=[
  {orderNo:"ORD-001",customer:"Narayanan Castings",product:"Sandman",value:"₹1,80,000",paid:"₹1,80,000",outstanding:"₹0",status:"Paid",date:"2025-10-15",
    poNo:"PO-2025-041",poUploaded:false,orderStatus:"Active (Go-Live)",paymentStatus:"Fully Paid",assignedTo:"Ravi Kumar"},
  {orderNo:"ORD-002",customer:"Salem Alloy Foundry",product:"DigiSmart",value:"₹1,20,000",paid:"₹1,20,000",outstanding:"₹0",status:"Paid",date:"2025-11-20",
    poNo:"PO-2025-089",poUploaded:false,orderStatus:"Active (Go-Live)",paymentStatus:"Fully Paid",assignedTo:"Anitha"},
  {orderNo:"ORD-003",customer:"Coimbatore Forge Works",product:"DigiSmart",value:"₹95,000",paid:"₹47,500",outstanding:"₹47,500",status:"Partial",date:"2026-01-10",
    poNo:null,poUploaded:false,orderStatus:"Invoiced",paymentStatus:"Advance Paid",assignedTo:"Anitha"},
  {orderNo:"ORD-004",customer:"Tirupur Die Cast Ltd",product:"Sandman +VComp",value:"₹1,60,000",paid:"₹0",outstanding:"₹1,60,000",status:"Pending",date:"2026-03-20",
    poNo:"PO-2026-012",poUploaded:false,orderStatus:"PO Received",paymentStatus:"Pending",assignedTo:"Ravi Kumar"},
];

const DEMO_STATUSES=["Requested","Scheduled","Completed","Follow-Up","Converted to Order","Cancelled"];
const DEMO_TYPES=["On-Site","Online","Virtual"];
const seedDemosList=[
  {demoNo:"DEMO-001",customer:"Narayanan Castings",contactPerson:"V. Narayanan",product:"Sandman",demoDate:"2026-03-10",type:"On-Site",conductedBy:"Ravi Kumar",status:"Follow-Up",nextFollowUp:"2026-04-15",activities:[
    {date:"2026-04-06",outcome:"Positive",next:"2026-04-15",note:"Customer reviewed quote. Interested. Next step: PO approval from management.",by:"Ravi Kumar"},
    {date:"2026-03-21",outcome:"Neutral",next:null,note:"Follow-up call done. Customer asked for pricing. Sent quotation via email.",by:"Ravi Kumar"},
    {date:"2026-03-10",outcome:"Positive",next:null,note:"Demo went well. Customer liked sand parameter tracking. Interested in annual license.",by:"Ravi Kumar"},
  ]},
  {demoNo:"DEMO-002",customer:"Coimbatore Forge Works",contactPerson:"Balaji M",product:"DigiSmart",demoDate:"2026-03-18",type:"Online",conductedBy:"Anitha",status:"Scheduled",nextFollowUp:null,activities:[]},
  {demoNo:"DEMO-003",customer:"Sri Murugan Iron Works",contactPerson:"Selvam K",product:"Sandman +VComp",demoDate:"2026-04-02",type:"On-Site",conductedBy:"Pragash",status:"Requested",nextFollowUp:null,activities:[]},
  {demoNo:"DEMO-004",customer:"Vijay Steel India",contactPerson:"Vijay R",product:"Gateway",demoDate:"2026-04-08",type:"Virtual",conductedBy:"Meena",status:"Requested",nextFollowUp:null,activities:[]},
];
function nextDemoNo(demos){
  const max=demos.reduce((m,d)=>Math.max(m,parseInt(String(d.demoNo).replace("DEMO-",""),10)||0),0);
  return "DEMO-"+String(max+1).padStart(3,"0");
}

const ORDER_STATUSES=["Draft","Confirmed","PO Received","Invoiced","Payment Done","Active (Go-Live)"];
const PAYMENT_STATUSES=["Pending","Advance Paid","Fully Paid"];
const ORDER_STATUS_ACCENT={"Draft":"#9ca3af","Confirmed":"#2563eb","PO Received":"#7c3aed","Invoiced":"#d97706","Payment Done":"#2563eb","Active (Go-Live)":"#059669","Cancelled":"#dc2626"};
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
  const now=new Date("2026-07-14");
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

function PhaseStepper({phase}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      {[0,1,2,3].map((p,i)=>(
        <div key={p} style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:p<=phase?"#4f46e5":"#f3f4f6",color:p<=phase?"#fff":"#9ca3af",border:p===phase?"2px solid #4f46e5":"none"}}>{p}</div>
          {i<3&&<div style={{width:12,height:2,background:p<phase?"#4f46e5":"#e5e7eb"}}/>}
        </div>
      ))}
    </div>
  );
}

const LEAD_SOURCE_OPTIONS=["Trade Fair","Google Ads","LinkedIn","Email Campaign","Referral","Cold Call","Website","Webinar","Social Media"];
const COUNTRY_OPTIONS=["India","USA","UAE","Germany","Japan","China","UK","Australia"];
const STATE_OPTIONS=["Tamil Nadu","Maharashtra","Gujarat","Karnataka","Rajasthan","Telangana","Andhra Pradesh","Punjab","Haryana","West Bengal","Madhya Pradesh","Uttar Pradesh"];
const REGION_OPTIONS=["South","North","East","West"];
const BUSINESS_AREA_OPTIONS=["Automotive","Heavy Engineering","Railways","Defence","General Engineering","Pipe Fittings","Pumps & Valves"];
const DEFAULT_PRODUCTS=["Sandman","Sandman +VComp","DigiSmart","Gateway","Energy Analytics"];
const FOUNDRY_TYPE_OPTIONS=["Steel","Automotive","Cast Iron","Railway","Other Metal","Machinery","DI Pipe","Sanitary / Municipal"];
const SAND_TYPE_OPTIONS=["Green Sand","Alphaset Sand","No-Bake Sand","Lost Foam Sand","Permanent Mould Sand"];
const OWNER_OPTIONS=["Ravi Kumar","Anitha","Meena","Suresh"];

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
function LeadModal({onClose,onSave,nextLeadNumber,initial,productOptions,leadSourceOptions}){
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

  const [owner,setOwner]=useState(initial?.owner||OWNER_OPTIONS[0]);
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
    if(!leadSource){ alert("Please select a lead source."); return false; }
    if(!firstName.trim()){ alert("Please enter the contact person's first name."); return false; }
    if(!lastName.trim()){ alert("Please enter the contact person's last name."); return false; }
    if(!email.trim()){ alert("Please enter an email address."); return false; }
    if(!contactNumber.trim()){ alert("Please enter a contact number."); return false; }
    if(!designation.trim()){ alert("Please enter a designation."); return false; }
    if(!street.trim()){ alert("Please enter the street address."); return false; }
    if(!city.trim()){ alert("Please enter a city."); return false; }
    if(!zip.trim()){ alert("Please enter a ZIP / postal code."); return false; }
    if(!state){ alert("Please select a state."); return false; }
    if(!region){ alert("Please select a region."); return false; }
    if(!painPoints.trim()){ alert("Please describe the current pain points."); return false; }
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
            <div><label style={labelStyle}>Country / Territory {reqMark}</label>
              <select style={inputStyle} value={country} onChange={e=>setCountry(e.target.value)}>
                {COUNTRY_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Contact Person Last Name {reqMark}</label><input style={inputStyle} value={lastName} onChange={e=>setLastName(e.target.value)}/></div>
            <div><label style={labelStyle}>Street {reqMark}</label><textarea style={{...inputStyle,minHeight:60,resize:"vertical"}} value={street} onChange={e=>setStreet(e.target.value)}/></div>
            <div><label style={labelStyle}>Email Address {reqMark}</label><input type="email" style={inputStyle} value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div><label style={labelStyle}>City {reqMark}</label><input style={inputStyle} value={city} onChange={e=>setCity(e.target.value)}/></div>
            <div><label style={labelStyle}>Contact Person Number {reqMark}</label><input style={inputStyle} value={contactNumber} onChange={e=>setContactNumber(e.target.value)}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={labelStyle}>ZIP / Postal Code {reqMark}</label><input style={inputStyle} value={zip} onChange={e=>setZip(e.target.value)}/></div>
              <div><label style={labelStyle}>State {reqMark}</label>
                <select style={inputStyle} value={state} onChange={e=>setState(e.target.value)}>
                  <option value="">--None--</option>
                  {STATE_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div><label style={labelStyle}>Designation {reqMark}</label><input style={inputStyle} value={designation} onChange={e=>setDesignation(e.target.value)}/></div>
            <div><label style={labelStyle}>Lead Status</label>
              <select style={inputStyle} value={leadStatus} onChange={e=>setLeadStatus(e.target.value)}>
                {LEAD_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div><label style={labelStyle}>Region {reqMark}</label>
              <select style={inputStyle} value={region} onChange={e=>setRegion(e.target.value)}>
                <option value="">--None--</option>
                {REGION_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Business Area</label>
              <select style={inputStyle} value={businessArea} onChange={e=>setBusinessArea(e.target.value)}>
                <option value="">--None--</option>
                {BUSINESS_AREA_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div style={sectionHeaderStyle}>Customer Potential</div>
          <div style={{padding:"18px 24px"}}>
            <CheckboxGrid options={productOptions} selected={customerPotential} onToggle={v=>toggle(customerPotential,setCustomerPotential,v)}/>
          </div>

          <div style={sectionHeaderStyle}>Foundry Information</div>
          <div style={{padding:"18px 24px"}}>
            <CheckboxGrid options={FOUNDRY_TYPE_OPTIONS} selected={foundryInfo} onToggle={v=>toggle(foundryInfo,setFoundryInfo,v)}/>
          </div>

          <div style={sectionHeaderStyle}>Sand System Information</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <CheckboxGrid options={SAND_TYPE_OPTIONS} selected={sandTypes} onToggle={v=>toggle(sandTypes,setSandTypes,v)}/>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={labelStyle}>Mixer Make</label><input style={inputStyle} value={mixerMake} onChange={e=>setMixerMake(e.target.value)}/></div>
              <div><label style={labelStyle}>Mixer Type</label><input style={inputStyle} value={mixerType} onChange={e=>setMixerType(e.target.value)}/></div>
              <div><label style={labelStyle}>Mixer Batch Size</label><input style={inputStyle} value={mixerBatchSize} onChange={e=>setMixerBatchSize(e.target.value)}/></div>
              <div><label style={labelStyle}>Hourly Sand Output</label><input style={inputStyle} value={hourlySandOutput} onChange={e=>setHourlySandOutput(e.target.value)}/></div>
            </div>
          </div>

          <div style={sectionHeaderStyle}>Current Pain Points</div>
          <div style={{padding:"18px 24px"}}>
            <label style={labelStyle}>Description {reqMark}</label>
            <textarea style={{...inputStyle,minHeight:80,resize:"vertical"}} value={painPoints} onChange={e=>setPainPoints(e.target.value)}/>
          </div>

          <div style={sectionHeaderStyle}>System Information</div>
          <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <label style={labelStyle}>Owner</label>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#4f46e5",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{owner[0]}</div>
                <select style={inputStyle} value={owner} onChange={e=>setOwner(e.target.value)}>
                  {OWNER_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
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
          <button onClick={()=>handleSave(true)} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #4f46e5",background:"#fff",fontWeight:600,fontSize:13,color:"#4f46e5",cursor:"pointer"}}>Save & New</button>
          <button onClick={()=>handleSave(false)} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#4f46e5",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save</button>
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

function ProductMasterModal({products,onClose,onAdd,onEdit,onDelete,leadCounts}){
  const [newName,setNewName]=useState("");
  const [editingId,setEditingId]=useState(null);
  const [editName,setEditName]=useState("");

  function handleAdd(){
    const name=newName.trim();
    if(!name) return;
    if(products.some(p=>p.name.toLowerCase()===name.toLowerCase())){
      alert("That product already exists.");
      return;
    }
    onAdd(name);
    setNewName("");
  }
  function startEdit(p){ setEditingId(p.id); setEditName(p.name); }
  function saveEdit(p){
    const name=editName.trim();
    if(!name) return;
    onEdit(p.id,name);
    setEditingId(null);
  }
  function handleDelete(p){
    const count=leadCounts[p.name]||0;
    const msg=count>0
      ? `"${p.name}" is used by ${count} lead(s). Delete it anyway? Existing leads will keep the label but it won't be selectable for new ones.`
      : `Delete product "${p.name}"?`;
    if(window.confirm(msg)) onDelete(p.id);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:520,maxWidth:"92vw",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>Product Master</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>

        <div style={{padding:"20px 24px",flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:8,flexShrink:0}}>ADD NEW PRODUCT</div>
          <div style={{display:"flex",gap:8,marginBottom:24,flexShrink:0}}>
            <input
              style={inputStyle}
              value={newName}
              onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") handleAdd(); }}
              placeholder="e.g. IndustiQ"
            />
            <button onClick={handleAdd} style={{padding:"9px 20px",borderRadius:8,border:"none",background:"#4f46e5",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>Add</button>
          </div>

          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:10,flexShrink:0}}>PRODUCTS ({products.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,overflowY:"auto",flex:1,paddingRight:4}}>
            {products.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px"}}>
                <div style={{width:32,height:32,borderRadius:8,background:"#f5f3ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>📦</div>
                {editingId===p.id?(
                  <input
                    style={{...inputStyle,flex:1,padding:"6px 10px"}}
                    value={editName}
                    autoFocus
                    onChange={e=>setEditName(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") saveEdit(p); }}
                  />
                ):(
                  <div style={{flex:1,fontSize:14,fontWeight:600,color:"#111827"}}>{p.name}</div>
                )}
                <div style={{fontSize:12,color:"#9ca3af",whiteSpace:"nowrap"}}>{leadCounts[p.name]||0} leads</div>
                {editingId===p.id?(
                  <button onClick={()=>saveEdit(p)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #4f46e5",background:"#4f46e5",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}}>Save</button>
                ):(
                  <button onClick={()=>startEdit(p)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:12,color:"#111827",cursor:"pointer"}}>Edit</button>
                )}
                <button onClick={()=>handleDelete(p)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #fecaca",background:"#fee2e2",fontWeight:600,fontSize:12,color:"#b91c1c",cursor:"pointer"}}>Delete</button>
              </div>
            ))}
            {products.length===0&&<div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:20}}>No products yet.</div>}
          </div>
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"9px 22px",borderRadius:8,border:"none",background:"#4f46e5",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Done</button>
        </div>
      </div>
    </div>
  );
}

function LeadSourceMasterModal({sources,onClose,onAdd,onEdit,onDelete,leadCounts}){
  const [newName,setNewName]=useState("");
  const [editingId,setEditingId]=useState(null);
  const [editName,setEditName]=useState("");

  function handleAdd(){
    const name=newName.trim();
    if(!name) return;
    if(sources.some(s=>s.name.toLowerCase()===name.toLowerCase())){
      alert("That lead source already exists.");
      return;
    }
    onAdd(name);
    setNewName("");
  }
  function startEdit(s){ setEditingId(s.id); setEditName(s.name); }
  function saveEdit(s){
    const name=editName.trim();
    if(!name) return;
    onEdit(s.id,name);
    setEditingId(null);
  }
  function handleDelete(s){
    const count=leadCounts[s.name]||0;
    const msg=count>0
      ? `"${s.name}" is used by ${count} lead(s). Delete it anyway? Existing leads will keep the label but it won't be selectable for new ones.`
      : `Delete lead source "${s.name}"?`;
    if(window.confirm(msg)) onDelete(s.id);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:520,maxWidth:"92vw",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>Lead Source Master</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>

        <div style={{padding:"20px 24px",flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:8,flexShrink:0}}>ADD NEW LEAD SOURCE</div>
          <div style={{display:"flex",gap:8,marginBottom:24,flexShrink:0}}>
            <input
              style={inputStyle}
              value={newName}
              onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") handleAdd(); }}
              placeholder="e.g. Cold Email"
            />
            <button onClick={handleAdd} style={{padding:"9px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>Add</button>
          </div>

          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.4,marginBottom:10,flexShrink:0}}>SOURCES ({sources.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,overflowY:"auto",flex:1,paddingRight:4}}>
            {sources.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px"}}>
                <div style={{width:32,height:32,borderRadius:8,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🚀</div>
                {editingId===s.id?(
                  <input
                    style={{...inputStyle,flex:1,padding:"6px 10px"}}
                    value={editName}
                    autoFocus
                    onChange={e=>setEditName(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") saveEdit(s); }}
                  />
                ):(
                  <div style={{flex:1,fontSize:14,fontWeight:600,color:"#111827"}}>{s.name}</div>
                )}
                <div style={{fontSize:12,color:"#9ca3af",whiteSpace:"nowrap"}}>{leadCounts[s.name]||0} leads</div>
                {editingId===s.id?(
                  <button onClick={()=>saveEdit(s)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #2563eb",background:"#2563eb",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}}>Save</button>
                ):(
                  <button onClick={()=>startEdit(s)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:12,color:"#111827",cursor:"pointer"}}>Edit</button>
                )}
                <button onClick={()=>handleDelete(s)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #fecaca",background:"#fee2e2",fontWeight:600,fontSize:12,color:"#b91c1c",cursor:"pointer"}}>Delete</button>
              </div>
            ))}
            {sources.length===0&&<div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:20}}>No lead sources yet.</div>}
          </div>
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
        <option value="">+ Add product...</option>
        {available.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function DemoModal({onClose,onSave,nextDemoNumber,initial,productOptions,ownerOptions,customerOptions}){
  const [demoNo]=useState(initial?.demoNo||nextDemoNumber);
  const [customer,setCustomer]=useState(initial?.customer||"");
  const [products,setProducts]=useState(initial?.product?initial.product.split(" + "):[]);
  const [demoDate,setDemoDate]=useState(initial?.demoDate||todayISO());
  const [type,setType]=useState(initial?.type||DEMO_TYPES[0]);
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
              <select style={inputStyle} value={type} onChange={e=>setType(e.target.value)}>
                {DEMO_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
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
function OrderModal({onClose,onSave,nextOrderNumber,initial,productOptions,ownerOptions,customerOptions}){
  const [orderNo]=useState(initial?.orderNo||nextOrderNumber);
  const [customer,setCustomer]=useState(initial?.customer||"");
  const [product,setProduct]=useState(initial?.product||productOptions[0]||"");
  const [date,setDate]=useState(initial?.date||todayISO());
  const [value,setValue]=useState(initial?String(initial.value).replace(/[₹,]/g,""):"");
  const [paid,setPaid]=useState(initial?String(initial.paid).replace(/[₹,]/g,""):"0");
  const [poNo,setPoNo]=useState(initial?.poNo||"");
  const [poUploaded,setPoUploaded]=useState(initial?.poUploaded||false);
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
      poNo:poNo.trim()||null,poUploaded,orderStatus,paymentStatus,assignedTo,
    });
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:700,maxWidth:"94vw",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>{initial?"Edit Order":"New Order"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#6b7280",cursor:"pointer"}}>×</button>
        </div>

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
              <input type="number" style={inputStyle} value={value} onChange={e=>setValue(e.target.value)} placeholder="e.g. 180000"/>
            </div>
            <div>
              <label style={labelStyle}>Amount Paid (₹)</label>
              <input type="number" style={inputStyle} value={paid} onChange={e=>setPaid(e.target.value)} placeholder="0"/>
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
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#111827",cursor:"pointer",paddingBottom:9}}>
              <input type="checkbox" checked={poUploaded} onChange={e=>setPoUploaded(e.target.checked)}/>
              PO document uploaded
            </label>
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
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#111827",cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#4f46e5",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save</button>
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
            <div style={{width:34,height:34,borderRadius:"50%",background:"#4f46e5",color:"#fff",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{demo.customer[0]}</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{demo.customer}</div>
              <div style={{fontSize:12,color:"#4f46e5",fontWeight:600}}>Demo: {demo.demoDate} · {demo.type}</div>
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
                <div key={ai} style={{display:"flex",gap:8,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:o.dot,marginTop:5,flexShrink:0}}/>
                  <div style={{fontSize:12}}>
                    <div style={{fontWeight:700,color:o.color||"#374151"}}>{o.icon} {a.outcome}</div>
                    <div style={{color:"#9ca3af",marginTop:1}}>{a.date}</div>
                    {a.next&&<div style={{color:"#2563eb",fontWeight:600,marginTop:3,display:"flex",alignItems:"center",gap:3}}>📅 {a.next}</div>}
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
          <button onClick={handleSave} style={{padding:"9px 18px",borderRadius:8,border:"none",background:"#4f46e5",fontWeight:600,fontSize:13,color:"#fff",cursor:"pointer"}}>Save Follow-up</button>
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
          <div style={{fontSize:12,color:"#2563eb",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>📅 {demo.nextFollowUp||demo.activities[demo.activities.length-1].date}</div>
          <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{demo.activities.length} activities</div>
          <button onClick={()=>onTrack(demo)} style={{marginTop:4,padding:"3px 10px",borderRadius:6,border:"1px solid #c7d2fe",background:"#eef2ff",color:"#4f46e5",fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Follow-up</button>
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
        <button onClick={onAddNew} style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#4f46e5",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}>+ New Demo</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {subTabs.map(t=>{
          const active=statusFilter===t;
          return(
            <button key={t} onClick={()=>pickTab(t)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+(active?"#4f46e5":"#d1d5db"),background:active?"#4f46e5":"#fff",color:active?"#fff":"#374151",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {t} ({counts[t]})
            </button>
          );
        })}
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
                  <th key={c.key} style={{...thStyle,cursor:"pointer",color:sortKey===c.key?"#4f46e5":"#6b7280"}} onClick={()=>toggleSort(c.key)}>
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
                    <td style={{...tdStyle,color:"#2563eb",fontWeight:700,whiteSpace:"nowrap"}}>
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
                    <td style={tdStyle}><ProductPill label={d.product}/></td>
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
                              <span style={{fontSize:12,color:"#6b7280",fontWeight:600}}>{(d.activities||[]).length} activities</span>
                              <button onClick={()=>onTrack?onTrack(d):null} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#4f46e5",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Add Follow-up</button>
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
            <span style={{padding:"5px 10px",borderRadius:6,background:"#4f46e5",color:"#fff",fontWeight:700}}>{page}</span>
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
          <button onClick={onAddNew} style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#4f46e5",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}>+ New Order</button>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {subTabs.map(t=>{
          const active=statusFilter===t;
          return(
            <button key={t} onClick={()=>setStatusFilter(t)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+(active?"#4f46e5":"#d1d5db"),background:active?"#4f46e5":"#fff",color:active?"#fff":"#374151",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {t} ({counts[t]})
            </button>
          );
        })}
        <button onClick={()=>setStatusFilter("PaymentPending")} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+(statusFilter==="PaymentPending"?"#dc2626":"#fecaca"),background:statusFilter==="PaymentPending"?"#dc2626":"#fff",color:statusFilter==="PaymentPending"?"#fff":"#dc2626",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          💳 Payment Pending ({paymentPending.length})
        </button>
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
                  <th key={c.key} style={{...thStyle,cursor:"pointer",color:sortKey===c.key?"#4f46e5":"#6b7280"}} onClick={()=>toggleSort(c.key)}>
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
                  <td style={{...tdStyle,color:"#2563eb",fontWeight:700}}>{o.orderNo}</td>
                  <td style={{...tdStyle,fontWeight:600}}>{o.customer}</td>
                  <td style={tdStyle}><ProductPill label={o.product}/></td>
                  <td style={{...tdStyle,color:"#6b7280",whiteSpace:"nowrap"}}>{o.date}</td>
                  <td style={tdStyle}>
                    <div style={{fontWeight:700}}>{o.value}</div>
                    {parseRupee(o.paid)>0&&<div style={{fontSize:11,color:"#059669"}}>✓ {o.paid}</div>}
                    {parseRupee(o.outstanding)>0&&<div style={{fontSize:11,color:"#dc2626"}}>⚠ {o.outstanding} due</div>}
                  </td>
                  <td style={tdStyle}>
                    <div>{o.poNo||"—"}</div>
                    <div style={{fontSize:11,color:o.poUploaded?"#059669":"#d97706"}}>{o.poUploaded?"✓ Uploaded":"⚠ Not uploaded"}</div>
                  </td>
                  <td style={tdStyle}><StatusPill label={o.orderStatus}/></td>
                  <td style={tdStyle}><StatusPill label={o.paymentStatus}/></td>
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
  const badgeColor=p.status==="Completed"?"#059669":p.status==="In Progress"?"#2563eb":p.status==="On Hold"?"#d97706":"#9ca3af";
  const completed=p.steps.filter(s=>s.done).length;
  const total=p.steps.length;
  const pct=total===0?0:Math.round((completed/total)*100);

  function toggleStep(i){
    onUpdate({steps:p.steps.map((s,idx)=>idx===i?{...s,done:!s.done}:s)});
  }
  function setField(field,value){ onUpdate({[field]:value}); }

  return(
    <div style={{...cardStyle,padding:0,overflow:"hidden",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px"}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:badgeColor,color:"#fff",fontSize:15,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{p.phase}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>{p.title}</span>
            {p.weeks&&<span style={{fontSize:12,color:"#9ca3af"}}>{p.weeks}</span>}
            <StatusPill label={p.status}/>
          </div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>{p.desc}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:100,height:6,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:badgeColor,borderRadius:4}}/>
          </div>
          <span style={{fontSize:13,fontWeight:700,color:"#111827",whiteSpace:"nowrap"}}>{completed}/{total}</span>
          <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:13}}>{open?"▲":"▼"}</button>
        </div>
      </div>
      {open&&(
        <div style={{padding:"0 20px 20px 76px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
          <div>
            <label style={labelStyle}>CHECKLIST</label>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {p.steps.map((s,i)=>(
                <label key={i} style={{display:"flex",alignItems:"center",gap:9,fontSize:13,cursor:"pointer",color:s.done?"#9ca3af":"#111827",textDecoration:s.done?"line-through":"none"}}>
                  <input type="checkbox" checked={s.done} onChange={()=>toggleStep(i)}/>
                  {s.text}
                </label>
              ))}
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
              <label style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"1px dashed #c7d2fe",background:"#eef2ff",color:"#4f46e5",fontSize:12,fontWeight:600,cursor:"pointer"}}>
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

function ImplementationTab({records,onUpdatePhase}){
  const [filter,setFilter]=useState("Active");
  const [search,setSearch]=useState("");
  const [selectedCustomer,setSelectedCustomer]=useState(records[0]?.customer||null);

  const visible=useMemo(()=>{
    let rows=records;
    if(filter==="Active") rows=rows.filter(r=>implOverallPct(r)<100);
    const term=search.trim().toLowerCase();
    if(term) rows=rows.filter(r=>r.customer.toLowerCase().includes(term));
    return rows;
  },[records,filter,search]);

  const selected=visible.find(r=>r.customer===selectedCustomer)||visible[0]||null;
  const overallPct=selected?implOverallPct(selected):0;

  return(
    <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:18,alignItems:"start"}}>
      <div>
        <div style={{display:"flex",gap:0,marginBottom:12,background:"#fff",border:"1px solid #e4e7ec",borderRadius:8,padding:3}}>
          {["Active","All"].map(f=>{
            const count=f==="All"?records.length:records.filter(r=>implOverallPct(r)<100).length;
            return(
              <button key={f} onClick={()=>setFilter(f)} style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",background:filter===f?"#4f46e5":"transparent",color:filter===f?"#fff":"#6b7280",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {f} ({count})
              </button>
            );
          })}
        </div>
        <div style={{position:"relative",marginBottom:12}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer..." style={{...inputStyle,paddingLeft:34}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {visible.map(r=>{
            const pct=implOverallPct(r);
            const active=selected&&r.customer===selected.customer;
            return(
              <div key={r.customer} onClick={()=>setSelectedCustomer(r.customer)} style={{
                cursor:"pointer",border:"1px solid "+(active?"#4f46e5":"#e5e7eb"),
                background:active?"#eef2ff":"#fff",borderRadius:10,padding:"12px 14px",
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>{r.customer}</span>
                  {pct===100&&<span style={{fontSize:10,fontWeight:800,color:"#059669",background:"#ecfdf5",padding:"2px 7px",borderRadius:10}}>✓ DONE</span>}
                </div>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{r.orderNo} · {r.product}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                  <div style={{flex:1,height:6,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:pct===100?"#059669":"#4f46e5",borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:"#6b7280"}}>{r.phases.filter(p=>p.status==="Completed").length}/{r.phases.length}</span>
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
                <div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{selected.orderNo} · {selected.product} · {selected.billingType} · {selected.users} users</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:26,fontWeight:800,color:overallPct===100?"#059669":"#4f46e5"}}>{overallPct}%</div>
                <div style={{display:"flex",gap:4,justifyContent:"flex-end",marginTop:2}}>
                  {selected.phases.map(p=>(
                    <span key={p.phase} style={{width:8,height:8,borderRadius:"50%",background:p.status==="Completed"?"#059669":p.status==="In Progress"?"#2563eb":"#e5e7eb"}}/>
                  ))}
                </div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Overall</div>
              </div>
            </div>
            {selected.phases.map(p=><PhaseCard key={p.phase} p={p} onUpdate={patch=>onUpdatePhase(selected.customer,p.phase,patch)}/>)}
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
    const oldContractStart=renewal.contractStart;
    const oldContractEnd=renewal.contractEnd;
    const oldValue=renewal.value;
    onSave({
      contractStart:newStartDate,
      contractEnd:newEndDate,
      value:formatRupee(Number(newValue)||0),
      renewalStatus:renewStatus,
      historyEntry:{
        renewedOn:todayISO(),
        contractStart:oldContractStart,
        contractEnd:oldContractEnd,
        value:oldValue,
        status:"Renewed",
        notes:renewNotes.trim()||"—",
      },
    });
  }

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

function RenewalsTab({renewals,onRenew}){
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
        {subTabs.map(t=>{
          const active=statusFilter===t;
          return(
            <button key={t} onClick={()=>setStatusFilter(t)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+(active?"#4f46e5":"#d1d5db"),background:active?"#4f46e5":"#fff",color:active?"#fff":"#374151",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {t} ({counts[t]})
            </button>
          );
        })}
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
                      <td style={tdStyle}><ProductPill label={r.product}/></td>
                      <td style={tdStyle}>{r.license}</td>
                      <td style={tdStyle}>{r.users}</td>
                      <td style={{...tdStyle,color:"#6b7280"}}>{r.contractStart}</td>
                      <td style={{...tdStyle,color:"#6b7280",fontWeight:700}}>{r.contractEnd}</td>
                      <td style={tdStyle}>
                        <span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700,
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
                        <button onClick={()=>setRenewing(r)} style={{padding:"6px 14px",borderRadius:6,border:"none",background:"#059669",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>↻ Renew</button>
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
          <button onClick={()=>onOpen(report.id)} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #4f46e5",background:"#fff",color:"#4f46e5",fontWeight:700,fontSize:13,cursor:"pointer"}}>Open Report →</button>
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
      <button onClick={onBack} style={{background:"none",border:"none",color:"#4f46e5",fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:14,padding:0}}>← Back to Reports</button>
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

function ReportPrintToolbar({title,count,countLabel,dateLabel,onBack,onAllReports}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={onBack} style={{padding:"8px 14px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#374151",cursor:"pointer"}}>← Back</button>
        <button onClick={onAllReports} style={{padding:"8px 14px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontWeight:600,fontSize:13,color:"#374151",cursor:"pointer"}}>← All Reports</button>
        <span style={{fontSize:13,color:"#6b7280"}}>{title} · {count} {countLabel} · {dateLabel}</span>
      </div>
      <button onClick={()=>window.print()} style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>🖨️ Print / PDF</button>
    </div>
  );
}

function DemoActivityReport({demos,onBack}){
  const [statusFilter,setStatusFilter]=useState("All Statuses");
  const [conductedByFilter,setConductedByFilter]=useState("All");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [generated,setGenerated]=useState(false);

  const conductedByOptions=useMemo(()=>Array.from(new Set(demos.map(d=>d.conductedBy))).sort(),[demos]);

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
      {label:"Total Activities",value:totalActivities,accent:"#7c3aed"},
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
                    <td style={{...tdStyle,color:"#2563eb",fontWeight:700}}>{r.demoNo}</td>
                    <td style={tdStyle}><ProductPill label={r.product}/></td>
                    <td style={{...tdStyle,color:"#6b7280"}}>{r.date}</td>
                    <td style={tdStyle}>{r.outcome?<OutcomeBadge label={r.outcome}/>:"—"}</td>
                    <td style={{...tdStyle,color:"#2563eb"}}>{r.next||"—"}</td>
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
          <ReportKpi value={totalActivities} label="Total Activities" accent="#7c3aed"/>
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
                    <td style={{...tdStyle,color:"#2563eb",fontWeight:700}}>{o.orderNo}</td>
                    <td style={{...tdStyle,fontWeight:700}}>{o.customer}</td>
                    <td style={tdStyle}><ProductPill label={o.product}/></td>
                    <td style={{...tdStyle,color:"#6b7280"}}>{o.date}</td>
                    <td style={{...tdStyle,fontWeight:700}}>{o.value}</td>
                    <td style={tdStyle}>{o.poNo||"—"}</td>
                    <td style={tdStyle}><StatusPill label={o.orderStatus}/></td>
                    <td style={tdStyle}><StatusPill label={o.paymentStatus}/></td>
                    <td style={tdStyle}>{o.assignedTo}</td>
                    <td style={{...tdStyle,fontStyle:"italic",color:o.poUploaded?"#059669":"#9ca3af"}}>{o.poUploaded?"Uploaded":"Not uploaded"}</td>
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
                    <td style={{...tdStyle,color:"#2563eb",fontWeight:700}}>Lead - {l.leadNo}</td>
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

function ReportsTab({leads,demos,orders}){
  const [activeReport,setActiveReport]=useState("demoActivity");
  if(activeReport==="demoActivity") return <DemoActivityReport demos={demos} onBack={()=>setActiveReport(null)}/>;
  if(activeReport==="poReceipt") return <PoReceiptReport orders={orders} onBack={()=>setActiveReport(null)}/>;
  if(activeReport==="leadStatus") return <LeadStatusReport leads={leads} onBack={()=>setActiveReport(null)}/>;
  return <ReportsHome onOpen={setActiveReport}/>;
}

/* ---------------- Leads Tab ---------------- */
function LeadsTab({leads,onAddNew,onEdit,onDelete,onOpenProductMaster,onOpenLeadSourceMaster,onChangeOwner}){
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
      <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"12px 16px",marginBottom:16,fontSize:13,fontWeight:600,color:"#92400e",display:"flex",alignItems:"center",gap:8}}>
        ⚠️ Please confirm that the customer is not already listed as an Account before proceeding to create a new Lead.
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:8,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎯</div>
          <div>
            <div style={{fontSize:12,color:"#6b7280",fontWeight:600}}>Leads</div>
            <div style={{fontSize:18,fontWeight:800,color:"#111827"}}>{statusFilter}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onAddNew} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #4f46e5",background:"#fff",color:"#4f46e5",fontWeight:600,fontSize:13,cursor:"pointer"}}>New</button>
          <button onClick={handleOpenChangeOwner} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",color:"#111827",fontWeight:600,fontSize:13,cursor:"pointer"}}>Change Owner</button>
          <button onClick={onOpenProductMaster} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #a7f3d0",background:"#fff",color:"#059669",fontWeight:600,fontSize:13,cursor:"pointer"}}>⚙ Product Master</button>
          <button onClick={onOpenLeadSourceMaster} style={{padding:"9px 16px",borderRadius:8,border:"1px solid #bfdbfe",background:"#fff",color:"#2563eb",fontWeight:600,fontSize:13,cursor:"pointer"}}>⚙ Lead Source Master</button>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {subTabs.map(t=>{
          const active=statusFilter===t;
          return(
            <button key={t} onClick={()=>setStatusFilter(t)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+(active?"#4f46e5":"#d1d5db"),background:active?"#4f46e5":"#fff",color:active?"#fff":"#374151",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {t} ({counts[t]})
            </button>
          );
        })}
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
                  <th key={c.key} style={{...thStyle,cursor:"pointer",color:sortKey===c.key?"#4f46e5":"#6b7280"}} onClick={()=>toggleSort(c.key)}>
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
                  <td style={{...tdStyle,color:"#2563eb",fontWeight:700,whiteSpace:"nowrap"}}>Lead - {l.leadNo}</td>
                  <td style={{...tdStyle,color:"#2563eb",fontWeight:600}}>{l.owner}</td>
                  <td style={{...tdStyle,fontWeight:600}}>{l.customer}</td>
                  <td style={tdStyle}><a href={"mailto:"+l.email} style={{color:"#2563eb"}}>{l.email}</a></td>
                  <td style={{...tdStyle,whiteSpace:"nowrap"}}>{l.phone}</td>
                  <td style={{...tdStyle,color:"#6b7280",whiteSpace:"nowrap"}}>{l.createdDate}</td>
                  <td style={{...tdStyle,color:"#6b7280",whiteSpace:"nowrap"}}>{l.lastModified}</td>
                  <td style={tdStyle}><StatusPill label={l.status}/></td>
                  <td style={tdStyle}><ProductPill label={l.product}/></td>
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
          ownerOptions={OWNER_OPTIONS}
          onClose={()=>setShowChangeOwner(false)}
          onApply={handleApplyChangeOwner}
        />
      )}
    </div>
  );
}

function loadPersisted(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch{
    return fallback;
  }
}

export default function MarketingHub(){
  const [tab,setTab]=useState("Dashboard");
  const [period,setPeriod]=useState("All Time");
  const [year,setYear]=useState("All Years");
  const [month,setMonth]=useState("All Months");
  const [activeDrill,setActiveDrill]=useState(null);
  const [leads,setLeads]=useState(()=>loadPersisted("mpulse_leads",seedLeads));
  const [showLeadModal,setShowLeadModal]=useState(false);
  const [editingLead,setEditingLead]=useState(null);
  const [products,setProducts]=useState(()=>loadPersisted("mpulse_products", DEFAULT_PRODUCTS.map((name,i)=>({id:String(i+1),name}))));
  const [showProductMaster,setShowProductMaster]=useState(false);

  function nextProductId(){
    const max=products.reduce((m,p)=>Math.max(m,Number(p.id)||0),0);
    return String(max+1);
  }
  function handleAddProduct(name){ setProducts(prev=>[...prev,{id:nextProductId(),name}]); }
  function handleEditProduct(id,name){ setProducts(prev=>prev.map(p=>p.id===id?{...p,name}:p)); }
  function handleDeleteProduct(id){ setProducts(prev=>prev.filter(p=>p.id!==id)); }

const [leadSources,setLeadSources]=useState(()=>loadPersisted("mpulse_leadSources", LEAD_SOURCE_OPTIONS.map((name,i)=>({id:String(i+1),name}))));  const [showLeadSourceMaster,setShowLeadSourceMaster]=useState(false);

  function nextLeadSourceId(){
    const max=leadSources.reduce((m,s)=>Math.max(m,Number(s.id)||0),0);
    return String(max+1);
  }
  function handleAddLeadSource(name){ setLeadSources(prev=>[...prev,{id:nextLeadSourceId(),name}]); }
  function handleEditLeadSource(id,name){ setLeadSources(prev=>prev.map(s=>s.id===id?{...s,name}:s)); }
  function handleDeleteLeadSource(id){ setLeadSources(prev=>prev.filter(s=>s.id!==id)); }

  const [demos,setDemos]=useState(seedDemosList);
  const [showDemoModal,setShowDemoModal]=useState(false);
  const [editingDemo,setEditingDemo]=useState(null);
  const [trackingDemo,setTrackingDemo]=useState(null);

  function handleSaveFollowUp(entry){
    setDemos(prev=>prev.map(d=>{
      if(d.demoNo!==trackingDemo.demoNo) return d;
      const activities=[entry,...(d.activities||[])];
      return {...d,activities,nextFollowUp:entry.next||d.nextFollowUp,status:entry.next?"Follow-Up":d.status};
    }));
    setTrackingDemo(null);
  }

  function handleAddDemo(){ setEditingDemo(null); setShowDemoModal(true); }
  function handleEditDemo(demo){ setEditingDemo(demo); setShowDemoModal(true); }
  function handleDeleteDemo(demo){
    if(!window.confirm(`Delete ${demo.demoNo} (${demo.customer})? This cannot be undone.`)) return;
    setDemos(prev=>prev.filter(d=>d.demoNo!==demo.demoNo));
  }
  function handleSaveDemo(data){
    if(editingDemo){
      setDemos(prev=>prev.map(d=>d.demoNo===editingDemo.demoNo?data:d));
    } else {
      setDemos(prev=>[...prev,data]);
    }
    setEditingDemo(null);
    setShowDemoModal(false);
  }

  const [orders,setOrders]=useState(allOrders);
  const [implRecords,setImplRecords]=useState(implementationRecords);
  function handleUpdateImplPhase(customer,phaseNum,patch){
    setImplRecords(prev=>prev.map(r=>r.customer!==customer?r:{
      ...r,
      phases:r.phases.map(p=>p.phase!==phaseNum?p:{...p,...patch})
    }));
  }
  const [renewalsList,setRenewalsList]=useState(seedRenewals);
  function handleRenewContract(id,patch){
    const {historyEntry,...rest}=patch;
    setRenewalsList(prev=>prev.map(r=>r.id!==id?r:{
      ...r,...rest,
      history:[historyEntry,...(r.history||[])],
    }));
  }
  const [showOrderModal,setShowOrderModal]=useState(false);
  const [editingOrder,setEditingOrder]=useState(null);
  function handleAddOrder(){ setEditingOrder(null); setShowOrderModal(true); }
  function handleEditOrder(order){ setEditingOrder(order); setShowOrderModal(true); }
  function handleDeleteOrder(order){
    if(!window.confirm(`Delete ${order.orderNo} (${order.customer})? This cannot be undone.`)) return;
    setOrders(prev=>prev.filter(o=>o.orderNo!==order.orderNo));
  }
  function handleSaveOrder(data){
    if(editingOrder){
      setOrders(prev=>prev.map(o=>o.orderNo===editingOrder.orderNo?data:o));
    } else {
      setOrders(prev=>[...prev,data]);
    }
    setEditingOrder(null);
    setShowOrderModal(false);
  }
  function handleSetOrderStatus(order,stage){
    setOrders(prev=>prev.map(o=>o.orderNo===order.orderNo?{...o,orderStatus:stage}:o));
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
    setLeads(prev=>prev.filter(l=>l.leadNo!==lead.leadNo));
  }
  function handleSaveLead(data){
    if(editingLead){
      setLeads(prev=>prev.map(l=>l.leadNo===editingLead.leadNo?data:l));
    } else {
      setLeads(prev=>[...prev,data]);
    }
    setEditingLead(null);
  }
  function handleChangeLeadOwner(leadNos,newOwner){
    setLeads(prev=>prev.map(l=>leadNos.includes(l.leadNo)?{...l,owner:newOwner,lastModified:todayISO()}:l));
  }

  useEffect(()=>{
    try{ localStorage.setItem("mpulse_leads",JSON.stringify(leads)); }catch{}
  },[leads]);

  useEffect(()=>{
  try{ localStorage.setItem("mpulse_products",JSON.stringify(products)); }catch{}
},[products]);

useEffect(()=>{
  try{ localStorage.setItem("mpulse_leadSources",JSON.stringify(leadSources)); }catch{}
},[leadSources]);

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

  const filteredLeads=useMemo(()=>leads.filter(l=>inWindow(l.lastModified,win)),[leads,win]);
  const followUpLeadsFiltered=useMemo(()=>filteredLeads.filter(l=>l.status==="Follow Up"),[filteredLeads]);
  const filteredDemos=useMemo(()=>allDemos.filter(d=>inWindow(d.date,win)),[win]);
  const filteredOrders=useMemo(()=>orders.filter(o=>inWindow(o.date,win)),[orders,win]);
  const filteredGoLive=useMemo(()=>implementations.filter(im=>inWindow(im.goLiveDate,win)),[win]);

  const totalOrderValue=useMemo(()=>filteredOrders.reduce((s,o)=>s+parseRupee(o.value),0),[filteredOrders]);
  const paymentReceived=useMemo(()=>filteredOrders.reduce((s,o)=>s+parseRupee(o.paid),0),[filteredOrders]);
  const outstandingPayment=useMemo(()=>filteredOrders.reduce((s,o)=>s+parseRupee(o.outstanding),0),[filteredOrders]);
  const outstandingCount=useMemo(()=>filteredOrders.filter(o=>parseRupee(o.outstanding)>0).length,[filteredOrders]);

  const kpiRow1=[
    {label:"Total Leads",value:String(filteredLeads.length),sub:win.label,accent:"#4f46e5",icon:"🎯",drillKey:"totalLeads"},
    {label:"Follow-up Leads",value:String(followUpLeadsFiltered.length),sub:"Pending action",accent:"#d97706",icon:"📞",drillKey:"followUpLeads"},
    {label:"Demos Conducted",value:String(filteredDemos.length),sub:win.label,accent:"#4f46e5",icon:"🖥️",drillKey:"demosConducted"},
    {label:"Overdue Follow-ups",value:String(demoFollowUps.length),sub:"Need action now",accent:"#dc2626",icon:"⚠️",drillKey:"overdueFollowUps"},
  ];
  const kpiRow2=[
    {label:"Active Go-Live",value:String(filteredGoLive.length),sub:"Implementations",accent:"#059669",icon:"🚀",drillKey:"activeGoLive"},
    {label:"Total Order Value",value:money(totalOrderValue),sub:win.label,accent:"#059669",icon:"💰",drillKey:"orders"},
    {label:"Payment Received",value:money(paymentReceived),sub:win.label,accent:"#059669",icon:"✅",drillKey:"orders"},
    {label:"Outstanding Payment",value:money(outstandingPayment),sub:outstandingCount+" orders pending",accent:"#dc2626",icon:"🧾",drillKey:"orders"},
    {label:"Renewals Due",value:"0",sub:"0 overdue · 0 due soon",accent:"#6b7280",icon:"🔄",drillKey:"renewalsDue"},
  ];

  const drillConfigs={
    totalLeads:{title:"All Leads",icon:"🎯",data:filteredLeads,columns:[
      {header:"Lead No",cell:l=>"Lead - "+l.leadNo,style:{color:"#2563eb",fontWeight:700}},
      {header:"Customer",cell:l=>l.customer,style:{fontWeight:600}},
      {header:"Owner",cell:l=>l.owner},
      {header:"Status",cell:l=><StatusPill label={l.status}/>},
      {header:"Products",cell:l=><ProductPill label={l.product}/>},
      {header:"Last Modified",cell:l=>l.lastModified,style:{color:"#6b7280"}},
    ]},
    followUpLeads:{title:"Follow-up Leads",icon:"📞",data:followUpLeadsFiltered,columns:[
      {header:"Lead No",cell:l=>"Lead - "+l.leadNo,style:{color:"#2563eb",fontWeight:700}},
      {header:"Customer",cell:l=>l.customer,style:{fontWeight:600}},
      {header:"Owner",cell:l=>l.owner},
      {header:"Products",cell:l=><ProductPill label={l.product}/>},
      {header:"Last Modified",cell:l=>l.lastModified,style:{color:"#6b7280"}},
    ]},
    demosConducted:{title:"All Demos",icon:"🖥️",data:filteredDemos,columns:[
      {header:"Customer",cell:d=>d.customer,style:{fontWeight:600}},
      {header:"Demo No",cell:d=>d.demoNo,style:{color:"#2563eb",fontWeight:700}},
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
      {header:"Phase",cell:im=>im.phase+" of 3"},
      {header:"Go-Live Date",cell:im=>im.goLiveDate,style:{color:"#6b7280"}},
    ]},
    orders:{title:"Orders",icon:"💰",data:filteredOrders,columns:[
      {header:"Order No",cell:o=>o.orderNo,style:{color:"#2563eb",fontWeight:700}},
      {header:"Customer",cell:o=>o.customer,style:{fontWeight:600}},
      {header:"Product",cell:o=><ProductPill label={o.product}/>},
      {header:"Value",cell:o=>o.value,style:{fontWeight:700}},
      {header:"Paid",cell:o=>o.paid,style:{color:"#059669"}},
      {header:"Outstanding",cell:o=>o.outstanding,style:{color:"#dc2626"}},
      {header:"Status",cell:o=><StatusPill label={o.status}/>},
      {header:"Date",cell:o=>o.date,style:{color:"#6b7280"}},
    ]},
    renewalsDue:{title:"Renewals Due",icon:"🔄",data:[],columns:[
      {header:"Customer",cell:r=>r.customer},
      {header:"Product",cell:r=>r.product},
      {header:"Contract End",cell:r=>r.contractEnd},
      {header:"Days Left",cell:r=>r.daysLeft},
    ]},
  };

  return(
    <div style={{fontFamily:"system-ui, -apple-system, sans-serif"}}>
      <div style={{display:"flex",gap:0,marginBottom:16,background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:3,boxShadow:"0 1px 3px rgba(0,0,0,.05)",flexWrap:"wrap"}}>
        {tabs.map(t=>{
          const active=tab===t;
          return(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"9px 18px",borderRadius:7,border:"none",background:active?"#4f46e5":"transparent",color:active?"#fff":"#6b7280",fontSize:13,fontWeight:active?700:500,cursor:"pointer",whiteSpace:"nowrap"}}>
              {t}
            </button>
          );
        })}
      </div>

      {tab==="Dashboard"&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:600,color:"#374151",display:"flex",alignItems:"center",gap:6}}>📅 Period:</span>
            {["All Time","This Month","Last Month","This Year"].map(p=>(
              <button key={p} onClick={()=>pickQuick(p)} style={{padding:"7px 14px",borderRadius:7,border:"1px solid "+(period===p?"#4f46e5":"#d1d5db"),background:period===p?"#4f46e5":"#fff",color:period===p?"#fff":"#374151",fontSize:12,fontWeight:600,cursor:"pointer"}}>{p}</button>
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
                <div style={{fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>📅 Demo Follow-up Action Centre</div>
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
              <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>📊 Sales Pipeline</div>
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
                  <div style={{fontSize:22,fontWeight:800,color:"#2563eb"}}>20%</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>🎯 Leads – Follow-Up Required ({followUpLeadsFiltered.length})</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Lead No","Customer","Owner","Product","Last Modified"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {followUpLeadsFiltered.map(l=>(
                      <tr key={l.leadNo}>
                        <td style={{...tdStyle,color:"#2563eb",fontWeight:700}}>Lead - {l.leadNo}</td>
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
              <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>🚀 Implementation Status ({implementations.length} active)</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Customer","Product","Progress","Phases"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {implementations.map(im=>(
                      <tr key={im.customer}>
                        <td style={{...tdStyle,fontWeight:600}}>{im.customer}</td>
                        <td style={tdStyle}><ProductPill label={im.product}/></td>
                        <td style={tdStyle}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:60,height:6,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}>
                              <div style={{height:"100%",width:im.progress+"%",background:"#4f46e5",borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>{im.progress}%</span>
                          </div>
                        </td>
                        <td style={tdStyle}><PhaseStepper phase={im.phase}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{...cardStyle,padding:0,overflow:"hidden",marginBottom:20}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>🔄 Contract Renewals Status</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Customer","Product","Contract End","Days Left","Renewal Status","Value","Last Renewed"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {renewals.map(r=>(
                    <tr key={r.customer}>
                      <td style={{...tdStyle,fontWeight:600}}>{r.customer}</td>
                      <td style={tdStyle}><ProductPill label={r.product}/></td>
                      <td style={{...tdStyle,color:"#6b7280"}}>{r.contractEnd}</td>
                      <td style={tdStyle}><span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:"#ecfdf5",color:"#059669"}}>{r.daysLeft}</span></td>
                      <td style={tdStyle}><StatusPill label={r.status}/></td>
                      <td style={{...tdStyle,fontWeight:700,color:"#059669"}}>{r.value}</td>
                      <td style={{...tdStyle,color:"#6b7280"}}>{r.lastRenewed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f2f5",fontSize:14,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:8}}>🕐 Recent Demo Activity</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Customer","Demo No","Outcome","Date","Remarks","By"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {recentDemos.map((d,i)=>(
                    <tr key={i}>
                      <td style={{...tdStyle,fontWeight:600}}>{d.customer}</td>
                      <td style={{...tdStyle,color:"#2563eb",fontWeight:700}}>{d.demoNo}</td>
                      <td style={tdStyle}><StatusPill label={d.outcome}/></td>
                      <td style={{...tdStyle,color:"#6b7280"}}>{d.date}</td>
                      <td style={{...tdStyle,color:"#4b5563",maxWidth:280}}>{d.remarks}</td>
                      <td style={tdStyle}>{d.by}</td>
                    </tr>
                  ))}
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
          onChangeOwner={handleChangeLeadOwner}/>
      )}

      {tab==="Demos"&&(
        <DemosTab demos={demos} onAddNew={handleAddDemo} onEdit={handleEditDemo} onDelete={handleDeleteDemo}
          onTrack={(demo)=>setTrackingDemo(demo)}/>
      )}

      {tab==="Orders"&&(
        <OrdersTab orders={orders} onAddNew={handleAddOrder} onEdit={handleEditOrder} onDelete={handleDeleteOrder} onSetStatus={handleSetOrderStatus}/>
      )}

      {tab==="Implementation"&&(
        <ImplementationTab records={implRecords} onUpdatePhase={handleUpdateImplPhase}/>
      )}

      {tab==="Renewals"&&(
        <RenewalsTab renewals={renewalsList} onRenew={handleRenewContract}/>
      )}

      {tab==="Reports"&&(
        <ReportsTab leads={leads} demos={demos} orders={orders}/>
      )}

      {showLeadModal&&(
        <LeadModal
          onClose={()=>{setShowLeadModal(false);setEditingLead(null);}}
          onSave={handleSaveLead}
          nextLeadNumber={nextLeadNo(leads)}
          initial={editingLead}
          productOptions={products.map(p=>p.name)}
          leadSourceOptions={leadSources.map(s=>s.name)}
        />
      )}

      {showProductMaster&&(
        <ProductMasterModal
          products={products}
          leadCounts={productLeadCounts}
          onClose={()=>setShowProductMaster(false)}
          onAdd={handleAddProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />
      )}

      {showLeadSourceMaster&&(
        <LeadSourceMasterModal
          sources={leadSources}
          leadCounts={leadSourceCounts}
          onClose={()=>setShowLeadSourceMaster(false)}
          onAdd={handleAddLeadSource}
          onEdit={handleEditLeadSource}
          onDelete={handleDeleteLeadSource}
        />
      )}

      {showDemoModal&&(
        <DemoModal
          onClose={()=>{setShowDemoModal(false);setEditingDemo(null);}}
          onSave={handleSaveDemo}
          nextDemoNumber={nextDemoNo(demos)}
          initial={editingDemo}
          productOptions={products.map(p=>p.name)}
          ownerOptions={OWNER_OPTIONS}
          customerOptions={Array.from(new Set([...leads.map(l=>l.customer),...demos.map(d=>d.customer)])).sort()}
        />
      )}

      {trackingDemo&&(
        <AddFollowUpModal
          demo={trackingDemo}
          onClose={()=>setTrackingDemo(null)}
          onSave={handleSaveFollowUp}
          ownerOptions={OWNER_OPTIONS}
        />
      )}

      {showOrderModal&&(
        <OrderModal
          onClose={()=>{setShowOrderModal(false);setEditingOrder(null);}}
          onSave={handleSaveOrder}
          nextOrderNumber={nextOrderNo(orders)}
          initial={editingOrder}
          productOptions={products.map(p=>p.name)}
          ownerOptions={OWNER_OPTIONS}
          customerOptions={Array.from(new Set([...leads.map(l=>l.customer),...demos.map(d=>d.customer),...orders.map(o=>o.customer)])).sort()}
        />
      )}
    </div>
  );
}