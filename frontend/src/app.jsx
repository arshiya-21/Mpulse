import { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth }           from "./context/AuthContext.jsx";
import SetPassword           from "./SetPassword.jsx";
import * as authApi          from "./api/auth.js";
import FirstTimePasswordReset from './FirstTimePasswordReset.jsx';

function AccessDenied(){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:12}}>
      <div style={{fontSize:40}}>🔒</div>
      <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>Access Restricted</div>
      <div style={{fontSize:13,color:"#9ca3af"}}>You don't have permission to view this page.</div>
    </div>
  );
}

import Dashboard      from "./components/Dashboard.jsx";
import DailyTasks     from "./components/DailyTasks.jsx";
import CustomerVisits from "./components/CustomerVisits.jsx";
import Projects       from "./components/Projects.jsx";
import MasterData     from "./components/MasterData.jsx";
import Reports        from "./components/Reports.jsx";
import Administration from "./components/Administration.jsx";
import Library        from "./components/Library.jsx";
import { getAccessConfig, ACCESS_KEY } from "./components/MasterData.jsx";
import * as permApi from "./api/permissions.js";

// ─── NAV ICONS ────────────────────────────────────────────────────────────────
const icons={
  dashboard: a=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#fff":"#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  worklog:   a=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#fff":"#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
  visits:    a=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#fff":"#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  projects:  a=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#fff":"#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  masterdata:a=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#fff":"#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  reports:   a=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#fff":"#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  admin:     a=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#fff":"#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  library:   a=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#fff":"#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>,
};
const NAV=[
  {key:"dashboard", label:"Dashboard",      path:"/dashboard"},
  {key:"worklog",   label:"Worklog",         path:"/worklog"},
  {key:"visits",    label:"Customer Visits", path:"/visits"},
  {key:"projects",  label:"Projects",        path:"/projects"},
  {key:"masterdata",label:"Master Data",     path:"/masterdata"},
  {key:"reports",   label:"Reports",         path:"/reports"},
  {key:"admin",     label:"Administration",  path:"/admin"},
  {key:"library",   label:"Library",         path:"/library"},
];
const TITLES={"/dashboard":"Dashboard","/worklog":"Worklog","/masterdata":"Master Data","/projects":"Projects","/visits":"Customer Visits","/reports":"Reports & Exports","/admin":"Administration","/library":"Library"};

// ─── SHELL ─────────────────────────────────────────────────────────────────────
function Shell({user,onLogout}){
  const [collapsed,setCollapsed]=useState(false);
  const [cfgVer,setCfgVer]=useState(0);
  const navigate=useNavigate();
  const location=useLocation();

  // Listen for local access-change events (fired by AccessConfig save)
  useEffect(()=>{
    const handler=()=>setCfgVer(v=>v+1);
    window.addEventListener("mpulse-access-change",handler);
    return()=>window.removeEventListener("mpulse-access-change",handler);
  },[]);

  // Sync permissions from DB → localStorage whenever the tab gains focus
  // so nav updates automatically for ALL users when admin changes their role's access
  useEffect(()=>{
    const CACHE_KEY = "mpulse_perms_cache";
    async function syncPerms(){
      try{
        const r = await permApi.get();
        const newStr = JSON.stringify(r.data);
        const cached = sessionStorage.getItem(CACHE_KEY);
        if(newStr !== cached){
          sessionStorage.setItem(CACHE_KEY, newStr);
          // Always force Admin to see all departments regardless of DB value
          const parsed = JSON.parse(newStr);
          if(parsed["Admin"]) parsed["Admin"]._team_only = {view:false,create:false,update:false,delete:false};
          localStorage.setItem(ACCESS_KEY, JSON.stringify(parsed));
          window.dispatchEvent(new Event("mpulse-access-change"));
        }
      }catch{ /* silent — don't break the app if the request fails */ }
    }
    syncPerms(); // run immediately on mount (login)
    window.addEventListener("focus", syncPerms);
    return()=>window.removeEventListener("focus", syncPerms);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const accessCfg=useMemo(()=>getAccessConfig(),[cfgVer]);
  const defaultPath=useMemo(()=>{
    const first=NAV.find(n=>accessCfg[user.role]?.[n.key]?.view);
    return first?.path||"/worklog";
  },[accessCfg,user.role]);
  const activePath=location.pathname==="/"?defaultPath:location.pathname;
  const activeKey=NAV.find(n=>n.path===activePath)?.key||"dashboard";
  const visibleNav=NAV.filter(item=>accessCfg[user.role]?.[item.key]?.view??false);
  const title=TITLES[activePath]||"Dashboard";
  const sideW=collapsed?58:210;

  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"#f4f6f9",fontFamily:"system-ui,sans-serif",fontSize:14,color:"#111827"}}>
      <div style={{width:sideW,minWidth:sideW,background:"#0f1117",display:"flex",flexDirection:"column",flexShrink:0,transition:"width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)",overflow:"hidden"}}>
        <div style={{padding:collapsed?"16px 0":"16px 14px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {!collapsed?(
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0,width:"100%"}}>
              <div style={{width:32,height:32,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:"0 4px 12px rgba(79,70,229,0.35)",flexShrink:0}}>✅</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#f9fafb",whiteSpace:"nowrap"}}>MPulse</div>
                <div style={{fontSize:10,color:"#4b5563",marginTop:1,whiteSpace:"nowrap"}}>Work · Pulse · Intelligence</div>
              </div>
            </div>
          ):(
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>✅</div>
          )}
        </div>
        <div style={{padding:collapsed?"6px 0":"4px 10px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:collapsed?"center":"flex-end",flexShrink:0}}>
          <button onClick={()=>setCollapsed(!collapsed)} style={{background:"none",border:"none",cursor:"pointer",padding:"5px 7px",borderRadius:6,color:"#4b5563",display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.color="#9ca3af";}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#4b5563";}}>
            {collapsed?(
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            ):(
              <><span style={{fontSize:11,fontWeight:500,color:"inherit",whiteSpace:"nowrap"}}>Collapse</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg></>
            )}
          </button>
        </div>
        <div style={{flex:1,padding:collapsed?"10px 0":"10px 8px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto",overflowX:"hidden"}}>
          {visibleNav.map(item=>{
            const isActive=activeKey===item.key;
            return(
              <div key={item.key} onClick={()=>navigate(item.path)} title={collapsed?item.label:""}
                style={{display:"flex",alignItems:"center",gap:collapsed?0:11,padding:collapsed?"10px 0":"10px 12px",justifyContent:collapsed?"center":"flex-start",borderRadius:8,cursor:"pointer",userSelect:"none",position:"relative",background:isActive?"#4f46e5":"transparent",transition:"background 0.15s",margin:collapsed?"0 6px":"0"}}
                onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                {isActive&&!collapsed&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:18,background:"#a5b4fc",borderRadius:"0 3px 3px 0"}}/>}
                <div style={{flexShrink:0,opacity:isActive?1:0.65}}>{icons[item.key]?.(isActive)}</div>
                {!collapsed&&<span style={{fontSize:13,fontWeight:isActive?600:400,color:isActive?"#fff":"#9ca3af",whiteSpace:"nowrap"}}>{item.label}</span>}
              </div>
            );
          })}
        </div>
        <div style={{padding:collapsed?"10px 0":"10px 12px",borderTop:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
          {collapsed?(
            <div style={{display:"flex",justifyContent:"center"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#312e81,#4f46e5)",color:"#c7d2fe",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} title={user.name}>{user.name[0].toUpperCase()}</div>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#312e81,#4f46e5)",color:"#c7d2fe",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{user.name[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"#e5e7eb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
                <div style={{fontSize:10,color:"#4b5563",marginTop:1}}>{user.role}</div>
              </div>
              <button onClick={onLogout} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 5px",borderRadius:5,color:"#4b5563",display:"flex",alignItems:"center",flexShrink:0}}
                onMouseEnter={e=>{e.currentTarget.style.color="#9ca3af";e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.color="#4b5563";e.currentTarget.style.background="none";}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <div style={{height:52,background:"#fff",borderBottom:"1px solid #e4e7ec",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:3,height:18,background:"#4f46e5",borderRadius:2}}/>
            <span style={{fontSize:15,fontWeight:700,color:"#111827",letterSpacing:"-0.02em"}}>{title}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"#f8f9fb",borderRadius:8,padding:"5px 10px",border:"1px solid #e4e7ec"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"#312e81",color:"#a5b4fc",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{user.name[0]}</div>
              <span style={{fontSize:12,color:"#374151",fontWeight:500}}>{user.name}</span>
              <span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:"#ede9fe",color:"#5b21b6",fontWeight:600}}>{user.role}</span>
            </div>
            <button onClick={onLogout} style={{padding:"5px 12px",fontSize:12,borderRadius:6,border:"1px solid #e4e7ec",background:"#fff",color:"#6b7280",cursor:"pointer",fontWeight:500}}>Sign out</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
          <Routes>
            <Route path="/dashboard"  element={accessCfg[user.role]?.dashboard?.view ?<Dashboard/>     :<AccessDenied/>}/>
            <Route path="/worklog"    element={accessCfg[user.role]?.worklog?.view   ?<DailyTasks/>    :<AccessDenied/>}/>
            <Route path="/visits"     element={accessCfg[user.role]?.visits?.view    ?<CustomerVisits/>:<AccessDenied/>}/>
            <Route path="/projects"   element={accessCfg[user.role]?.projects?.view  ?<Projects/>      :<AccessDenied/>}/>
            <Route path="/masterdata" element={accessCfg[user.role]?.masterdata?.view?<MasterData/>    :<AccessDenied/>}/>
            <Route path="/reports"    element={accessCfg[user.role]?.reports?.view   ?<Reports/>       :<AccessDenied/>}/>
            <Route path="/admin"      element={accessCfg[user.role]?.admin?.view     ?<Administration/>:<AccessDenied/>}/>
            <Route path="/library"    element={accessCfg[user.role]?.library?.view   ?<Library/>       :<AccessDenied/>}/>
            <Route path="*"           element={<Navigate to={defaultPath} replace/>}/>
          </Routes>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [userName, setUserName] = useState('');

  async function go(){
    if(!email||!pw){setErr("Please enter your email and password.");return;}
    setErr("");setLoading(true);
    try{
      const r=await authApi.login(email,pw);
      if (r.data.requirePasswordReset) {
        setResetToken(r.data.resetToken);
        setUserName(r.data.user.name);
        setShowPasswordReset(true);
        setLoading(false);
        return;
      }
      onLogin(r.data.user,r.data.token);
    }catch(e){
      setErr(e?.response?.data?.error||"Invalid email or password.");
    }finally{setLoading(false);}
  }

  function handlePasswordResetSuccess(response) {
    onLogin(response.data.user, response.data.token);
  }

  if (showPasswordReset) {
    return <FirstTimePasswordReset resetToken={resetToken} userName={userName} onSuccess={handlePasswordResetSuccess}/>;
  }

  const iS={width:"100%",padding:"10px 13px",fontSize:14,border:"1px solid rgba(255,255,255,0.14)",borderRadius:6,background:"rgba(255,255,255,0.07)",color:"#f9fafb",outline:"none",fontFamily:"system-ui,sans-serif"};
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0f1a 0%,#1a1040 40%,#0f172a 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif"}}>
      <div>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,borderRadius:14,background:"rgba(79,70,229,0.6)",border:"1px solid rgba(129,140,248,0.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:22,boxShadow:"0 8px 24px rgba(79,70,229,0.4)"}}>✅</div>
          <div style={{fontSize:26,fontWeight:700,color:"#f9fafb",letterSpacing:"-0.02em"}}>MPulse</div>
          <div style={{fontSize:13,color:"#818cf8",marginTop:4}}>Project Management & Analysis</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"36px 32px",width:400,boxShadow:"0 32px 80px rgba(0,0,0,0.4)"}}>
          <div style={{fontSize:17,fontWeight:700,color:"#e0e7ff",marginBottom:4}}>Welcome back</div>
          <div style={{fontSize:13,color:"#6b7280",marginBottom:22}}>Sign in to your account to continue</div>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:16}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{color:"#a5b4fc",fontSize:12}}>Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" autoComplete="off" onKeyDown={e=>e.key==="Enter"&&go()} style={iS}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{color:"#a5b4fc",fontSize:12}}>Password</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Enter your password" onKeyDown={e=>e.key==="Enter"&&go()} style={iS}/>
            </div>
          </div>
          {err&&<div style={{background:"rgba(220,38,38,0.15)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:7,padding:"8px 12px",fontSize:12,color:"#fca5a5",marginBottom:12}}>{err}</div>}
          <button onClick={go} disabled={loading} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:11,borderRadius:9,border:"none",background:"#4f46e5",color:"#fff",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",boxShadow:"0 4px 14px rgba(79,70,229,0.4)",opacity:loading?0.8:1}}>
            {loading?"Signing in…":"Sign in →"}
          </button>
          <div style={{marginTop:16,textAlign:"center",fontSize:12,color:"#4b5563"}}>Forgot your password? Contact your administrator.</div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const {user,setUser,logout}=useAuth();
  const location=useLocation();

  if(location.pathname==="/set-password"){
    return <SetPassword/>;
  }

  function handleLogin(userData,token){
    localStorage.setItem('mpulse_token', token);
    localStorage.setItem('mpulse_user', JSON.stringify(userData));
    setUser(userData);
  }
  function handleLogout(){logout();}

  if(!user)return <Login onLogin={handleLogin}/>;
  return <Shell user={user} onLogout={handleLogout}/>;
}
