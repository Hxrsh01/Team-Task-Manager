import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format, isPast, parseISO } from 'date-fns';
import {
  ArrowLeft, Plus, Users, LayoutDashboard, ListTodo,
  X, Trash2, UserMinus, UserPlus, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';

// ─── Modals ────────────────────────────────────────────────────────────────

function CreateTaskModal({ projectId, members, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = { ...form, assigned_to: form.assigned_to || undefined, due_date: form.due_date || undefined };
      const res = await api.post(`/projects/${projectId}/tasks`, payload);
      onCreated(res.data); onClose();
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Task</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <div className="error-msg" style={{ marginBottom: 14 }}>{error}</div>}
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Title</label>
            <input className="input" placeholder="Task title" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="input" rows={3} placeholder="Optional details..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }} />
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
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
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

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState(''); const [role, setRole] = useState('member');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email, role });
      onAdded(res.data.user, role); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add Member</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <div className="error-msg" style={{ marginBottom: 14 }}>{error}</div>}
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Email Address</label>
            <input className="input" type="email" placeholder="member@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
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

// ─── TaskCard ──────────────────────────────────────────────────────────────

function TaskCard({ task, isAdmin, onUpdate, onDelete, members }) {
  const [editing, setEditing] = useState(false);
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';

  const handleStatus = async (newStatus) => {
    try {
      const updated = await api.put(`/projects/${task.project_id}/tasks/${task.id}`, { status: newStatus });
      onUpdate(updated.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="card" style={{
      padding: 16, transition: 'all 0.2s',
      borderLeft: `3px solid ${task.priority === 'high' ? 'var(--red)' : task.priority === 'medium' ? 'var(--yellow)' : 'var(--green)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{task.title}</h4>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {isAdmin && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(task.id)}
              style={{ color: 'var(--text-muted)' }} title="Delete">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{task.description}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {task.assigned_to_name && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20,
            background: 'var(--accent-soft)', color: 'var(--accent-hover)',
            border: '1px solid rgba(99,102,241,0.3)', fontWeight: 500,
          }}>@{task.assigned_to_name}</span>
        )}
        {task.due_date && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20,
            background: isOverdue ? 'var(--red-soft)' : 'var(--bg-hover)',
            color: isOverdue ? 'var(--red)' : 'var(--text-muted)',
            border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
            fontWeight: 500,
          }}>
            {format(parseISO(task.due_date), 'MMM d')}
            {isOverdue && ' · overdue'}
          </span>
        )}
      </div>

      {/* Status control */}
      <select
        className="input"
        value={task.status}
        onChange={e => handleStatus(e.target.value)}
        style={{ fontSize: 12, padding: '5px 10px' }}
      >
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}

// ─── Main ProjectView ──────────────────────────────────────────────────────

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

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      fetchDashboard();
    } catch (err) { console.error(err); }
  };

  const fetchDashboard = async () => {
    const res = await api.get(`/projects/${id}/dashboard`);
    setDashboard(res.data);
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
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 16, gap: 6 }}>
          <ArrowLeft size={14} /> Back to projects
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{project?.name}</h1>
              <span className={`badge badge-${project?.role}`}>{project?.role}</span>
            </div>
            {project?.description && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{project.description}</p>}
          </div>
          {isAdmin && activeTab === 'tasks' && (
            <button className="btn btn-primary" onClick={() => setShowCreateTask(true)}>
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { key: 'tasks', label: 'Tasks', icon: <ListTodo size={15} /> },
          { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
          { key: 'members', label: `Members (${project?.members?.length})`, icon: <Users size={15} /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 14px', background: 'none', border: 'none',
            borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1,
            color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
            fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 400,
            transition: 'all 0.15s', cursor: 'pointer',
          }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['all', 'todo', 'in_progress', 'done'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}>
                {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Kanban columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { key: 'todo', label: 'To Do', color: 'var(--text-muted)' },
              { key: 'in_progress', label: 'In Progress', color: 'var(--yellow)' },
              { key: 'done', label: 'Done', color: 'var(--green)' },
            ].map(col => (
              <div key={col.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>{col.label}</span>
                  <span style={{
                    fontSize: 11, padding: '1px 7px', borderRadius: 10,
                    background: 'var(--bg-hover)', color: 'var(--text-muted)',
                  }}>{tasksByStatus[col.key].length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tasksByStatus[col.key].map(task => (
                    <TaskCard key={task.id} task={task} isAdmin={isAdmin}
                      members={project?.members || []}
                      onUpdate={updated => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                  {tasksByStatus[col.key].length === 0 && (
                    <div style={{
                      border: '1px dashed var(--border)', borderRadius: 10, padding: '20px',
                      textAlign: 'center', fontSize: 13, color: 'var(--text-muted)',
                    }}>
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="animate-fade">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            <DashCard label="Total Tasks" value={dashboard.total} color="var(--accent)" />
            <DashCard label="To Do" value={dashboard.by_status.todo} color="var(--text-muted)" />
            <DashCard label="In Progress" value={dashboard.by_status.in_progress} color="var(--yellow)" />
            <DashCard label="Done" value={dashboard.by_status.done} color="var(--green)" />
          </div>

          {dashboard.overdue > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              background: 'var(--red-soft)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, marginBottom: 24, color: 'var(--red)', fontSize: 14,
            }}>
              <AlertCircle size={16} /> <strong>{dashboard.overdue}</strong> overdue task{dashboard.overdue !== 1 ? 's' : ''}
            </div>
          )}

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Tasks per member</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dashboard.by_user.map(u => (
              <div key={u.id} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--accent-hover)',
                    }}>{u.name[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.task_count} tasks · {u.done_count} done</div>
                    </div>
                  </div>
                  {parseInt(u.task_count) > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={13} />
                      {Math.round((u.done_count / u.task_count) * 100)}% complete
                    </div>
                  )}
                </div>
                {parseInt(u.task_count) > 0 && (
                  <div style={{ marginTop: 10, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.round((u.done_count / u.task_count) * 100)}%`,
                      background: 'var(--green)', borderRadius: 2, transition: 'width 0.5s ease',
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="animate-fade">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>
                <UserPlus size={14} /> Add Member
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {project?.members?.map(m => (
              <div key={m.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: 'var(--accent-hover)',
                  }}>{m.name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.name}
                      {m.id === user?.id && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                  {isAdmin && m.id !== user?.id && (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveMember(m.id)}
                      style={{ color: 'var(--text-muted)' }} title="Remove">
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

function DashCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
