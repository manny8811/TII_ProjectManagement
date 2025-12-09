import React, { useEffect, useState } from "react";

/*
Simplified TII Project Tracker (React + Tailwind)
- LocalStorage persistence
- Login with roles (admin/team)
- Project CRUD
- Protected Resources: Team members can view but not copy/paste/download; links clickable
*/

const STORAGE_KEY = "tii_projects_vite_v1";
const USER_KEY = "tii_user_v1";

const defaultUsers = {
  admin: "admin123",
  user1: "pass123",
  user2: "pass456",
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function now() {
  return new Date().toLocaleString();
}

const seed = [
  {
    id: uid(),
    name: "Robotics for Rural Schools",
    description: "Deploy 50 kits and train teachers in remote regions",
    assignedTo: "user1",
    deadline: "2026-03-15",
    progress: 30,
    status: "ongoing",
    resources: "https://example.com/kit-manual\nGoogle Drive: https://drive.google.com/",
    comments: [],
    editHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function App() {
  const [projects, setProjects] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    } catch {
      return seed;
    }
  });

  const [user, setUser] = useState(() => localStorage.getItem(USER_KEY) || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", assignedTo: "", deadline: "" });
  const [query, setQuery] = useState("");

  const role = user === "admin" ? "admin" : user ? "member" : null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, user);
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  // Global handlers to make copying harder for team members (but allow links click)
  useEffect(() => {
    const handler = (e) => {
      // Block common copy shortcuts only for non-admins
      if (role !== "admin") {
        if (e.ctrlKey && ["c", "x", "s", "p", "u"].includes(e.key && e.key.toLowerCase())) {
          e.preventDefault();
          // optional visual feedback
        }
      }
    };
    const copyHandler = (e) => {
      if (role !== "admin") {
        // prevent copying selected text (for team members)
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handler);
    document.addEventListener("copy", copyHandler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("copy", copyHandler);
    };
  }, [role]);

  function login() {
    const { username, password } = loginForm;
    if (!username || !password) return alert("Enter username & password");
    if (defaultUsers[username] && defaultUsers[username] === password) {
      setUser(username);
      setLoginForm({ username: "", password: "" });
    } else {
      alert("Invalid credentials");
    }
  }

  function logout() {
    setUser("");
  }

  function addProject() {
    if (!newProject.name || !newProject.assignedTo || !newProject.deadline) return alert("Fill required fields");
    const p = {
      ...newProject,
      id: uid(),
      progress: 0,
      status: "ongoing",
      comments: [],
      editHistory: [{ id: uid(), user: user || "system", field: "created", oldValue: "N/A", newValue: "created", ts: now() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects((s) => [p, ...s]);
    setNewProject({ name: "", description: "", assignedTo: "", deadline: "" });
    setShowModal(false);
  }

  function updateProject(id, field, value) {
    setProjects((s) =>
      s.map((p) => {
        if (p.id !== id) return p;
        const old = p[field];
        const updated = { ...p, [field]: value, updatedAt: new Date().toISOString() };
        if (old !== value) {
          updated.editHistory = [...(p.editHistory || []), { id: uid(), user: user || "system", field, oldValue: String(old).slice(0, 200), newValue: String(value).slice(0, 200), ts: now() }];
        }
        return updated;
      })
    );
  }

  function deleteProject(id) {
    if (!confirm("Delete project?")) return;
    setProjects((s) => s.filter((p) => p.id !== id));
  }

  function exportAll() {
    const dataStr = JSON.stringify({ projects, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tii-projects-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        if (obj.projects && Array.isArray(obj.projects)) setProjects(obj.projects);
        else if (Array.isArray(obj)) setProjects(obj);
        else alert("Unknown format");
      } catch {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  }

  const filtered = projects.filter((p) => (p.name + " " + p.description + " " + (p.assignedTo || "")).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded flex items-center justify-center text-white font-bold">TII</div>
            <div>
              <h1 className="text-2xl font-bold">TII Project Tracker</h1>
              <p className="text-sm text-gray-600">Local-first • Free hosting • Vite + React</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="px-3 py-1 bg-gray-100 rounded">{role === "admin" ? "Admin" : user}</div>
                <button className="px-3 py-2 border rounded" onClick={logout}>Logout</button>
              </>
            ) : (
              <div className="flex gap-2 items-center">
                <input className="border p-2 rounded" placeholder="username" value={loginForm.username} onChange={(e)=>setLoginForm(f=>({...f,username:e.target.value}))} />
                <input className="border p-2 rounded" placeholder="password" type="password" value={loginForm.password} onChange={(e)=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={(e)=> e.key==='Enter' && login()} />
                <button className="px-3 py-2 bg-orange-600 text-white rounded" onClick={login}>Login</button>
              </div>
            )}
          </div>
        </header>

        <main>
          <div className="mb-4 flex gap-2">
            <input className="flex-1 border p-2 rounded" placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} />
            <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={()=>setShowModal(true)}>➕ Add</button>
            <button className="px-3 py-2 border rounded" onClick={exportAll}>Export</button>
            <label className="px-3 py-2 border rounded cursor-pointer">
              Import
              <input type="file" className="hidden" accept="application/json" onChange={(e)=> { if(e.target.files[0]) importFile(e.target.files[0]); e.target.value=''; }} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.length===0 ? <div className="p-6 bg-white rounded shadow text-center">No projects</div> : filtered.map(p=>(
              <div key={p.id} className="bg-white rounded shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{role==="admin" ? <input className="font-semibold border-b" defaultValue={p.name} onBlur={(e)=>updateProject(p.id,'name',e.target.value)} /> : p.name}</h3>
                    <div className="text-sm text-gray-500">Assigned: <strong>{p.assignedTo}</strong> • Deadline: <strong>{p.deadline}</strong></div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <div>{new Date(p.updatedAt).toLocaleString()}</div>
                    <div className="text-xs">{p.progress}%</div>
                  </div>
                </div>

                <p className="mt-3 text-sm">{role==="admin" ? <textarea className="w-full p-2 border rounded" defaultValue={p.description} onBlur={(e)=>updateProject(p.id,'description',e.target.value)} /> : p.description}</p>

                <div className="mt-3">
                  <label className="text-sm font-semibold">Progress</label>
                  <input type="range" min="0" max="100" value={p.progress} onChange={(e)=>updateProject(p.id,'progress',parseInt(e.target.value))} className="w-full" />
                </div>

                <div className="mt-3">
                  <label className="text-sm font-semibold">Resources</label>
                  {role==="admin" ? (
                    <textarea className="w-full p-2 border rounded" defaultValue={p.resources} onBlur={(e)=>updateProject(p.id,'resources',e.target.value)} />
                  ) : (
                    <ProtectedResourceBox content={p.resources} />
                  )}
                </div>

                <div className="mt-3 flex gap-2 items-center">
                  <select value={p.status} onChange={(e)=>updateProject(p.id,'status',e.target.value)} className="p-1 border rounded">
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="complications">Complications</option>
                    <option value="terminated">Terminated</option>
                  </select>

                  <div className="ml-auto flex gap-2">
                    {role==="admin" && <button className="py-1 px-2 bg-red-600 text-white rounded" onClick={()=>deleteProject(p.id)}>Delete</button>}
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-sm font-semibold">Feedback</label>
                  <textarea className="w-full p-2 border rounded" defaultValue={p.feedback || ""} onBlur={(e)=>updateProject(p.id,'feedback',e.target.value)} />
                </div>

                {role==="admin" && (
                  <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                    <strong>Edit history</strong>
                    <div className="max-h-40 overflow-y-auto mt-2">
                      {(p.editHistory || []).slice().reverse().map(h=>(
                        <div key={h.id} className="border-b py-1">
                          <div className="font-semibold text-xs">{h.user} • {h.field} • {h.ts}</div>
                          <div className="text-xs text-gray-500">{h.oldValue} → {h.newValue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e)=> { if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-3">Add New Project</h3>
            <input className="w-full p-2 border rounded mb-2" placeholder="Project name" value={newProject.name} onChange={(e)=>setNewProject(n=>({...n,name:e.target.value}))} />
            <textarea className="w-full p-2 border rounded mb-2" placeholder="Description" value={newProject.description} onChange={(e)=>setNewProject(n=>({...n,description:e.target.value}))} />
            <input className="w-full p-2 border rounded mb-2" placeholder="Assigned to" value={newProject.assignedTo} onChange={(e)=>setNewProject(n=>({...n,assignedTo:e.target.value}))} />
            <input className="w-full p-2 border rounded mb-2" placeholder="Deadline (YYYY-MM-DD)" value={newProject.deadline} onChange={(e)=>setNewProject(n=>({...n,deadline:e.target.value}))} />
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-green-600 text-white rounded" onClick={addProject}>Create</button>
              <button className="flex-1 py-2 border rounded" onClick={()=>setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ProtectedResourceBox - team members can view but not copy or download. Links are clickable.
function ProtectedResourceBox({ content }) {
  // Render plain text but intercept copy/context/selection events
  useEffect(() => {
    const ctxHandler = (e) => {
      // Allow click, but block right-click context menu
      e.preventDefault();
    };
    const dragHandler = (e) => e.preventDefault();
    document.addEventListener("contextmenu", ctxHandler);
    document.addEventListener("dragstart", dragHandler);
    return () => {
      document.removeEventListener("contextmenu", ctxHandler);
      document.removeEventListener("dragstart", dragHandler);
    };
  }, []);

  // Allow links to be clicked by rendering anchors, but prevent copying the text by blocking copy events at element level
  const onCopy = (e) => {
    e.preventDefault();
  };

  // Split content into lines and detect URLs to render anchors
  const parts = (content || "").split(/\n/).map((line, idx) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (urlRegex.test(line)) {
      const segments = line.split(urlRegex).filter(Boolean);
      return (
        <div key={idx} className="text-sm">
          {segments.map((seg, i) => {
            if (urlRegex.test(seg)) {
              return <a key={i} href={seg} target="_blank" rel="noreferrer" className="underline text-blue-600" onClick={(e)=>{ /* clickable */ }}>{seg}</a>;
            }
            return <span key={i}>{seg}</span>;
          })}
        </div>
      );
    }
    return <div key={idx} className="text-sm">{line}</div>;
  });

  return (
    <div
      className="p-3 bg-amber-100 border border-amber-300 rounded text-sm select-none"
      onCopy={onCopy}
      onCut={(e)=>e.preventDefault()}
      onPaste={(e)=>e.preventDefault()}
      // prevent selection programmatically for most browsers
      style={{ userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none" }}
    >
      <div className="font-semibold text-amber-700 mb-1">🔒 Protected Resources (view only)</div>
      <div>{parts}</div>
    </div>
  );
}
