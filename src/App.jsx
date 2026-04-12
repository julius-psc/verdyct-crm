import React, { useState } from 'react';

const TEMPLATE = "Bonjour [NAME], j'ai vu votre profil en tant que Déclarant en douane...";

export default function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ added: 0, skipped: 0 });
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    setStats({ added: 0, skipped: 0 });
    try {
      const parsedLeads = JSON.parse(jsonInput);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: parsedLeads })
      });
      
      const data = await res.json();
      console.log("Server Response:", data);

      const added = data.results.filter(r => r.status === 'added');
      const skipped = data.results.filter(r => r.status === 'duplicate');
      
      setLeads(added);
      setStats({ added: added.length, skipped: skipped.length });
      setJsonInput('');
    } catch (e) {
      alert("Error: Check console or JSON format");
      console.error(e);
    }
    setLoading(false);
  };

  const handleAction = async (name, url) => {
    const firstName = name.split(' ')[0];
    const message = TEMPLATE.replace('[NAME]', firstName);
    await navigator.clipboard.writeText(message);
    window.open(url, '_blank');
  };

  return (
    <div className="container">
      <header>
        <div className="eyebrow">Verdyct CRM</div>
        <h1>Prospecting <span>Dashboard</span></h1>
      </header>

      <section className="input-zone">
        <textarea 
          placeholder="Paste Claude JSON here..." 
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />
        <button onClick={handleSync} disabled={loading || !jsonInput}>
          {loading ? 'Processing...' : 'Sync with Notion'}
        </button>
      </section>

      {stats.added > 0 || stats.skipped > 0 ? (
        <div className="stats-bar">
          <span className="stat-ok">✅ {stats.added} Added</span>
          <span className="stat-info">⏭️ {stats.skipped} Already in CRM</span>
        </div>
      ) : null}

      <section className="leads-grid">
        <h3>Today's New Batch</h3>
        {leads.length === 0 && !loading && <p className="empty-msg">No new leads to show. Try a different batch!</p>}
        {leads.map((lead, i) => (
          <div key={i} className="lead-card" onClick={() => handleAction(lead.name, lead.url)}>
            <div className="info">
              <strong>{lead.name}</strong>
              <span className="url-preview">{lead.url}</span>
            </div>
            <div className="arrow">Connect & Copy →</div>
          </div>
        ))}
      </section>
    </div>
  );
}
