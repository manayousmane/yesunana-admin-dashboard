async function renderTransactionsView(container) {
  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Libellé / Type</th>
            <th>Montant</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody id="tx-tbody">
          <tr><td colspan="5">Chargement...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const { data: transactions } = await supabaseClient.from('transactions').select('*, profiles(full_name)').order('created_at', { ascending: false });
  const tbody = document.getElementById('tx-tbody');

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Aucune transaction enregistrée.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
      <td><strong>${t.profiles?.full_name || 'N/A'}</strong></td>
      <td>${t.title || t.type}</td>
      <td><strong style="color: ${t.type === 'Dépôt' ? 'var(--status-green)' : 'var(--text-main)'};">${Number(t.amount).toLocaleString()} FCFA</strong></td>
      <td><span class="badge badge-approved">${t.status || 'Validé'}</span></td>
    </tr>
  `).join('');
}