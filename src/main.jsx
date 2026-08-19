import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './motion.css'

const seed = {
  id: 'arthur', name: 'Arthur Whitmore', role: 'Grand-grandfather', birth: '1921', location: 'Bristol, UK', note: 'The root of your story.', partnerId: 'elise', children: ['margaret', 'thomas'], parentId: null,
}
const initialPeople = {
  arthur: seed,
  elise: { id: 'elise', name: 'Elise Whitmore', role: 'Grand-grandmother', birth: '1925', location: 'Bristol, UK', note: 'A keeper of old stories.', partnerId: 'arthur', children: [], parentId: null },
  margaret: { id: 'margaret', name: 'Margaret Hayes', role: 'Daughter', birth: '1947', location: 'Bath, UK', note: 'Always had a green thumb.', partnerId: 'robert', children: ['sarah'], parentId: 'arthur' },
  robert: { id: 'robert', name: 'Robert Hayes', role: 'Son-in-law', birth: '1945', location: 'Bath, UK', note: 'The family storyteller.', partnerId: 'margaret', children: [], parentId: null },
  thomas: { id: 'thomas', name: 'Thomas Whitmore', role: 'Son', birth: '1951', location: 'London, UK', note: 'Built a life by the sea.', partnerId: 'june', children: ['daniel'], parentId: 'arthur' },
  june: { id: 'june', name: 'June Whitmore', role: 'Daughter-in-law', birth: '1954', location: 'London, UK', note: 'Loved Sunday dinners.', partnerId: 'thomas', children: [], parentId: null },
  sarah: { id: 'sarah', name: 'Sarah Hayes', role: 'Granddaughter', birth: '1972', location: 'Manchester, UK', note: 'The family archivist.', partnerId: null, children: ['you'], parentId: 'margaret' },
  daniel: { id: 'daniel', name: 'Daniel Whitmore', role: 'Grandson', birth: '1976', location: 'London, UK', note: 'Never missed a reunion.', partnerId: null, children: [], parentId: 'thomas' },
  you: { id: 'you', name: 'Your name', role: 'You', birth: '2000', location: 'Your hometown', note: 'The next chapter starts here.', partnerId: null, children: [], parentId: 'sarah' },
}

function useAmbientSound() {
  const audio = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [track, setTrack] = useState(0)
  const tracks = ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3']
  useEffect(() => () => audio.current?.pause(), [])
  useEffect(() => { const timer = setInterval(() => setTrack((value) => (value + 1) % tracks.length), 120000); return () => clearInterval(timer) }, [])
  useEffect(() => { if (audio.current && playing) { audio.current.src = tracks[track]; audio.current.play().catch(() => setPlaying(false)) } }, [track, playing])
  const play = () => { if (!audio.current) audio.current = new Audio(tracks[track]); audio.current.loop = true; audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  const stop = () => { audio.current?.pause(); setPlaying(false) }
  return { playing, track, play, stop }
}

function getSavedPeople() {
  try {
    const saved = JSON.parse(localStorage.getItem('roots-tree') || 'null')
    return saved && typeof saved === 'object' ? saved : initialPeople
  } catch {
    return initialPeople
  }
}

function App() {
  const [people, setPeople] = useState(getSavedPeople)
  const [selectedId, setSelectedId] = useState('arthur')
  const [modal, setModal] = useState(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [code, setCode] = useState('')
  const [editorUnlocked, setEditorUnlocked] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [zoom, setZoom] = useState(1)
  const sound = useAmbientSound()
  const selected = people[selectedId] || people.arthur || Object.values(people)[0]
  const children = selected.children.map((id) => people[id]).filter(Boolean)
  useEffect(() => {
    try { localStorage.setItem('roots-tree', JSON.stringify(people)) } catch { /* local persistence is optional */ }
  }, [people])
  const updatePerson = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const id = modal === 'edit' ? selectedId : crypto.randomUUID(); const person = { id, name: form.get('name'), role: form.get('role'), birth: form.get('birth'), location: form.get('location'), note: form.get('note'), partnerId: null, children: [], parentId: selectedId }; setPeople((current) => { const next = { ...current, [id]: person, [selectedId]: { ...current[selectedId], children: [...current[selectedId].children, id] } }; return next }); setModal(null); }
  const requestEdit = (action) => { if (editorUnlocked) action(); else { setPendingAction(() => action); setAuthOpen(true) } }
  const authorizeEdit = (event) => { event.preventDefault(); if (code !== '6767') return; setEditorUnlocked(true); setAuthOpen(false); setCode(''); pendingAction?.(); setPendingAction(null) }
  const deletePerson = () => { if (code !== '6767' || selectedId === 'arthur') return; setPeople((current) => { const next = { ...current }; delete next[selectedId]; Object.values(next).forEach((person) => { person.children = person.children.filter((id) => id !== selectedId) }); return next }); setSelectedId('arthur'); setDeleteMode(false); setCode('') }
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✦</span><div><strong>Roots<span>&</span>Branches</strong><small>A living family archive</small></div></div>
      <div className="side-rule" />
      <p className="eyebrow">YOUR ARCHIVE</p>
      <nav><button className="nav-item active"><span>⌂</span> Family tree <b>1</b></button><button className="nav-item" onClick={() => requestEdit(() => setModal('edit'))}><span>✎</span> My profile <b>🔒</b></button></nav>
      <div className="sidebar-footer"><p className="eyebrow">TREE HEALTH</p><div className="health"><span><i /> Synced locally</span><b>{Object.keys(people).length} people</b></div><div className="audio-card"><div><span className={`pulse ${sound.playing ? 'playing' : ''}`}>◒</span><div><strong>Relaxing music</strong><small>Track {sound.track + 1} · changes in 2 min</small></div></div><div className="audio-controls"><button onClick={sound.play} aria-label="Play relaxing music">▶</button><button onClick={sound.stop} aria-label="Stop relaxing music">■</button></div></div></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="eyebrow">FAMILY TREE / OVERVIEW</p><h1>Where your story begins.</h1></div><div className="top-actions"><button className="ghost-btn" onClick={() => requestEdit(() => setModal('edit'))}>Edit selected <span>🔒</span></button><button className="primary-btn" onClick={() => requestEdit(() => setModal('add'))}>＋ Add family member <span>🔒</span></button></div></header>
      <div className="tree-stage">
        <div className="stage-note"><span className="line-dot" /> Click any person to explore their branch</div><div className="zoom-tools"><button onClick={() => setZoom((value) => Math.max(.7, value - .1))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(1.5, value + .1))} aria-label="Zoom in">＋</button><button onClick={() => setZoom(1)} aria-label="Reset zoom">↺</button></div>
        <div className="tree-canvas" style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}>
          <div className="root-couple"><PersonCard person={people.arthur} selectedId={selectedId} onSelect={setSelectedId} /><div className="partner-link">♡</div><PersonCard person={people.elise} selectedId={selectedId} onSelect={setSelectedId} /></div>
          <div className="connector" />
          <div className="branch-label"><span>THE FIRST BRANCH</span><i /> <em>2 children</em></div>
          <div className="children-row">{children.map((person) => <PersonCard key={person.id} person={person} selectedId={selectedId} onSelect={setSelectedId} />)}<button className="add-card" onClick={() => requestEdit(() => setModal('add'))}><span>＋</span><strong>Add a branch</strong><small>Continue the story</small></button></div>
        </div>
      </div>
      <footer className="workspace-footer"><span>Last saved just now</span><span>Private archive · Only you can edit</span></footer>
    </section>
    <aside className="detail-panel"><div className="detail-header"><span className="eyebrow">SELECTED PERSON</span><button className="closeish" onClick={() => setSelectedId('arthur')}>↺</button></div><div className="portrait"><span>{selected.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><i>✦</i></div><h2>{selected.name}</h2><p className="detail-role">{selected.role} · {selected.birth}</p><div className="detail-rule" /><div className="facts"><div><span>⌖</span><p><small>From</small>{selected.location}</p></div><div><span>♧</span><p><small>Branch</small>{selected.children.length ? `${selected.children.length} descendant${selected.children.length > 1 ? 's' : ''}` : 'Ready to grow'}</p></div></div><blockquote>“{selected.note}”</blockquote><div className="detail-actions"><button className="primary-btn" onClick={() => requestEdit(() => setModal('add'))}>＋ Add child <span>🔒</span></button><button className="square-btn" onClick={() => requestEdit(() => setModal('edit'))}>✎</button></div><button className="delete-link" onClick={() => setDeleteMode(true)}>Delete person</button>{deleteMode && <div className="delete-box"><strong>Enter archive code 6767</strong><small>Deleting a person cannot be undone.</small><input autoFocus inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="4 digit code" /><div><button onClick={() => { setDeleteMode(false); setCode('') }}>Cancel</button><button className="danger" onClick={deletePerson}>Delete</button></div></div>}</aside>
    {authOpen && <div className="modal-backdrop"><form className="modal auth-modal" onSubmit={authorizeEdit}><div className="modal-top"><div><span className="eyebrow">PRIVATE ARCHIVE</span><h2>Unlock editing</h2></div><button type="button" className="closeish" onClick={() => { setAuthOpen(false); setCode('') }}>×</button></div><p className="auth-copy">Enter the family code to add or edit anyone.</p><input autoFocus inputMode="numeric" type="password" value={code} onChange={(event) => setCode(event.target.value)} placeholder="4 digit code" /><button className="primary-btn wide" type="submit">Unlock editing <span>→</span></button></form></div>}
    {modal && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><form className="modal" onSubmit={updatePerson}><div className="modal-top"><div><span className="eyebrow">{modal === 'edit' ? 'EDIT PROFILE' : 'NEW BRANCH'}</span><h2>{modal === 'edit' ? 'Update their story' : 'Add to the family'}</h2></div><button type="button" className="closeish" onClick={() => setModal(null)}>×</button></div><label>Name<input name="name" defaultValue={modal === 'edit' ? selected.name : ''} required placeholder="Their full name" /></label><div className="field-row"><label>Role<input name="role" defaultValue={modal === 'edit' ? selected.role : 'Family member'} /></label><label>Born<input name="birth" defaultValue={modal === 'edit' ? selected.birth : ''} placeholder="Year" /></label></div><label>Hometown<input name="location" defaultValue={modal === 'edit' ? selected.location : ''} placeholder="Where they are from" /></label><label>One line about them<textarea name="note" defaultValue={modal === 'edit' ? selected.note : ''} placeholder="A memory, a detail, a feeling..." /></label><button className="primary-btn wide" type="submit">{modal === 'edit' ? 'Save changes' : 'Add to the tree'} <span>→</span></button></form></div>}
  </main>
}

createRoot(document.getElementById('root')).render(<App />)

function PersonCard({ person, selectedId, onSelect }) { return <button className={`person-card ${selectedId === person.id ? 'selected' : ''}`} onClick={() => onSelect(person.id)}><div className="avatar">{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{person.name}</strong><small>{person.role}</small></div><span className="card-arrow">↗</span></button> }

export default App
