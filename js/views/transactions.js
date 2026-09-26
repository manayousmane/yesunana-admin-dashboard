async function renderTransactionsView(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap;">
        <input type="text" id="tx-search" class="form-control" style="max-width: 320px;" placeholder="Rechercher par référence, description ou utilisateur...">
        <div style="display: flex; align-items: center; color: var(--text-muted); font-size: 13px;" id="tx-count-badge">
          Chargement...
        </div>
      </div>
    </div>

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
          <tr><td colspan="6" style="text-align:center; padding: 24px;">Chargement de l'historique des transactions...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // Récupération directe sans dépendre de jointure PostgREST
  const [
    { data: transactions, error: txError },
    { data: profiles }
  ] = await Promise.all([
    supabaseClient.from('transactions').select('*').order('created_at', { ascending: false }),
    supabaseClient.from('profiles').select('id, full_name, phone')
  ]);

  const tbody = document.getElementById('tx-tbody');
  const countBadge = document.getElementById('tx-count-badge');

  if (txError) {
    console.error("Erreur transactions :", txError);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#DC2626; padding: 24px;">Erreur de chargement : ${txError.message}</td></tr>`;
    if (countBadge) countBadge.textContent = 'Erreur';
    return;
  }

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">Aucune transaction enregistrée dans le système.</td></tr>`;
    if (countBadge) countBadge.textContent = '0 transaction';
    return;
  }

  if (countBadge) countBadge.textContent = `${transactions.length} transaction${transactions.length > 1 ? 's' : ''}`;

  const profilesMap = {};
  (profiles || []).forEach(p => {
    profilesMap[p.id] = p.full_name || p.phone || 'Utilisateur';
  });

  function displayTransactions(list) {
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">Aucune transaction correspondant à votre recherche.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(t => {
      const userName = profilesMap[t.user_id] || 'Utilisateur';
      const isCredit = t.type === 'deposit' || t.type === 'credit';
      const isDebit = t.type === 'debit' || t.type === 'withdrawal';

      return `
        <tr>
          <td>${new Date(t.created_at).toLocaleDateString('fr-FR')} ${new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
          <td><strong>${userName}</strong></td>
          <td>
            <span class="badge" style="background:${isCredit ? '#ECFDF5' : '#FEF2F2'}; color:${isCredit ? '#059669' : '#DC2626'};">
              ${isCredit ? 'Dépôt / Crédit' : 'Débit / Retrait'}
            </span>
          </td>
          <td>${t.description || '-'}</td>
          <td><code style="background: #F1F5F9; padding: 3px 6px; border-radius: 4px;">${t.reference || 'N/A'}</code></td>
          <td>
            <strong style="color: ${isCredit ? 'var(--status-green)' : 'var(--status-red)'};">
              ${isDebit ? '-' : '+'}${Number(t.amount || 0).toLocaleString()} FCFA
            </strong>
          </td>
        </tr>
      `;
    }).join('');
  }

  displayTransactions(transactions);

  const searchInput = document.getElementById('tx-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (!val) {
        displayTransactions(transactions);
        return;
      }
      const filtered = transactions.filter(t => {
        const uName = (profilesMap[t.user_id] || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const ref = (t.reference || '').toLowerCase();
        return uName.includes(val) || desc.includes(val) || ref.includes(val);
      });
      displayTransactions(filtered);
    });
  }
}