import React, { useState, useEffect } from 'react';

const TEMPLATE = "Bonjour [NAME], je crée une IA pour automatiser la paperasse douanière (MACF). Avant de coder, j'aimerais l'avis d'un expert terrain. OK pour 3 questions ici ? Promis, zéro vente.";

export default function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Fetch 'To Contact' leads on load
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
      
      // Clear input and fetch the newly added leads
      setJsonInput('');
      await fetchLeads();
    } catch (e) {
      alert("System Crash: " + e.message);
    }
    setLoading(false);
  };

  const handleAction = async (id, name, url) => {
    // 1. Copy template and open LinkedIn
    const firstName = name.split(' ')[0];
    const message = TEMPLATE.replace('[NAME]', firstName);
    await navigator.clipboard.writeText(message);
    
    // Fix URLs lacking http:// so they don't break as local paths
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(finalUrl, '_blank');

    // 2. Mark as Contacted Optimistically in UI
    setLeads(leads.filter(l => l.id !== id));

    // 3. Update in Notion Backend
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
    return <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>Loading Shared CRM Data...</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Verdyct Shared CRM</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        {leads.length > 0 
          ? `There are ${leads.length} leads waiting to be contacted.` 
          : "Inbox Zero! Time for a new batch of leads."}
      </p>

      {/* Only show the Import Box when all leads are successfully contacted */}
      {leads.length === 0 && (
        <div style={{ marginBottom: '40px' }}>
          <textarea 
            style={{ width: '100%', height: '150px', marginBottom: '10px', padding: '10px' }}
            placeholder="Paste JSON batch here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <button 
            onClick={handleSync} 
            disabled={loading || !jsonInput}
            style={{ width: '100%', padding: '15px', background: 'black', color: 'white', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' }}
          >
            {loading ? 'RUNNING SYNC...' : 'IMPORT BATCH TO NOTION'}
          </button>
        </div>
      )}

      {/* Render the unified list of leads */}
      <div>
        {leads.map((l) => (
          <div key={l.id} onClick={() => handleAction(l.id, l.name, l.url)} style={{ padding: '15px', border: '1px solid #ccc', marginBottom: '10px', cursor: 'pointer', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '18px' }}>{l.name}</strong><br/>
              <small style={{ color: '#888' }}>{l.url}</small>
            </div>
            <div style={{ background: '#eee', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
              Connect →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}