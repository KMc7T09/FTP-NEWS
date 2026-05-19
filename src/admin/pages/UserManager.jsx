import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable.jsx';
import { formatDate } from '../../utils/format.js';
import { listProfiles, updateProfileAdmin } from '../../supabase/api.js';

export default function UserManager() {
  const [rows, setRows] = useState([]);
  const [term, setTerm] = useState('');
  const filtered = rows.filter((user) => [user.name, user.email, user.uid, user.role, user.status].join(' ').toLowerCase().includes(term.toLowerCase()));

  function load() {
    listProfiles().then(setRows).catch((error) => toast.error(error.message));
  }

  useEffect(load, []);

  async function updateUser(id, updates) {
    try {
      const updated = await updateProfileAdmin(id, updates);
      setRows((users) => users.map((user) => (user.id === id ? updated : user)));
      toast.success('User updated.');
    } catch (error) {
      toast.error(error.message || 'User update failed.');
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Users</h1>
        <input className="input max-w-sm" placeholder="Search users" value={term} onChange={(event) => setTerm(event.target.value)} />
      </div>
      <AdminTable
        rows={filtered}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'uid', label: 'UID' },
          { key: 'createdAt', label: 'Joined', render: (row) => formatDate(row.createdAt) },
          {
            key: 'role',
            label: 'Role',
            render: (row) => (
              <select className="input min-w-32" value={row.role} onChange={(event) => updateUser(row.id, { role: event.target.value })}>
                <option value="user">user</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <button
                className={row.status === 'banned' ? 'btn-secondary' : 'btn-primary'}
                onClick={() => updateUser(row.id, { status: row.status === 'banned' ? 'active' : 'banned', bannedReason: row.status === 'banned' ? '' : 'Admin moderation action' })}
              >
                {row.status === 'banned' ? 'Unban' : 'Ban'}
              </button>
            ),
          },
        ]}
      />
    </section>
  );
}
