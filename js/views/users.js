async function renderUsersView(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <input type="text" id="user-search" class="form-control" style="max-width: 320px;" placeholder="Rechercher par nom ou téléphone...">
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nom Complet</th>
            <th>Téléphone</th>
            <th>Solde Épargne</th>
            <th>Solde Tontine</th>
            <th>Inscription</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr><td colspan="5">Chargement...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const { data: users } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('users-tbody');

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Aucun utilisateur trouvé.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.full_name || 'N/A'}</strong></td>
      <td>${u.phone || 'N/A'}</td>
      <td><strong style="color: var(--primary-blue);">${Number(u.savings_balance || 0).toLocaleString()} FCFA</strong></td>
      <td>${Number(u.tontine_balance || 0).toLocaleString()} FCFA</td>
      <td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
    </tr>
  `).join('');
}