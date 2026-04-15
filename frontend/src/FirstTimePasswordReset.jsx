import { useState } from 'react';
import * as authApi from './api/auth.js';

export default function FirstTimePasswordReset({ resetToken, userName, onSuccess }) {
  const [pw, setPw]     = useState('');
  const [pw2, setPw2]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]   = useState('');

  async function handleSubmit() {
    if (!pw || !pw2) { setErr('Please fill in both fields.'); return; }
    if (pw !== pw2)  { setErr('Passwords do not match.'); return; }
    setErr(''); setLoading(true);
    try {
      const res = await authApi.resetFirstTimePassword(resetToken, pw);
      onSuccess(res);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to set password.');
    } finally {
      setLoading(false);
    }
  }

  const iS = { width:'100%', padding:'10px 13px', fontSize:14, border:'1px solid rgba(255,255,255,0.14)', borderRadius:6, background:'rgba(255,255,255,0.07)', color:'#f9fafb', outline:'none', fontFamily:'system-ui,sans-serif', boxSizing:'border-box' };

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f0f1a 0%,#1a1040 40%,#0f172a 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:52,height:52,borderRadius:14,background:'rgba(79,70,229,0.6)',border:'1px solid rgba(129,140,248,0.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:22}}>✅</div>
          <div style={{fontSize:26,fontWeight:700,color:'#f9fafb',letterSpacing:'-0.02em'}}>MPulse</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)',backdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'36px 32px',width:400,boxShadow:'0 32px 80px rgba(0,0,0,0.4)'}}>
          <div style={{fontSize:17,fontWeight:700,color:'#e0e7ff',marginBottom:4}}>Welcome, {userName}!</div>
          <div style={{fontSize:13,color:'#6b7280',marginBottom:22}}>Please set a new password to continue.</div>
          <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:16}}>
            <div>
              <label style={{color:'#a5b4fc',fontSize:12,display:'block',marginBottom:4}}>New Password</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Min 8 chars, uppercase, number, special" style={iS}/>
            </div>
            <div>
              <label style={{color:'#a5b4fc',fontSize:12,display:'block',marginBottom:4}}>Confirm Password</label>
              <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()} placeholder="Repeat password" style={iS}/>
            </div>
          </div>
          {err && <div style={{background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:7,padding:'8px 12px',fontSize:12,color:'#fca5a5',marginBottom:12}}>{err}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{width:'100%',padding:11,borderRadius:9,border:'none',background:'#4f46e5',color:'#fff',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.8:1}}>
            {loading ? 'Setting password…' : 'Set Password & Sign in →'}
          </button>
          <div style={{fontSize:11,color:'#4b5563',marginTop:12,textAlign:'center'}}>Password must be at least 8 characters with uppercase, number, and special character.</div>
        </div>
      </div>
    </div>
  );
}
