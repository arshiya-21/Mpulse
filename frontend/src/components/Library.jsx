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
  const [loading, setLoading]     = useState(true);

  // Admin modals
  const [secModal, setSecModal] = useState(false);
  const [vidModal, setVidModal] = useState(false);
  const [editSec, setEditSec]   = useState(null);
  const [editVid, setEditVid]   = useState(null);
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
    try {
      if (editSec) await api.put(`/library/sections/${editSec.id}`, secForm);
      else await api.post('/library/sections', secForm);
      show('Saved'); setSecModal(false); await loadAll();
    } catch (e) { show(e?.response?.data?.error || 'Failed'); }
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
    try {
      if (editVid) await api.put(`/library/videos/${editVid.id}`, vidForm);
      else await api.post('/library/videos', vidForm);
      show('Saved'); setVidModal(false); await loadAll();
    } catch (e) { show(e?.response?.data?.error || 'Failed'); }
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 18 }}>
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
              <div style={{ display: 'flex', gap: 0, marginLeft: 2 }}>
                <button onClick={e => openEditSection(s, e)} title="Edit section"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: '2px 3px', lineHeight: 1 }}>✏️</button>
                <button onClick={e => deleteSec(s.id, e)} title="Delete section"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: '2px 3px', lineHeight: 1 }}>🗑</button>
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
              <VideoGrid videos={sec.items} isAdmin={isAdmin} onPlay={setPlayerVideo} onEdit={openEditVideo} onDelete={deleteVid} />
            </div>
          ))}
        </div>
      ) : (
        // Single section view
        <div>
          {displayVideos.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 12, border: '1px solid #e4e7ec' }}>
              No videos in this section.{isAdmin && ' Click "+ Video" to add one.'}
            </div>
          ) : (
            <VideoGrid videos={displayVideos} isAdmin={isAdmin} onPlay={setPlayerVideo} onEdit={openEditVideo} onDelete={deleteVid} />
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
            <button onClick={() => setSecModal(false)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e4e7ec', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={saveSec} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save</button>
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
            <label style={labelS}>YouTube Video ID</label>
            <input value={vidForm.video_id} onChange={e => setVidForm(f => ({ ...f, video_id: e.target.value.trim() }))} style={inputS} placeholder="e.g. ztfIlTmLMkc"/>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>The 11-character ID from the YouTube URL (after ?v=)</div>
          </div>
          <div><label style={labelS}>Sort Order</label><input type="number" value={vidForm.sort_order} onChange={e => setVidForm(f => ({ ...f, sort_order: +e.target.value }))} style={inputS}/></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setVidModal(false)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e4e7ec', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={saveVid} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save</button>
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

// ── VideoGrid component ────────────────────────────────────────
function VideoGrid({ videos, isAdmin, onPlay, onEdit, onDelete }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: 16,
    }}>
      {videos.map(v => (
        <VideoCard key={v.id} v={v} isAdmin={isAdmin} onPlay={onPlay} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ── VideoCard component ────────────────────────────────────────
function VideoCard({ v, isAdmin, onPlay, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const thumb = `https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`;

  return (
    <div
      onClick={() => onPlay(v)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10, overflow: 'hidden', background: '#fff',
        border: '1px solid #e4e7ec', cursor: 'pointer',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', overflow: 'hidden' }}>
        <img
          src={thumb}
          alt={v.label}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        {/* Play overlay */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hovered ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.15)',
          transition: 'background 0.15s',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: hovered ? '#ff0000' : 'rgba(255,255,255,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={hovered ? '#fff' : '#111'} style={{ marginLeft: 3 }}>
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.35, marginBottom: v.caption ? 4 : 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {v.label}
        </div>
        {v.caption && (
          <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {v.caption}
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }} onClick={e => e.stopPropagation()}>
            <button onClick={e => onEdit(v, e)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e4e7ec', background: '#fff', fontSize: 11, cursor: 'pointer', color: '#374151' }}>Edit</button>
            <button onClick={e => onDelete(v.id, e)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #fee2e2', background: '#fff', fontSize: 11, cursor: 'pointer', color: '#dc2626' }}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}
