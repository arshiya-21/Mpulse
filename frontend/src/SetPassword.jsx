import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from './api/auth.js';

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [pw, setPw]     = useState('');
  const [pw2, setPw2]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]   = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!pw || !pw2) { setErr('Please fill in both fields.'); return; }
    if (pw !== pw2)  { setErr('Passwords do not match.'); return; }
    setErr(''); setLoading(true);
    try {
      await authApi.resetFirstTimePassword(token, pw);
      setDone(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to set password.');
    } finally {
      setLoading(false);
    }
  }

  const iS = { width:'100%', padding:'10px 13px', fontSize:14, border:'1px solid #d1d5db', borderRadius:6, outline:'none', boxSizing:'border-box' };

  return (
    <div style={{minHeight:'100vh',background:'#f4f6f9',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',borderRadius:16,padding:'36px 32px',width:400,boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
        <div style={{fontSize:20,fontWeight:700,color:'#111827',marginBottom:6}}>Set your password</div>
        <div style={{fontSize:13,color:'#6b7280',marginBottom:22}}>Choose a secure password to activate your account.</div>
        {done ? (
          <div style={{color:'#10b981',fontWeight:600,textAlign:'center'}}>Password set! Redirecting…</div>
        ) : (
          <>
            <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,color:'#374151',display:'block',marginBottom:4}}>New Password</label>
                <input type="password" value={pw} onChange={e=>setPw(e.target.value)} style={iS}/>
              </div>
              <div>
                <label style={{fontSize:12,color:'#374151',display:'block',marginBottom:4}}>Confirm Password</label>
                <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()} style={iS}/>
              </div>
            </div>
            {err && <div style={{color:'#ef4444',fontSize:12,marginBottom:12}}>{err}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{width:'100%',padding:11,borderRadius:8,border:'none',background:'#4f46e5',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              {loading ? 'Setting…' : 'Set Password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
