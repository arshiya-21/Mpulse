import { visitDisplayStatus } from "./shared.jsx";

// ─── helpers ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Completed:  "#1A5276",
  "In Progress": "#2980B9",
  Planned:    "#5499C7",
  Overdue:    "#85C1E9",
  Cancelled:  "#AED6F1",
};

const CHANNEL_ICON = {"Email":"📧","WhatsApp":"💬","Phone Call":"📞","SMS":"📱","On-Site Request":"🏢"};
const CHANNEL_COLOR = {"Email":"#1A5276","WhatsApp":"#2980B9","Phone Call":"#5499C7","SMS":"#85C1E9","On-Site Request":"#AED6F1"};

function Legend(){
  return(
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:10,paddingTop:10,borderTop:"1px solid #f0f2f5"}}>
      {Object.entries(STATUS_COLORS).map(([k,c])=>(
        <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{width:9,height:9,borderRadius:2,background:c,display:"inline-block"}}/>
          <span style={{fontSize:11,color:"#6b7280",fontWeight:500}}>{k}</span>
        </div>
      ))}
    </div>
  );
}

function Card({title,icon,children,style}){
  return(
    <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)",padding:"16px 18px",...style}}>
      <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14,display:"flex",alignItems:"center",gap:7}}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

// stacked segment bar for a single row (assignee)
function StackedBar({segments,total}){
  return(
    <div style={{display:"flex",width:"100%",height:8,borderRadius:5,overflow:"hidden",background:"#f0f2f5"}}>
      {segments.map((s,i)=> s.value>0 && (
        <div key={i} style={{width:`${(s.value/total)*100}%`,background:s.color,transition:"width .3s"}}/>
      ))}
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────
export default function VisitAnalysis({visits,employees,customers}){

  visits    = visits    || [];
  employees = employees || [];
  customers = customers || [];

  const withComputed = visits.map(v=>({...v, _status: visitDisplayStatus(v) }));

  // KPIs
  const kpi = {
    total:     visits.length,
    planned:   withComputed.filter(v=>v._status==="Planned").length,
    inprog:    withComputed.filter(v=>v._status==="In Progress").length,
    done:      withComputed.filter(v=>v._status==="Completed").length,
    overdue:   withComputed.filter(v=>v._status==="Overdue").length,
    cancelled: withComputed.filter(v=>v._status==="Cancelled").length,
  };
  const kpis=[
    {label:"Total",       value:kpi.total,     icon:"🗂️",accent:"#1A5276",bg:"#eaf2f8"},
    {label:"Planned",     value:kpi.planned,   icon:"📅",accent:"#5499C7",bg:"#eaf2f8"},
    {label:"In Progress", value:kpi.inprog,    icon:"🚗",accent:"#2980B9",bg:"#eaf2f8"},
    {label:"Completed",   value:kpi.done,      icon:"✅",accent:"#1A5276",bg:"#eaf2f8"},
    {label:"Overdue",     value:kpi.overdue,   icon:"⚠️",accent:"#85C1E9",bg:"#eaf2f8"},
    {label:"Cancelled",   value:kpi.cancelled, icon:"🚫",accent:"#AED6F1",bg:"#eaf2f8"},
  ];

  // Visits by Assignee
  const byAssignee = {};
  withComputed.forEach(v=>{
    const name = v.assigned_to_name || "Unassigned";
    if(!byAssignee[name]) byAssignee[name]={Completed:0,"In Progress":0,Planned:0,Overdue:0,Cancelled:0,total:0};
    byAssignee[name][v._status] = (byAssignee[name][v._status]||0)+1;
    byAssignee[name].total++;
  });
  const assigneeRows = Object.entries(byAssignee).sort((a,b)=>b[1].total-a[1].total);

  // Visit Status Distribution
  const statusDist = ["Planned","In Progress","Completed","Overdue","Cancelled"]
    .map(s=>({status:s,count:withComputed.filter(v=>v._status===s).length}))
    .filter(s=>s.count>0);
  const maxStatusCount = Math.max(1,...statusDist.map(s=>s.count));

  // Visit Frequency by Customer
  const byCustomer = {};
  visits.forEach(v=>{
    const name = v.customer_name || "—";
    byCustomer[name] = (byCustomer[name]||0)+1;
  });
  const custRows = Object.entries(byCustomer).sort((a,b)=>b[1]-a[1]);
  const maxCustCount = Math.max(1,...custRows.map(r=>r[1]));
  const CUST_BAR_COLORS = ["#1A5276","#2980B9","#5499C7","#85C1E9","#AED6F1"];

  // Request Channel Breakdown
  const byChannel = {};
  visits.forEach(v=>{ byChannel[v.channel] = (byChannel[v.channel]||0)+1; });
  const chanRows = Object.entries(byChannel).sort((a,b)=>b[1]-a[1]);
  const totalChan = visits.length || 1;

  // Assignee Performance Summary
  const perfRows = assigneeRows.map(([name,s])=>({
    name,
    total: s.total,
    completed: s.Completed||0,
    inprog: s["In Progress"]||0,
    planned: s.Planned||0,
    overdue: s.Overdue||0,
    cancelled: s.Cancelled||0,
    pct: s.total ? Math.round(((s.Completed||0)/s.total)*100) : 0,
  }));

  return(
    <div>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:14}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,padding:"14px 16px",boxShadow:"0 1px 2px rgba(0,0,0,.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <div style={{width:26,height:26,borderRadius:7,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{k.icon}</div>
              <span style={{fontSize:12,color:"#6b7280",fontWeight:600}}>{k.label}</span>
            </div>
            <div style={{fontSize:26,fontWeight:700,color:k.accent,lineHeight:1.1}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Card title="Visits by Assignee" icon="👤">
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {assigneeRows.map(([name,s])=>{
              const pctDone = s.total ? Math.round(((s.Completed||0)/s.total)*100) : 0;
              const segments=[
                {value:s.Completed,color:STATUS_COLORS.Completed},
                {value:s["In Progress"],color:STATUS_COLORS["In Progress"]},
                {value:s.Planned,color:STATUS_COLORS.Planned},
                {value:s.Overdue,color:STATUS_COLORS.Overdue},
                {value:s.Cancelled,color:STATUS_COLORS.Cancelled},
              ];
              return(
                <div key={name}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:"#1A5276",color:"#AED6F1",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{name[0]}</div>
                      <span style={{fontSize:13,fontWeight:600,color:"#111827"}}>{name}</span>
                    </div>
                    <span style={{fontSize:12,color:"#6b7280"}}>{s.total} visits · <strong style={{color:"#059669"}}>{pctDone}% done</strong></span>
                  </div>
                  <StackedBar segments={segments} total={s.total}/>
                  {s.Overdue>0 && <div style={{fontSize:11,color:"#d97706",marginTop:4,fontWeight:600}}>⚠️ {s.Overdue} overdue</div>}
                </div>
              );
            })}
            {assigneeRows.length===0 && <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:10}}>No data</div>}
          </div>
          <Legend/>
        </Card>

        <Card title="Visit Status Distribution" icon="📊">
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {statusDist.map(s=>(
              <div key={s.status}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{s.status}</span>
                  <span style={{fontSize:13,fontWeight:700,color:STATUS_COLORS[s.status]}}>{s.count} ({Math.round((s.count/(visits.length||1))*100)}%)</span>
                </div>
                <div style={{width:"100%",height:8,borderRadius:5,background:"#f0f2f5",overflow:"hidden"}}>
                  <div style={{width:`${(s.count/maxStatusCount)*100}%`,height:"100%",background:STATUS_COLORS[s.status],borderRadius:5,transition:"width .3s"}}/>
                </div>
              </div>
            ))}
            {statusDist.length===0 && <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:10}}>No data</div>}
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Card title="Visit Frequency by Customer" icon="🏢">
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {custRows.map(([name,count],i)=>(
              <div key={name}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:"#374151",fontWeight:500}}>{name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:CUST_BAR_COLORS[i%CUST_BAR_COLORS.length]}}>{count}</span>
                </div>
                <div style={{width:"100%",height:6,borderRadius:4,background:"#f0f2f5",overflow:"hidden"}}>
                  <div style={{width:`${(count/maxCustCount)*100}%`,height:"100%",background:CUST_BAR_COLORS[i%CUST_BAR_COLORS.length],borderRadius:4}}/>
                </div>
              </div>
            ))}
            {custRows.length===0 && <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:10}}>No data</div>}
          </div>
        </Card>

        <Card title="Request Channel Breakdown" icon="📡">
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {chanRows.map(([ch,count])=>(
              <div key={ch}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:"#374151",fontWeight:500}}>{CHANNEL_ICON[ch]||"📋"} {ch}</span>
                  <span style={{fontSize:12,fontWeight:700,color:CHANNEL_COLOR[ch]||"#4f46e5"}}>{count} ({Math.round((count/totalChan)*100)}%)</span>
                </div>
                <div style={{width:"100%",height:6,borderRadius:4,background:"#f0f2f5",overflow:"hidden"}}>
                  <div style={{width:`${(count/totalChan)*100}%`,height:"100%",background:CHANNEL_COLOR[ch]||"#4f46e5",borderRadius:4}}/>
                </div>
              </div>
            ))}
            {chanRows.length===0 && <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:10}}>No data</div>}
          </div>
        </Card>
      </div>

      {/* Assignee Performance Summary */}
      <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
        <div style={{padding:"14px 18px",fontSize:14,fontWeight:700,color:"#111827",borderBottom:"1px solid #f0f2f5",display:"flex",alignItems:"center",gap:7}}>
          📋 Assignee Performance Summary
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"#f8f9fb"}}>
              {["Employee","Total","Completed","In Progress","Planned","Overdue","Cancelled","Completion %"].map(h=>(
                <th key={h} style={{padding:"10px 14px",textAlign:h==="Employee"?"left":"center",fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",borderBottom:"1px solid #e4e7ec",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {perfRows.map(r=>(
                <tr key={r.name}>
                  <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:"#1A5276",color:"#AED6F1",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{r.name[0]}</div>
                      <span style={{fontWeight:600,color:"#111827"}}>{r.name}</span>
                    </div>
                  </td>
                  <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",textAlign:"center",fontWeight:700,color:"#4f46e5"}}>{r.total}</td>
                  <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",textAlign:"center"}}>
                    <span style={{padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:"#eaf2f8",color:"#1A5276"}}>{r.completed}</span>
                  </td>
                  <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",textAlign:"center"}}>
                    <span style={{padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:"#eaf2f8",color:"#2980B9"}}>{r.inprog}</span>
                  </td>
                  <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",textAlign:"center"}}>
                    <span style={{padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:"#eaf2f8",color:"#5499C7"}}>{r.planned}</span>
                  </td>
                  <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",textAlign:"center"}}>
                    {r.overdue>0
                      ?<span style={{padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:"#eaf2f8",color:"#85C1E9"}}>⚠️ {r.overdue}</span>
                      :<span style={{color:"#d1d5db"}}>—</span>}
                  </td>
                  <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5",textAlign:"center",color:r.cancelled>0?"#64748b":"#d1d5db"}}>{r.cancelled>0?r.cancelled:"—"}</td>
                  <td style={{padding:"11px 14px",borderBottom:"1px solid #f0f2f5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:6,borderRadius:4,background:"#f0f2f5",overflow:"hidden",minWidth:60}}>
                        <div style={{width:`${r.pct}%`,height:"100%",background:r.pct>=70?"#1A5276":r.pct>=40?"#2980B9":"#85C1E9",borderRadius:4}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:"#111827",width:34,textAlign:"right"}}>{r.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {perfRows.length===0 && <tr><td colSpan={8} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}