async function renderTransactionsView(container) {
  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Type</th>
            <th>Description</th>
            <th>Référence</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody id="tx-tbody">
          <tr><td colspan="6">Chargement...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const { data: transactions } = await supabaseClient
    .from('transactions')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('tx-tbody');

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Aucune transaction comptabilisée.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
      <td><strong>${t.profiles?.full_name || 'N/A'}</strong></td>
      <td><span class="badge" style="background:#E2E8F0; color:#1E293B;">${t.type}</span></td>
      <td>${t.description || '-'}</td>
      <td><code>${t.reference || 'N/A'}</code></td>
      <td>
        <strong style="color: ${t.type === 'deposit' || t.type === 'credit' ? 'var(--status-green)' : 'var(--text-main)'};">
          ${t.type === 'debit' ? '-' : '+'}${Number(t.amount).toLocaleString()} FCFA
        </strong>
      </td>
    </tr>
  `).join('');
}