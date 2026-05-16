import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format, isPast, parseISO } from 'date-fns';

// ── Icons (inline SVG helpers) ─────────────────────────────────────────────
const Icon = {
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  plus: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  close: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  trash: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  userMinus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  userPlus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  alert: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  tasks: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  dash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  members: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
};

// ── CreateTaskModal ────────────────────────────────────────────────────────
function CreateTaskModal({ projectId, members, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = { ...form, assigned_to: form.assigned_to || undefined, due_date: form.due_date || undefined };
      const res = await api.post(`/projects/${projectId}/tasks`, payload);
      onCreated(res.data); onClose();
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to create task');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale">
        <div className="modal-header">
          <span className="modal-title">New Task</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>{Icon.close}</button>
        </div>
        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{Icon.alert}{error}</div>}
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Title</label>
            <input className="input" placeholder="What needs to be done?" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="input" rows={3} placeholder="Optional details..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="field">
              <label>Due Date</label>
              <input className="input" type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Assign To</label>
            <select className="input" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AddMemberModal ─────────────────────────────────────────────────────────
function AddMemberModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email, role });
      onAdded(res.data.user, role); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale">
        <div className="modal-header">
          <span className="modal-title">Add Member</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>{Icon.close}</button>
        </div>
        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{Icon.alert}{error}</div>}
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Email Address</label>
            <input className="input" type="email" placeholder="member@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── TaskCard ───────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { color: 'var(--red)',    bg: 'var(--red-soft)',    label: 'High' },
  medium: { color: 'var(--yellow)', bg: 'var(--yellow-soft)', label: 'Medium' },
  low:    { color: 'var(--green)',  bg: 'var(--green-soft)',  label: 'Low' },
};

function TaskCard({ task, isAdmin, onUpdate, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const handleStatus = async (newStatus) => {
    try {
      const res = await api.put(`/projects/${task.project_id}/tasks/${task.id}`, { status: newStatus });
      onUpdate(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
        borderLeft: `3px solid ${p.color}`,
        borderRadius: 12,
        padding: '14px 16px',
        transition: 'all 0.2s',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{task.title}</h4>
        {isAdmin && (
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => onDelete(task.id)}
            style={{ color: 'var(--text-muted)', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', flexShrink: 0 }}
          >{Icon.trash}</button>
        )}
      </div>

      {task.description && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          {task.description}
        </p>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          background: p.bg, color: p.color, border: `1px solid ${p.color}33`,
        }}>{p.label}</span>

        {task.assigned_to_name && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
            background: 'var(--accent-soft)', color: 'var(--accent-hover)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>@{task.assigned_to_name}</span>
        )}

        {task.due_date && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
            background: isOverdue ? 'var(--red-soft)' : 'rgba(255,255,255,0.06)',
            color: isOverdue ? 'var(--red)' : 'var(--text-muted)',
            border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.25)' : 'var(--border)'}`,
          }}>
            {format(parseISO(task.due_date), 'MMM d')}{isOverdue ? ' · overdue' : ''}
          </span>
        )}
      </div>

      {/* Status select */}
      <select
        className="input"
        value={task.status}
        onChange={e => handleStatus(e.target.value)}
        style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8 }}
      >
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}

// ── DashCard ───────────────────────────────────────────────────────────────
function DashCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '20px',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────
function Tab({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '9px 16px', background: 'none', border: 'none',
      borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
      marginBottom: -1,
      color: active ? 'var(--text)' : 'var(--text-muted)',
      fontSize: 14, fontWeight: active ? 600 : 400,
      transition: 'all 0.15s', cursor: 'pointer',
    }}>
      {icon}{label}
    </button>
  );
}

// ── Main ProjectView ───────────────────────────────────────────────────────
export default function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [filter, setFilter] = useState('all');

  const isAdmin = project?.role === 'admin';

  const fetchAll = useCallback(async () => {
    try {
      const [projRes, tasksRes, dashRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
        api.get(`/projects/${id}/dashboard`),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
      setDashboard(dashRes.data);
    } catch (err) {
      if (err.response?.status === 403) navigate('/');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchDashboard = async () => {
    const res = await api.get(`/projects/${id}/dashboard`);
    setDashboard(res.data);
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      fetchDashboard();
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setProject(p => ({ ...p, members: p.members.filter(m => m.id !== userId) }));
    } catch (err) { console.error(err); }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);
  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}
          style={{ marginBottom: 20, gap: 6, fontSize: 13 }}>
          {Icon.back} Back to projects
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {project?.name}
              </h1>
              <span className={`badge badge-${project?.role}`}>{project?.role}</span>
            </div>
            {project?.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 500 }}>{project.description}</p>
            )}
          </div>
          {isAdmin && activeTab === 'tasks' && (
            <button className="btn btn-primary" onClick={() => setShowCreateTask(true)} style={{ gap: 7 }}>
              {Icon.plus} New Task
            </button>
          )}
          {isAdmin && activeTab === 'members' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)} style={{ gap: 7 }}>
              {Icon.userPlus} Add Member
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        <Tab active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={Icon.tasks} label="Tasks" />
        <Tab active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={Icon.dash} label="Dashboard" />
        <Tab active={activeTab === 'members'} onClick={() => setActiveTab('members')} icon={Icon.members}
          label={`Members (${project?.members?.length ?? 0})`} />
      </div>

      {/* ── Tasks Tab ─────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="animate-fade">
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'todo', label: 'To Do' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'done', label: 'Done' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                background: filter === f.key
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                  : 'rgba(255,255,255,0.05)',
                color: filter === f.key ? '#fff' : 'var(--text-muted)',
                boxShadow: filter === f.key ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
              }}>{f.label}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Kanban */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { key: 'todo',        label: 'To Do',       color: 'rgba(255,255,255,0.3)' },
              { key: 'in_progress', label: 'In Progress', color: 'var(--yellow)' },
              { key: 'done',        label: 'Done',        color: 'var(--green)' },
            ].map(col => (
              <div key={col.key}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{col.label}</span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontWeight: 600,
                  }}>{tasksByStatus[col.key].length}</span>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasksByStatus[col.key].map(task => (
                    <TaskCard key={task.id} task={task} isAdmin={isAdmin}
                      onUpdate={updated => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                  {tasksByStatus[col.key].length === 0 && (
                    <div style={{
                      border: '1px dashed rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '24px 16px',
                      textAlign: 'center', fontSize: 13, color: 'var(--text-muted)',
                    }}>No tasks</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dashboard Tab ─────────────────────────── */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="animate-fade">
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            <DashCard label="Total" value={dashboard.total} color="var(--accent-hover)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
            />
            <DashCard label="To Do" value={dashboard.by_status.todo} color="var(--text-dim)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>}
            />
            <DashCard label="In Progress" value={dashboard.by_status.in_progress} color="var(--yellow)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            />
            <DashCard label="Done" value={dashboard.by_status.done} color="var(--green)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            />
          </div>

          {/* Overdue alert */}
          {dashboard.overdue > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              background: 'var(--red-soft)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, marginBottom: 24, color: 'var(--red)', fontSize: 14,
            }}>
              {Icon.alert}
              <strong>{dashboard.overdue}</strong> overdue task{dashboard.overdue !== 1 ? 's' : ''}
            </div>
          )}

          {/* Progress bar */}
          {dashboard.total > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Overall Progress</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                  {Math.round((dashboard.by_status.done / dashboard.total) * 100)}% complete
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((dashboard.by_status.done / dashboard.total) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--green))',
                  borderRadius: 3, transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          )}

          {/* Per-member */}
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            Tasks per member
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dashboard.by_user.map(u => {
              const pct = parseInt(u.task_count) > 0 ? Math.round((u.done_count / u.task_count) * 100) : 0;
              return (
                <div key={u.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: parseInt(u.task_count) > 0 ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{u.name[0].toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.task_count} tasks · {u.done_count} done</div>
                      </div>
                    </div>
                    {parseInt(u.task_count) > 0 && (
                      <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>{pct}%</span>
                    )}
                  </div>
                  {parseInt(u.task_count) > 0 && (
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--accent), var(--green))',
                        borderRadius: 2, transition: 'width 0.5s ease',
                      }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Members Tab ───────────────────────────── */}
      {activeTab === 'members' && (
        <div className="animate-fade">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {project?.members?.map(m => (
              <div key={m.id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'border-color 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0,
                  }}>{m.name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.name}
                      {m.id === user?.id && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(you)</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                  {isAdmin && m.id !== user?.id && (
                    <button className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleRemoveMember(m.id)}
                      style={{ color: 'var(--text-muted)' }} title="Remove member">
                      {Icon.userMinus}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateTask && (
        <CreateTaskModal projectId={id} members={project?.members || []}
          onClose={() => setShowCreateTask(false)}
          onCreated={task => { setTasks(prev => [task, ...prev]); fetchDashboard(); }}
        />
      )}
      {showAddMember && (
        <AddMemberModal projectId={id}
          onClose={() => setShowAddMember(false)}
          onAdded={(u, role) => setProject(p => ({ ...p, members: [...p.members, { ...u, role }] }))}
        />
      )}
    </div>
  );
}
