import { useState, useEffect } from 'react';
import api from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast, Toast, Modal, inputS, labelS } from './shared.jsx';

export default function Library() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const { msg, show } = useToast();

  const [sections, setSections]   = useState([]);
  const [videos, setVideos]       = useState([]);
  const [activeSection, setActiveSection] = useState('all');
  const [playerVideo, setPlayerVideo]     = useState(null);
  const [viewMode, setViewMode]           = useState('grid');
  const [loading, setLoading]     = useState(true);

  // Admin modals
  const [secModal, setSecModal] = useState(false);
  const [vidModal, setVidModal] = useState(false);
  const [editSec, setEditSec]   = useState(null);
  const [editVid, setEditVid]   = useState(null);
  const [savingSec, setSavingSec] = useState(false);
  const [savingVid, setSavingVid] = useState(false);
  const [secForm, setSecForm]   = useState({ title: '', sort_order: 0 });
  const [vidForm, setVidForm]   = useState({ label: '', caption: '', video_id: '', section_id: '', sort_order: 0 });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [sR, vR] = await Promise.all([
        api.get('/library/sections'),
        api.get('/library/videos'),
      ]);
      setSections(sR.data);
      setVideos(vR.data);
    } catch { show('Failed to load library'); }
    finally { setLoading(false); }
  }

  const displayVideos = activeSection === 'all'
    ? videos
    : videos.filter(v => v.section_id === activeSection);

  // Group by section for "All" view
  const grouped = sections.map(s => ({
    ...s,
    items: videos.filter(v => v.section_id === s.id),
  })).filter(s => s.items.length > 0);

  // ── Section CRUD ──────────────────────────────────────────────
  function openAddSection() { setEditSec(null); setSecForm({ title: '', sort_order: sections.length }); setSecModal(true); }
  function openEditSection(s, e) { e.stopPropagation(); setEditSec(s); setSecForm({ title: s.title, sort_order: s.sort_order }); setSecModal(true); }
  async function saveSec() {
    if(savingSec) return;
    setSavingSec(true);
    try {
      if (editSec) await api.put(`/library/sections/${editSec.id}`, secForm);
      else await api.post('/library/sections', secForm);
      show('Saved'); setSecModal(false); await loadAll();
    } catch (e) { show(e?.response?.data?.error || 'Failed'); }
    finally { setSavingSec(false); }
  }
  async function deleteSec(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete section and all its videos?')) return;
    try { await api.delete(`/library/sections/${id}`); show('Deleted'); await loadAll(); if (activeSection === id) setActiveSection('all'); }
    catch (e) { show(e?.response?.data?.error || 'Failed'); }
  }

  // ── Video CRUD ────────────────────────────────────────────────
  function openAddVideo(sectionId) {
    setEditVid(null);
    const secId = sectionId || (activeSection !== 'all' ? activeSection : sections[0]?.id || '');
    setVidForm({ label: '', caption: '', video_id: '', section_id: secId, sort_order: displayVideos.length });
    setVidModal(true);
  }
  function openEditVideo(v, e) {
    e.stopPropagation();
    setEditVid(v);
    setVidForm({ label: v.label, caption: v.caption || '', video_id: v.video_id, section_id: v.section_id || '', sort_order: v.sort_order });
    setVidModal(true);
  }
  async function saveVid() {
    if(savingVid) return;
    setSavingVid(true);
    try {
      if (editVid) await api.put(`/library/videos/${editVid.id}`, vidForm);
      else await api.post('/library/videos', vidForm);
      show('Saved'); setVidModal(false); await loadAll();
    } catch (e) { show(e?.response?.data?.error || 'Failed'); }
    finally { setSavingVid(false); }
  }
  async function deleteVid(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this video?')) return;
    try { await api.delete(`/library/videos/${id}`); show('Deleted'); await loadAll(); if (playerVideo?.id === id) setPlayerVideo(null); }
    catch (e) { show(e?.response?.data?.error || 'Failed'); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Loading library…</div>;

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 18 }}>
        {/* Grid / List toggle */}
        <div style={{ display: 'flex', border: '1px solid #e4e7ec', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setViewMode('grid')} title="Grid view"
            style={{ padding: '6px 11px', border: 'none', background: viewMode === 'grid' ? '#4f46e5' : '#fff', color: viewMode === 'grid' ? '#fff' : '#6b7280', cursor: 'pointer', fontSize: 14 }}>⊞</button>
          <button onClick={() => setViewMode('list')} title="List view"
            style={{ padding: '6px 11px', border: 'none', borderLeft: '1px solid #e4e7ec', background: viewMode === 'list' ? '#4f46e5' : '#fff', color: viewMode === 'list' ? '#fff' : '#6b7280', cursor: 'pointer', fontSize: 14 }}>☰</button>
        </div>
        {isAdmin && activeSection !== 'all' && (
          <button onClick={() => openAddVideo(activeSection)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e4e7ec', background: '#fff', color: '#4f46e5', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ Add Video</button>
        )}
        {isAdmin && (
          <button onClick={openAddSection} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e4e7ec', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>+ Add Section</button>
        )}
      </div>

      {/* Section filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tab label="All" count={videos.length} active={activeSection === 'all'} onClick={() => setActiveSection('all')} />
        {sections.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <Tab
              label={s.title}
              count={videos.filter(v => v.section_id === s.id).length}
              active={activeSection === s.id}
              onClick={() => setActiveSection(s.id)}
            />
            {isAdmin && (
              <div style={{ display: 'flex', gap: 2, marginLeft: 3 }}>
                <button onClick={e => openEditSection(s, e)} title="Edit section"
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:5, border:'1px solid #e4e7ec', background:'#fff', cursor:'pointer', padding:0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={e => deleteSec(s.id, e)} title="Delete section"
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:5, border:'1px solid #fee2e2', background:'#fff5f5', cursor:'pointer', padding:0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Grid content */}
      {videos.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 12, border: '1px solid #e4e7ec' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📹</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No videos yet</div>
          {isAdmin && <div style={{ fontSize: 13 }}>Click "+ Video" to add your first video.</div>}
        </div>
      ) : activeSection === 'all' ? (
        // All sections grouped view
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {grouped.map(sec => (
            <div key={sec.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 4, height: 18, background: '#4f46e5', borderRadius: 2 }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{sec.title}</span>
                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>{sec.items.length} video{sec.items.length !== 1 ? 's' : ''}</span>
                {isAdmin && (
                  <button onClick={() => openAddVideo(sec.id)}
                    style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: '1px solid #e4e7ec', background: '#fff', color: '#4f46e5', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    + Add video
                  </button>
                )}
              </div>
              <VideoGrid videos={sec.items} isAdmin={isAdmin} onPlay={setPlayerVideo} onEdit={openEditVideo} onDelete={deleteVid} viewMode={viewMode} />
            </div>
          ))}
        </div>
      ) : (
        // Single section view
        <div>
          {displayVideos.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 12, border: '1px solid #e4e7ec' }}>
              No videos in this section.{isAdmin && ' Use "+ Add Video" above to add one.'}
            </div>
          ) : (
            <VideoGrid videos={displayVideos} isAdmin={isAdmin} onPlay={setPlayerVideo} onEdit={openEditVideo} onDelete={deleteVid} viewMode={viewMode} />
          )}
        </div>
      )}

      {/* Video player modal */}
      <Modal open={!!playerVideo} onClose={() => setPlayerVideo(null)} title={playerVideo?.label || ''} width={820}>
        {playerVideo && (
          <div>
            {playerVideo.caption && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>{playerVideo.caption}</div>
            )}
            <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9' }}>
              <iframe
                key={playerVideo.video_id}
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${playerVideo.video_id}?autoplay=1&rel=0`}
                title={playerVideo.label}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ display: 'block' }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Section modal */}
      <Modal open={secModal} onClose={() => setSecModal(false)} title={editSec ? 'Edit Section' : 'Add Section'} width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelS}>Section Title</label><input value={secForm.title} onChange={e => setSecForm(f => ({ ...f, title: e.target.value }))} style={inputS} placeholder="e.g. Green Sand Testing"/></div>
          <div><label style={labelS}>Sort Order</label><input type="number" value={secForm.sort_order} onChange={e => setSecForm(f => ({ ...f, sort_order: +e.target.value }))} style={inputS}/></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setSecModal(false)} disabled={savingSec} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e4e7ec', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={saveSec} disabled={savingSec} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: savingSec?'#818cf8':'#4f46e5', color: '#fff', fontWeight: 600, cursor: savingSec?'not-allowed':'pointer' }}>{savingSec?'Saving…':'Save'}</button>
          </div>
        </div>
      </Modal>

      {/* Video modal */}
      <Modal open={vidModal} onClose={() => setVidModal(false)} title={editVid ? 'Edit Video' : 'Add Video'} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelS}>Section</label>
            <select value={vidForm.section_id} onChange={e => setVidForm(f => ({ ...f, section_id: +e.target.value }))}
              style={{ ...inputS, padding: '8px 11px' }}>
              <option value="">— select section —</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div><label style={labelS}>Title / Label</label><input value={vidForm.label} onChange={e => setVidForm(f => ({ ...f, label: e.target.value }))} style={inputS} placeholder="e.g. Active Clay"/></div>
          <div><label style={labelS}>Description / Caption</label><input value={vidForm.caption} onChange={e => setVidForm(f => ({ ...f, caption: e.target.value }))} style={inputS} placeholder="Short description…"/></div>
          <div>
            <label style={labelS}>YouTube Video ID or URL</label>
            <input value={vidForm.video_id} onChange={e => {
              const raw = e.target.value.trim();
              // Accept full YouTube URLs and extract the video ID
              const match = raw.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
              setVidForm(f => ({ ...f, video_id: match ? match[1] : raw }));
            }} style={inputS} placeholder="e.g. ztfIlTmLMkc or paste full YouTube URL"/>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Paste a YouTube URL or the 11-character video ID</div>
          </div>
          <div><label style={labelS}>Sort Order</label><input type="number" value={vidForm.sort_order} onChange={e => setVidForm(f => ({ ...f, sort_order: +e.target.value }))} style={inputS}/></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setVidModal(false)} disabled={savingVid} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e4e7ec', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={saveVid} disabled={savingVid} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: savingVid?'#818cf8':'#4f46e5', color: '#fff', fontWeight: 600, cursor: savingVid?'not-allowed':'pointer' }}>{savingVid?'Saving…':'Save'}</button>
          </div>
        </div>
      </Modal>

      <Toast msg={msg}/>
    </div>
  );
}

// ── Tab component ──────────────────────────────────────────────
function Tab({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, border: active ? 'none' : '1px solid #e4e7ec',
      background: active ? '#4f46e5' : '#fff', color: active ? '#fff' : '#374151',
      fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
    }}>
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
        color: active ? '#fff' : '#6b7280',
        borderRadius: 20, padding: '0px 7px', fontSize: 11, fontWeight: 600,
      }}>{count}</span>
    </button>
  );
}

// ── ListThumb component ───────────────────────────────────────
function ListThumb({ videoId, label }) {
  const [src, setSrc] = useState(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{ width: 80, height: 46, borderRadius: 6, flexShrink: 0, background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M10 9l6 3-6 3V9z" fill="#4b5563" stroke="none"/></svg>
    </div>
  );
  return (
    <img src={src} alt={label}
      style={{ width: 80, height: 46, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#000' }}
      onError={() => {
        if(src.includes('hqdefault')) setSrc(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
        else setErr(true);
      }}
    />
  );
}

// ── VideoGrid component ────────────────────────────────────────
function VideoGrid({ videos, isAdmin, onPlay, onEdit, onDelete, viewMode }) {
  if (viewMode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {videos.map(v => (
          <div key={v.id} onClick={() => onPlay(v)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: '#fff', border: '1px solid #e4e7ec', borderRadius: 10, cursor: 'pointer' }}
          >
            <ListThumb videoId={v.video_id} label={v.label} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{v.label}</div>
              {v.caption && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.caption}</div>}
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={e => onEdit(v, e)} style={{ display:'flex',alignItems:'center',gap:4, padding: '4px 9px', borderRadius: 5, border: '1px solid #e4e7ec', background: '#f8f9fb', fontSize: 11, cursor: 'pointer', color: '#374151', fontWeight:500 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button onClick={e => onDelete(v.id, e)} style={{ display:'flex',alignItems:'center',gap:4, padding: '4px 9px', borderRadius: 5, border: '1px solid #fee2e2', background: '#fff5f5', fontSize: 11, cursor: 'pointer', color: '#dc2626', fontWeight:500 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {videos.map(v => (
        <VideoCard key={v.id} v={v} isAdmin={isAdmin} onPlay={onPlay} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ── VideoCard component ────────────────────────────────────────
function VideoCard({ v, isAdmin, onPlay, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [thumbSrc, setThumbSrc] = useState(`https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`);
  const [thumbErr, setThumbErr] = useState(false);

  return (
    <div
      onClick={() => onPlay(v)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10, overflow: 'hidden', background: '#fff',
        border: '1px solid #e4e7ec', cursor: 'pointer',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', paddingTop: '56.25%', background: '#0f172a', overflow: 'hidden' }}>
        {thumbErr ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="#475569" strokeWidth="1.5"/><path d="M10 9l6 3-6 3V9z" fill="#475569"/></svg>
            <span style={{ fontSize: 10, color: '#475569', fontWeight: 500 }}>No preview</span>
          </div>
        ) : (
          <img
            src={thumbSrc}
            alt={v.label}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => {
              if(thumbSrc.includes('hqdefault')) setThumbSrc(`https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`);
              else setThumbErr(true);
            }}
          />
        )}
        {/* Play overlay */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hovered ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.18)',
          transition: 'background 0.15s',
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: hovered ? '#ff0000' : 'rgba(255,255,255,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            boxShadow: hovered ? '0 4px 16px rgba(255,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={hovered ? '#fff' : '#111'} style={{ marginLeft: 3 }}>
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
        {/* Duration badge placeholder - subtle top-right corner */}
        <div style={{ position:'absolute', top:7, right:7, background:'rgba(0,0,0,0.65)', borderRadius:4, padding:'2px 6px', fontSize:10, color:'#fff', fontWeight:600, backdropFilter:'blur(4px)' }}>
          ▶ Video
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4, marginBottom: v.caption ? 4 : 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {v.label}
        </div>
        {v.caption && (
          <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: isAdmin ? 0 : 0 }}>
            {v.caption}
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 5, marginTop: 9 }} onClick={e => e.stopPropagation()}>
            <button onClick={e => onEdit(v, e)} style={{ display:'flex', alignItems:'center', gap:4, padding: '4px 9px', borderRadius: 5, border: '1px solid #e4e7ec', background: '#f8f9fb', fontSize: 11, cursor: 'pointer', color: '#374151', fontWeight:500 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button onClick={e => onDelete(v.id, e)} style={{ display:'flex', alignItems:'center', gap:4, padding: '4px 9px', borderRadius: 5, border: '1px solid #fee2e2', background: '#fff5f5', fontSize: 11, cursor: 'pointer', color: '#dc2626', fontWeight:500 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
