import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable.jsx';
import { listContactMessages, updateContactMessage } from '../../supabase/api.js';
import { formatDate } from '../../utils/format.js';

export default function ContactMessageManager() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadMessages() {
    setLoading(true);
    listContactMessages()
      .then(setMessages)
      .catch((error) => toast.error(error.message || 'Contact messages failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadMessages, []);

  async function changeStatus(id, status) {
    try {
      await updateContactMessage(id, { status });
      toast.success('Message updated.');
      loadMessages();
    } catch (error) {
      toast.error(error.message || 'Message update failed.');
    }
  }

  const columns = [
    { key: 'created_at', label: 'Date', render: (row) => formatDate(row.created_at) },
    {
      key: 'sender',
      label: 'Sender',
      render: (row) => (
        <div>
          <p className="font-bold">{row.name || 'Unknown'}</p>
          <a className="text-xs font-semibold text-brand-blue hover:text-brand-red" href={`mailto:${row.email}`}>{row.email}</a>
        </div>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (row) => (
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-red">{row.type}</p>
          <p className="mt-1 font-bold">{row.subject || 'No subject'}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{row.message}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <select className="input min-w-32" value={row.status} onChange={(event) => changeStatus(row.id, event.target.value)}>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="resolved">Resolved</option>
          <option value="spam">Spam</option>
        </select>
      ),
    },
  ];

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Contact Inbox</h1>
          <p className="mt-2 text-sm text-gray-600">Messages from the public contact page appear here for superadmin/admin review.</p>
        </div>
        <button className="btn-secondary" onClick={loadMessages}>Refresh</button>
      </div>
      <AdminTable columns={columns} rows={messages} empty={loading ? 'Loading messages...' : 'No contact messages yet.'} />
    </section>
  );
}
