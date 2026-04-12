import React, { useState } from 'react';

const TEMPLATE = "Bonjour [NAME], j'ai vu votre profil en tant que Déclarant en douane et je serais ravi d'échanger avec vous.";

export default function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);

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
      // Show only the "Added" leads for the daily list
      setLeads(data.results.filter(r => r.status === 'added'));
      setJsonInput('');
    } catch (e) {
      alert("Invalid JSON or Server Error");
    }
    setLoading(false);
  };

  const handleAction = async (name, url) => {
    const firstName = name.split(' ')[0];
    const message = TEMPLATE.replace('[NAME]', firstName);
    
    // Copy template and open LinkedIn
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
        <button onClick={handleSync} disabled={loading}>
          {loading ? 'Syncing with Notion...' : 'Sync Fresh Leads'}
        </button>
      </section>

      <section className="leads-grid">
        <div className="column">
          <h3>Today's Pipeline ({leads.length})</h3>
          {leads.map((lead, i) => (
            <div key={i} className="lead-card" onClick={() => handleAction(lead.name, lead.url)}>
              <div className="info">
                <strong>{lead.name}</strong>
                <span>Click to Connect & Copy Msg</span>
              </div>
              <div className="arrow">→</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
