import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable.jsx';
import ConfirmButton from '../../components/common/ConfirmButton.jsx';
import { formatDate } from '../../utils/format.js';
import { deleteComment, listComments, updateComment, updateProfileAdmin } from '../../supabase/api.js';

export default function CommentManager() {
  const [rows, setRows] = useState([]);

  function load() {
    listComments().then(setRows).catch((error) => toast.error(error.message));
  }

  useEffect(load, []);

  async function setStatus(id, status) {
    try {
      const updated = await updateComment(id, { status });
      setRows((items) => items.map((item) => (item.id === id ? updated : item)));
      toast.success('Comment updated.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function banUser(userId) {
    try {
      await updateProfileAdmin(userId, { status: 'banned', bannedReason: 'Abusive or vulgar comments' });
      toast.success('User banned.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function remove(id) {
    try {
      await deleteComment(id);
      setRows((items) => items.filter((item) => item.id !== id));
      toast.success('Comment deleted.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <section>
      <h1 className="mb-6 text-2xl font-extrabold">Comment Moderation</h1>
      <AdminTable
        rows={rows}
        columns={[
          { key: 'text', label: 'Comment' },
          { key: 'userEmail', label: 'User' },
          { key: 'status', label: 'Status' },
          {
            key: 'moderationReason',
            label: 'Highlight',
            render: (row) => row.moderationReason ? <span className="rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{row.moderationReason}</span> : <span className="text-xs text-gray-400">Clean</span>,
          },
          { key: 'reportsCount', label: 'Reports' },
          { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => setStatus(row.id, 'approved')}>Approve</button>
                <button className="btn-secondary" onClick={() => setStatus(row.id, 'hidden')}>Hide</button>
                <button className="btn-primary" onClick={() => banUser(row.userId)}>Ban User</button>
                <ConfirmButton message="Delete this comment?" onConfirm={() => remove(row.id)} />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
