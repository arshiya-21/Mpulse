import { useState, useEffect } from 'react';
import api from '../api/index.js';

export default function Library() {
  const [sections, setSections] = useState([]);
  const [videos, setVideos]     = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [activeVideo, setActiveVideo]     = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/library/sections'),
      api.get('/library/videos')
    ]).then(([s, v]) => {
      setSections(s.data);
      setVideos(v.data);
      if (s.data.length) setActiveSection(s.data[0].id);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sectionVideos = videos.filter(v => v.section_id === activeSection);

  function getYoutubeId(url) {
    const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#6b7280'}}>Loading library…</div>;

  return (
    <div style={{display:'flex',gap:16,height:'calc(100vh - 120px)',fontFamily:'system-ui,sans-serif'}}>
      {/* Sections sidebar */}
      <div style={{width:220,background:'#fff',borderRadius:12,border:'1px solid #e4e7ec',padding:12,overflowY:'auto',flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:700,color:'#111827',marginBottom:12,paddingLeft:4}}>Sections</div>
        {sections.length === 0 && <div style={{fontSize:12,color:'#9ca3af',paddingLeft:4}}>No sections yet.</div>}
        {sections.map(s => (
          <div key={s.id} onClick={() => { setActiveSection(s.id); setActiveVideo(null); }}
            style={{padding:'9px 12px',borderRadius:8,cursor:'pointer',marginBottom:4,
              background: activeSection===s.id ? '#4f46e5' : 'transparent',
              color: activeSection===s.id ? '#fff' : '#374151',
              fontSize:13,fontWeight:activeSection===s.id?600:400,
              transition:'background 0.15s'}}>
            {s.title}
            <span style={{fontSize:11,opacity:0.7,marginLeft:6}}>({s.video_count||0})</span>
          </div>
        ))}
      </div>

      {/* Video list + player */}
      <div style={{flex:1,display:'flex',gap:16,minWidth:0}}>
        {/* Video list */}
        <div style={{width:280,background:'#fff',borderRadius:12,border:'1px solid #e4e7ec',padding:12,overflowY:'auto',flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:700,color:'#111827',marginBottom:12,paddingLeft:4}}>Videos</div>
          {sectionVideos.length === 0 && <div style={{fontSize:12,color:'#9ca3af',paddingLeft:4}}>No videos in this section.</div>}
          {sectionVideos.map(v => (
            <div key={v.id} onClick={() => setActiveVideo(v)}
              style={{padding:'10px 12px',borderRadius:8,cursor:'pointer',marginBottom:6,
                background: activeVideo?.id===v.id ? '#ede9fe' : '#f9fafb',
                border: activeVideo?.id===v.id ? '1px solid #c4b5fd' : '1px solid #e4e7ec',
                transition:'all 0.15s'}}>
              <div style={{fontSize:13,fontWeight:600,color:'#111827',marginBottom:2}}>{v.title}</div>
              {v.duration && <div style={{fontSize:11,color:'#6b7280'}}>{v.duration}</div>}
              {v.description && <div style={{fontSize:11,color:'#9ca3af',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.description}</div>}
            </div>
          ))}
        </div>

        {/* Player */}
        <div style={{flex:1,background:'#fff',borderRadius:12,border:'1px solid #e4e7ec',padding:20,minWidth:0,display:'flex',flexDirection:'column'}}>
          {activeVideo ? (
            <>
              <div style={{fontSize:16,fontWeight:700,color:'#111827',marginBottom:6}}>{activeVideo.title}</div>
              {activeVideo.description && <div style={{fontSize:13,color:'#6b7280',marginBottom:14}}>{activeVideo.description}</div>}
              <div style={{flex:1,borderRadius:10,overflow:'hidden',background:'#000',minHeight:300}}>
                {getYoutubeId(activeVideo.youtube_url) ? (
                  <iframe
                    width="100%" height="100%"
                    src={`https://www.youtube.com/embed/${getYoutubeId(activeVideo.youtube_url)}`}
                    title={activeVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{display:'block',minHeight:340}}
                  />
                ) : (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:340,color:'#9ca3af',fontSize:13}}>
                    Invalid YouTube URL
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:12,color:'#9ca3af'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
              <div style={{fontSize:14,fontWeight:500}}>Select a video to watch</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
