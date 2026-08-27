import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './motion.css'
import './family.css'
import './light-theme.css'
import './tree-image.css'

const initialPeople = {
  arthur: { id: 'arthur', name: 'Arthur Whitmore', role: 'Grand-grandfather', birth: '1921', location: 'Bristol, UK', note: 'The root of your story.', partnerId: 'elise', children: ['thomas', 'michael'], parentId: null },
  elise: { id: 'elise', name: 'Elise Whitmore', role: 'Grand-grandmother', birth: '1925', location: 'Bristol, UK', note: 'A keeper of old stories.', partnerId: 'arthur', children: [], parentId: null },
  thomas: { id: 'thomas', name: 'Thomas Whitmore', role: 'Son', birth: '1951', location: 'London, UK', note: 'Built a life by the sea.', partnerId: null, children: ['you'], parentId: 'arthur' },
  michael: { id: 'michael', name: 'Michael Whitmore', role: 'Son', birth: '1954', location: 'Bath, UK', note: 'Always brought everyone together.', partnerId: null, children: [], parentId: 'arthur' },
  you: { id: 'you', name: 'Your name', role: 'You', birth: '2000', location: 'Your hometown', note: 'The next chapter starts here.', partnerId: null, children: [], parentId: 'thomas' },
}

function useAmbientSound() {
  const player = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const send = (func) => { if (!ready || !player.current?.contentWindow) return; player.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*') }
  const play = () => { send('playVideo'); setPlaying(true) }
  const stop = () => { send('stopVideo'); setPlaying(false) }
  return { playing, player, play, stop, setReady }
}

function getSavedPeople() {
  try {
    const saved = JSON.parse(localStorage.getItem('roots-tree-v4') || 'null')
    if (!saved || typeof saved !== 'object') return initialPeople
    const normalized = Object.fromEntries(Object.entries(saved).map(([id, person]) => [id, normalizePerson(person, id)]))
    return Object.keys(normalized).length ? normalized : initialPeople
  } catch {
    return initialPeople
  }
}

function normalizePerson(person, id) {
  return { ...person, id, name: person?.name || 'Unnamed family member', role: person?.role || 'Family member', birth: person?.birth || 'Unknown', location: person?.location || 'Unknown', note: person?.note || 'Part of the family story.', partnerId: person?.partnerId || null, children: Array.isArray(person?.children) ? person.children : [], parentId: person?.parentId || null }
}

function App() {
  const [people, setPeople] = useState(getSavedPeople)
  const [selectedId, setSelectedId] = useState('arthur')
  const [modal, setModal] = useState(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [code, setCode] = useState('')
  const [editorUnlocked, setEditorUnlocked] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [zoom, setZoom] = useState(1)
  const sound = useAmbientSound()
  const selected = people[selectedId] || people.arthur || Object.values(people)[0] || initialPeople.you
  const rootPerson = people.arthur || selected
  const rootPartner = rootPerson.partnerId ? people[rootPerson.partnerId] : null
  const partner = selected.partnerId ? people[selected.partnerId] : null
  const children = selected.children.map((id) => people[id]).filter(Boolean)
  const lineage = []
  let ancestorId = selected.parentId
  while (ancestorId && ancestorId !== rootPerson.id) {
    const ancestor = people[ancestorId]
    if (!ancestor) break
    lineage.unshift(ancestor)
    ancestorId = ancestor.parentId
  }
  if (selected.id !== rootPerson.id && !lineage.some((person) => person.id === selected.id)) lineage.push(selected)
  const generation = selected.parentId ? (people[selected.parentId]?.parentId ? 2 : 1) : 0
  useEffect(() => {
    try { localStorage.setItem('roots-tree-v4', JSON.stringify(people)) } catch { /* local persistence is optional */ }
  }, [people])
  const updatePerson = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const id = modal === 'edit' ? selectedId : (globalThis.crypto?.randomUUID?.() || `person-${Date.now()}`); const person = normalizePerson({ id, name: form.get('name'), role: form.get('role'), birth: form.get('birth'), location: form.get('location'), note: form.get('note'), partnerId: modal === 'spouse' ? selectedId : (people[id]?.partnerId || null), children: [], parentId: modal === 'spouse' ? null : selectedId }, id); setPeople((current) => { const next = { ...current, [id]: person }; const parent = current[selectedId] || initialPeople.you; if (modal === 'spouse') next[selectedId] = { ...parent, partnerId: id }; else if (modal === 'add') next[selectedId] = { ...parent, children: [...(parent.children || []), id] }; return next }); if (modal !== 'add') setSelectedId(id); setModal(null); }
  const requestEdit = (action, requiresCode = true) => { if (!requiresCode || editorUnlocked) action(); else { setPendingAction(() => action); setAuthOpen(true) } }
  const authorizeEdit = (event) => { event.preventDefault(); if (code !== '6767') return; setEditorUnlocked(true); setAuthOpen(false); setCode(''); pendingAction?.(); setPendingAction(null) }
  const deletePerson = () => { if (code !== '6767') { setDeleteError('That code was not accepted.'); return } if (Object.keys(people).length <= 1) { setDeleteError('Keep at least one profile in the archive.'); return } setPeople((current) => { const next = { ...current }; const removed = next[selectedId]; delete next[selectedId]; Object.values(next).forEach((person) => { person.children = person.children.filter((id) => id !== selectedId); if (person.partnerId === selectedId) person.partnerId = removed?.partnerId || null }); return next }); setSelectedId(Object.keys(people).find((id) => id !== selectedId) || 'you'); setDeleteMode(false); setDeleteError(''); setCode('') }
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✦</span><div><strong>Roots<span>&</span>Branches</strong><small>A living family archive</small></div></div>
      <div className="side-rule" />
      <p className="eyebrow">YOUR ARCHIVE</p>
      <nav><button className="nav-item active"><span>⌂</span> Family tree <b>1</b></button><button className="nav-item" onClick={() => requestEdit(() => setModal('edit'))}><span>✎</span> My profile <b>🔒</b></button></nav>
      <div className="sidebar-footer"><p className="eyebrow">TREE HEALTH</p><div className="health"><span><i /> Synced locally</span><b>{Object.keys(people).length} people</b></div><div className="audio-card"><iframe ref={sound.player} onLoad={() => sound.setReady(true)} className="music-player" title="Relaxing music" src={`https://www.youtube-nocookie.com/embed/FbyXHLgL93A?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&controls=0&rel=0`} allow="autoplay; encrypted-media" /><div><span className={`pulse ${sound.playing ? 'playing' : ''}`}>◒</span><div><strong>Requested relaxing song</strong><small>{sound.playing ? 'Playing now' : 'YouTube piano · click play'}</small></div></div><div className="audio-controls"><button onClick={sound.play} aria-label="Play requested song">▶</button><button onClick={sound.stop} aria-label="Stop requested song">■</button></div></div></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="eyebrow">FAMILY TREE / OVERVIEW</p><h1>Where your story begins.</h1></div><div className="top-actions"><button className="ghost-btn" onClick={() => requestEdit(() => setModal('edit'))}>Edit selected <span>🔒</span></button><button className="primary-btn" onClick={() => requestEdit(() => setModal('add'), false)}>＋ Add family member</button></div></header>
      <div className={`tree-stage generation-${generation}`}>
        <div className="stage-note"><span className="line-dot" /> Click any person to explore their branch</div><div className="zoom-tools"><button onClick={() => setZoom((value) => Math.max(.7, value - .1))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(1.5, value + .1))} aria-label="Zoom in">＋</button><button onClick={() => setZoom(1)} aria-label="Reset zoom">↺</button></div>
        <div className="tree-return"><button onClick={() => setSelectedId('arthur')} disabled={selectedId === 'arthur'}>↶ Return to roots</button></div><div className="tree-canvas" style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}>
          <div className="root-couple"><PersonCard person={rootPerson} selectedId={selectedId} onSelect={setSelectedId} /><div className="partner-link">♡</div>{rootPartner ? <PersonCard person={rootPartner} selectedId={selectedId} onSelect={setSelectedId} /> : <button className="add-spouse-card" onClick={() => requestEdit(() => setModal('spouse'), false)}><span>＋</span><strong>Add spouse</strong><small>Link their story</small></button>}</div>
          <div className="connector" />
          {lineage.length > 0 && <div className="lineage-row">{lineage.map((person) => <PersonCard key={person.id} person={person} selectedId={selectedId} onSelect={setSelectedId} />)}</div>}
          <div className="branch-label"><span>CHILDREN OF {selected.name.toUpperCase()}</span><i /> <em>{children.length} {children.length === 1 ? 'child' : 'children'}</em><button className="branch-add" onClick={() => requestEdit(() => setModal('add'), false)}>＋ Add person</button></div>
          <div className="children-row">{children.map((person) => <PersonCard key={person.id} person={person} selectedId={selectedId} onSelect={setSelectedId} />)}<button className="add-card" onClick={() => requestEdit(() => setModal('add'), false)}><span>＋</span><strong>{children.length ? 'Add a child' : 'Add first child'}</strong><small>Continue the story</small></button></div>
        </div>
      </div>
      <footer className="workspace-footer"><span>Last saved just now</span><span>Private archive · Only you can edit</span><span>Made by Karas Nazmy</span></footer>
    </section>
    <aside className="detail-panel"><div className="detail-header"><span className="eyebrow">SELECTED PERSON</span><button className="closeish" onClick={() => setSelectedId(Object.keys(people)[0])}>↺</button></div><div className="portrait"><span>{selected.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><i>✦</i></div><h2>{selected.name}</h2><p className="detail-role">{selected.role} · {selected.birth}</p><div className="detail-rule" /><div className="facts"><div><span>⌖</span><p><small>From</small>{selected.location}</p></div><div><span>♧</span><p><small>Branch</small>{selected.children.length ? `${selected.children.length} descendant${selected.children.length > 1 ? 's' : ''}` : 'Ready to grow'}</p></div></div><blockquote>“{selected.note}”</blockquote><div className="detail-actions"><button className="primary-btn" onClick={() => requestEdit(() => setModal('add'), false)}>＋ Add child</button><button className="square-btn" onClick={() => requestEdit(() => setModal('spouse'), false)}>＋ Spouse</button><button className="square-btn" onClick={() => requestEdit(() => setModal('edit'))}>✎ 🔒</button></div><button className="delete-link" onClick={() => { setDeleteMode(true); setDeleteError(''); setCode('') }}>Delete this profile <span>🔒</span></button>{deleteMode && <div className="modal-backdrop delete-backdrop"><div className="modal delete-modal"><div className="modal-top"><div><span className="eyebrow">PROFILE REQUEST</span><h2>Remove {selected.name}?</h2></div><button type="button" className="closeish" onClick={() => setDeleteMode(false)}>×</button></div><p className="auth-copy">This profile will be removed from the family tree. Accept to continue or decline to keep it.</p><input autoFocus inputMode="numeric" type="password" maxLength="4" value={code} onChange={(event) => { setCode(event.target.value); setDeleteError('') }} placeholder="Enter archive code" />{deleteError && <small className="delete-error">{deleteError}</small>}<div className="delete-actions"><button type="button" onClick={() => { setDeleteMode(false); setDeleteError(''); setCode('') }}>Decline</button><button type="button" className="danger" onClick={deletePerson}>Accept & delete</button></div></div></div>}</aside>
    {authOpen && <div className="modal-backdrop"><form className="modal auth-modal" onSubmit={authorizeEdit}><div className="modal-top"><div><span className="eyebrow">PRIVATE ARCHIVE</span><h2>Unlock editing</h2></div><button type="button" className="closeish" onClick={() => { setAuthOpen(false); setCode('') }}>×</button></div><p className="auth-copy">Enter the family code to add or edit anyone.</p><input autoFocus inputMode="numeric" type="password" value={code} onChange={(event) => setCode(event.target.value)} placeholder="4 digit code" /><button className="primary-btn wide" type="submit">Unlock editing <span>→</span></button></form></div>}
    {modal && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><form className="modal" onSubmit={updatePerson}><div className="modal-top"><div><span className="eyebrow">{modal === 'edit' ? 'EDIT PROFILE' : modal === 'spouse' ? 'ADD SPOUSE' : 'NEW BRANCH'}</span><h2>{modal === 'edit' ? 'Update their story' : modal === 'spouse' ? `Partner for ${selected.name}` : 'Add to the family'}</h2></div><button type="button" className="closeish" onClick={() => setModal(null)}>×</button></div><label>Name<input name="name" defaultValue={modal === 'edit' ? selected.name : ''} required placeholder="Their full name" /></label><div className="field-row"><label>Role<input name="role" defaultValue={modal === 'edit' ? selected.role : 'Spouse'} /></label><label>Born<input name="birth" defaultValue={modal === 'edit' ? selected.birth : ''} placeholder="Year" /></label></div><label>Hometown<input name="location" defaultValue={modal === 'edit' ? selected.location : ''} placeholder="Where they are from" /></label><label>One line about them<textarea name="note" defaultValue={modal === 'edit' ? selected.note : ''} placeholder="A memory, a detail, a feeling..." /></label><button className="primary-btn wide" type="submit">{modal === 'edit' ? 'Save changes' : modal === 'spouse' ? 'Link spouse' : 'Add to the tree'} <span>→</span></button></form></div>}
  </main>
}

createRoot(document.getElementById('root')).render(<App />)

function PersonCard({ person, selectedId, onSelect }) { return <button className={`person-card person-${person.id} ${selectedId === person.id ? 'selected' : ''}`} onClick={() => onSelect(person.id)}><div className="avatar">{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{person.name}</strong><small>{person.role}</small></div><span className="card-arrow">↗</span></button> }

export default App
