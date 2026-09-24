async function renderDashboardView(container) {
  // Récupération dynamique depuis la source de vérité
  const [
    { count: userCount }, 
    { data: accounts }, 
    { count: pendingDeposits }, 
    { count: pendingWithdrawals }
  ] = await Promise.all([
    supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseClient.from('accounts').select('account_type, balance'),
    supabaseClient.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseClient.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ]);

  // Calcul séparé des soldes via la table accounts
  const totalSavings = accounts?.filter(a => a.account_type === 'savings').reduce((acc, a) => acc + Number(a.balance || 0), 0) || 0;
  const totalTontine = accounts?.filter(a => a.account_type === 'tontine').reduce((acc, a) => acc + Number(a.balance || 0), 0) || 0;
  const pendingTotal = (pendingDeposits || 0) + (pendingWithdrawals || 0);

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 28px;">
      <div class="card">
        <p>Utilisateurs totaux</p>
        <h1 style="margin-top: 8px;">${userCount || 0}</h1>
      </div>
      <div class="card">
        <p>Total soldes Épargne</p>
        <h1 style="margin-top: 8px; color: var(--primary-blue);">${totalSavings.toLocaleString()} FCFA</h1>
      </div>
      <div class="card">
        <p>Total soldes Tontine</p>
        <h1 style="margin-top: 8px;">${totalTontine.toLocaleString()} FCFA</h1>
      </div>
      <div class="card" style="border-left: 4px solid var(--primary-blue);">
        <p>Opérations à traiter</p>
        <h1 style="margin-top: 8px; color: var(--primary-blue);">${pendingTotal}</h1>
      </div>
    </div>

    <div class="card" style="margin-bottom: 28px; background: #F4F8FF; border-color: #BFDBFE;">
      <h3 style="color: var(--primary-blue);"> Actions requises aujourd'hui</h3>
      <div style="display: flex; gap: 32px; margin-top: 12px; align-items: center;">
        <div>Dépôts en attente : <strong>${pendingDeposits || 0}</strong></div>
        <div>Retraits en attente : <strong>${pendingWithdrawals || 0}</strong></div>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('deposits')">Gérer les demandes</button>
      </div>
    </div>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3>Dernières déclarations de dépôt</h3>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('deposits')">Voir tout</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Montant</th>
              <th>Opérateur</th>
              <th>Réf. Transaction</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="dashboard-recent-deposits">
            <tr><td colspan="6">Chargement...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const { data: recentDeposits } = await supabaseClient
    .from('deposit_requests')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  const tbody = document.getElementById('dashboard-recent-deposits');
  if (!recentDeposits || recentDeposits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Aucune déclaration récente.</td></tr>`;
    return;
  }

  tbody.innerHTML = recentDeposits.map(d => `
    <tr>
      <td><strong>${d.profiles?.full_name || 'Anonyme'}</strong></td>
      <td><strong>${Number(d.amount).toLocaleString()} FCFA</strong></td>
      <td>${d.operator}</td>
      <td><code>${d.transaction_reference || 'N/A'}</code></td>
      <td><span class="badge badge-${d.status === 'approved' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending'}">${d.status}</span></td>
      <td>${new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
    </tr>
  `).join('');
}