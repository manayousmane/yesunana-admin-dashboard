async function renderDashboardView(container) {
  // Récupération des données réelles
  const [{ count: userCount }, { data: profiles }, { count: pendingDeposits }, { count: pendingWithdrawals }] = await Promise.all([
    supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseClient.from('profiles').select('savings_balance, tontine_balance'),
    supabaseClient.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'En attente'),
    supabaseClient.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'En attente')
  ]);

  const totalSavings = profiles?.reduce((acc, p) => acc + (Number(p.savings_balance) || 0), 0) || 0;
  const totalTontine = profiles?.reduce((acc, p) => acc + (Number(p.tontine_balance) || 0), 0) || 0;
  const pendingTotal = (pendingDeposits || 0) + (pendingWithdrawals || 0);

  // HTML
  container.innerHTML = `
    <!-- KPIs (Section 10) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 28px;">
      <div class="card">
        <p>Utilisateurs Totaux</p>
        <h1 style="margin-top: 8px;">${userCount || 0}</h1>
      </div>
      <div class="card">
        <p>Total Épargne</p>
        <h1 style="margin-top: 8px; color: var(--primary-blue);">${totalSavings.toLocaleString()} FCFA</h1>
      </div>
      <div class="card">
        <p>Total Tontine</p>
        <h1 style="margin-top: 8px;">${totalTontine.toLocaleString()} FCFA</h1>
      </div>
      <div class="card" style="border-left: 4px solid var(--status-orange);">
        <p>Opérations À Traiter</p>
        <h1 style="margin-top: 8px; color: var(--status-orange);">${pendingTotal}</h1>
      </div>
    </div>

    <!-- Actions Requises (Section 11) -->
    <div class="card" style="margin-bottom: 28px; background: #FFFDF5; border-color: #FCD34D;">
      <h3>⚡ Actions requises aujourd'hui</h3>
      <div style="display: flex; gap: 32px; margin-top: 12px; align-items: center;">
        <div>Dépôts en attente : <strong>${pendingDeposits || 0}</strong></div>
        <div>Retraits en attente : <strong>${pendingWithdrawals || 0}</strong></div>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('deposits')">Voir les demandes</button>
      </div>
    </div>

    <!-- Derniers Dépôts (Section 12) -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3>Dernières déclarations de dépôt</h3>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('deposits')">Voir tous les dépôts</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Montant</th>
              <th>Opérateur</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="dashboard-recent-deposits">
            <tr><td colspan="5">Chargement...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Charge les 5 derniers dépôts
  const { data: recentDeposits } = await supabaseClient
    .from('deposit_requests')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  const tbody = document.getElementById('dashboard-recent-deposits');
  if (!recentDeposits || recentDeposits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Aucune déclaration récente.</td></tr>`;
    return;
  }

  tbody.innerHTML = recentDeposits.map(d => `
    <tr>
      <td><strong>${d.profiles?.full_name || 'Inconnu'}</strong></td>
      <td><strong>${Number(d.amount).toLocaleString()} FCFA</strong></td>
      <td>${d.operator}</td>
      <td><span class="badge badge-${d.status === 'Validé' ? 'approved' : d.status === 'Rejeté' ? 'rejected' : 'pending'}">${d.status}</span></td>
      <td>${new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
    </tr>
  `).join('');
}