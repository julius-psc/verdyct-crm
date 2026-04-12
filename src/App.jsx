import React, { useState } from 'react';

const TEMPLATE = "Bonjour [NAME], j'ai vu votre profil en tant que Déclarant en douane...";

export default function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    console.log("1. Sync Button Clicked");
    setLoading(true);
    
    try {
      console.log("2. Parsing JSON...");
      const parsedLeads = JSON.parse(jsonInput);
      console.log("3. JSON Parsed successfully:", parsedLeads);

      console.log("4. Sending to API...");
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: parsedLeads })
      });

      console.log("5. API Response received. Status:", res.status);
      
      const data = await res.json();
      console.log("6. Data parsed from JSON:", data);

      if (data.results) {
        const added = data.results.filter(r => r.status === 'added');
        console.log("7. Leads to be added to UI:", added);
        setLeads(added);
        if (added.length === 0) alert("Sync complete: No new leads found (all duplicates).");
      } else {
        console.error("API returned no results key:", data);
      }

    } catch (e) {
      console.error("CRASH IN FRONTEND:", e);
      alert("System Crash: " + e.message);
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
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Verdyct Lead Sync</h1>
      <textarea 
        style={{ width: '100%', height: '150px', marginBottom: '10px' }}
        placeholder="Paste JSON here..."
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
      />
      <button 
        onClick={handleSync} 
        disabled={loading}
        style={{ width: '100%', padding: '15px', background: 'black', color: 'white', cursor: 'pointer' }}
      >
        {loading ? 'RUNNING SYNC...' : 'START SYNC'}
      </button>

      <div style={{ marginTop: '30px' }}>
        {leads.map((l, i) => (
          <div key={i} onClick={() => handleAction(l.name, l.url)} style={{ padding: '15px', border: '1px solid #ccc', marginBottom: '10px', cursor: 'pointer', borderRadius: '8px' }}>
            <strong>{l.name}</strong><br/>
            <small>Click to open & copy message</small>
          </div>
        ))}
      </div>
    </div>
  );
}