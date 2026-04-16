import { useState, useEffect } from "react";
import * as settingsApi from "../api/settings.js";
import { useToast, Toast, Spinner, inputS, labelS } from "./shared.jsx";

export default function Administration(){
  const [s,setS]=useState({company_name:"",daily_target_mins:510,work_days:"Mon–Fri",timezone:"Asia/Kolkata",tat_alert_days:2,email_notif:true,auto_close:false,session_timeout:30});
  const [loading,setLoading]=useState(true);
  const {msg,show}=useToast();

  useEffect(()=>{
    settingsApi.get().then(r=>setS(prev=>({...prev,...(r.data||{})}))).catch(()=>show("Failed to load settings")).finally(()=>setLoading(false));
  },[]);

  async function save(){
    try{await settingsApi.update(s);show("Settings saved successfully");}
    catch{show("Save failed");}
  }

  function Toggle({label,k}){
    return(
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f0f2f5"}}>
        <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{label}</div>
        <div onClick={()=>setS(prev=>({...prev,[k]:!prev[k]}))} style={{width:40,height:22,borderRadius:11,background:s[k]?"#4f46e5":"#eef0f4",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0,border:"1px solid #e4e7ec"}}>
          <div style={{position:"absolute",top:2,left:s[k]?20:2,width:16,height:16,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"left .2s"}}/>
        </div>
      </div>
    );
  }

  if(loading)return <Spinner/>;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:18}}>
        <button onClick={save} style={{padding:"8px 14px",borderRadius:6,border:"none",background:"#4f46e5",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Save Changes</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}><span style={{fontSize:13,fontWeight:700}}>🏢 Company Settings</span></div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Company Name</label><input value={s.company_name||""} onChange={e=>setS(p=>({...p,company_name:e.target.value}))} style={inputS}/></div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Timezone</label>
              <select value={s.timezone} onChange={e=>setS(p=>({...p,timezone:e.target.value}))} style={inputS}>
                {["Asia/Kolkata","Asia/Dubai","UTC","America/New_York"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Working Days</label>
              <select value={s.work_days} onChange={e=>setS(p=>({...p,work_days:e.target.value}))} style={inputS}>
                {["Mon–Fri","Mon–Sat","Sun–Thu"].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}><span style={{fontSize:13,fontWeight:700}}>⚡ KPI Configuration</span></div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>Daily Target Minutes</label>
              <input type="number" value={s.daily_target_mins} min={60} max={720} onChange={e=>setS(p=>({...p,daily_target_mins:+e.target.value}))} style={inputS}/>
              <span style={{fontSize:12,color:"#9ca3af"}}>{(s.daily_target_mins/60).toFixed(1)} hours/day</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={labelS}>TAT Alert Threshold (days)</label>
              <input type="number" value={s.tat_alert_days} min={1} max={30} onChange={e=>setS(p=>({...p,tat_alert_days:+e.target.value}))} style={inputS}/>
            </div>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}><span style={{fontSize:13,fontWeight:700}}>🔔 Notifications</span></div>
          <div style={{padding:16}}>
            <Toggle label="Auto-close Projects" k="auto_close"/>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e4e7ec",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #f0f2f5"}}><span style={{fontSize:13,fontWeight:700}}>🔒 Security</span></div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={labelS}>Session Timeout</label>
              <select value={s.session_timeout} onChange={e=>setS(p=>({...p,session_timeout:+e.target.value}))} style={inputS}>
                <option value={0}>No timeout</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option>
              </select>
            </div>
            <div style={{padding:"8px 12px",borderRadius:6,background:"#fffbeb",border:"1px solid #fde68a",fontSize:12,color:"#d97706"}}>⚠️ Password policy: min 8 chars, 1 uppercase, 1 number</div>
          </div>
        </div>
      </div>
      <Toast msg={msg}/>
    </div>
  );
}
