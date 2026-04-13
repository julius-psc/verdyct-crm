import React, { useState, useEffect } from 'react';
import verdyctLogo from './assets/images/verdyct-logo.png';

const TEMPLATE = "Bonjour [NAME], je crée une IA pour automatiser la paperasse douanière (MACF). Avant de coder, j'aimerais l'avis d'un expert terrain. OK pour 3 questions ici ? Promis, zéro vente.";

export default function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const fetchLeads = async () => {
    setInitializing(true);
    try {
      const res = await fetch('/api/getLeads');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLeads(data.leads || []);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch leads: " + e.message);
    }
    setInitializing(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      const parsedLeads = JSON.parse(jsonInput);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: parsedLeads })
      });
      const data = await res.json();
      if (data.error) {
        alert("Notion Database Error:\n" + data.error);
        setLoading(false);
        return;
      }
      setJsonInput('');
      await fetchLeads();
    } catch (e) {
      alert("System Crash: " + e.message);
    }
    setLoading(false);
  };

  const getFirstName = (rawName) => {
    let clean = rawName.replace(/-[0-9a-zA-Z]+$/, '');
    if (!clean.includes(' ') && clean.includes('-')) {
      clean = clean.replace(/-/g, ' ');
    }
    let first = clean.split(' ')[0];
    first = first.replace(/[^a-zA-ZÀ-ÿ-]/g, '');
    if (first.length > 0) {
      return first.split('-').map(part =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join('-');
    }
    return '';
  };

  const handleAction = async (id, name, url) => {
    const firstName = getFirstName(name) || 'Expert';
    const message = TEMPLATE.replace('[NAME]', firstName);
    await navigator.clipboard.writeText(message);
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(finalUrl, '_blank');
    setLeads(leads.filter(l => l.id !== id));
    try {
      await fetch('/api/updateLead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error("Failed to update status in Notion");
    }
  };

  if (initializing) {
    return (
      <div id="root">
        <div className="app">
          <img src={verdyctLogo} alt="Verdyct" className="logo" />
          <p className="loading">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <img src={verdyctLogo} alt="Verdyct" className="logo" />
        <h1 className="title">Verdyct CRM</h1>
        <p className="subtitle">
          {leads.length > 0
            ? `${leads.length} lead${leads.length > 1 ? 's' : ''} to contact`
            : 'Inbox zero.'}
        </p>
      </div>

      {leads.length === 0 && (
        <div className="import-section">
          <textarea
            placeholder="Paste JSON batch here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <button onClick={handleSync} disabled={loading || !jsonInput}>
            {loading ? 'Syncing...' : 'Import Batch'}
          </button>
        </div>
      )}

      {leads.length > 0 && <div className="divider" />}

      <div className="leads">
        {leads.map((l) => (
          <div key={l.id} className="lead-card" onClick={() => handleAction(l.id, l.name, l.url)}>
            <div>
              <span className="lead-card-name">{l.name}</span>
              <span className="lead-card-url">{l.url}</span>
            </div>
            <span className="lead-card-action">Connect →</span>
          </div>
        ))}
      </div>
    </div>
  );
}
