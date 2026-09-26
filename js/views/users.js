async function renderUsersView(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap;">
        <input type="text" id="users-search" class="form-control" style="max-width: 320px;" placeholder="Rechercher par nom, téléphone ou email...">
        <div style="display: flex; align-items: center; color: var(--text-muted); font-size: 13px;" id="users-count-badge">
          Chargement...
        </div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nom Complet</th>
            <th>Téléphone</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Solde Épargne</th>
            <th>Solde Tontine</th>
            <th>Date d'inscription</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr><td colspan="7" style="text-align:center; padding: 24px;">Chargement de la liste des utilisateurs...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // 1. Récupération directe et robuste sans dépendre des jointures PostgREST
  const [
    { data: users, error: usersError },
    { data: accounts, error: accountsError }
  ] = await Promise.all([
    supabaseClient.from('profiles').select('*').order('created_at', { ascending: false }),
    supabaseClient.from('accounts').select('user_id, account_type, balance')
  ]);

  const tbody = document.getElementById('users-tbody');
  const countBadge = document.getElementById('users-count-badge');

  if (usersError) {
    console.error("Erreur chargement utilisateurs :", usersError);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#DC2626; padding: 24px;">Erreur de chargement : ${usersError.message}</td></tr>`;
    if (countBadge) countBadge.textContent = 'Erreur';
    return;
  }

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px;">Aucun utilisateur inscrit dans la base.</td></tr>`;
    if (countBadge) countBadge.textContent = '0 utilisateur';
    return;
  }

  if (countBadge) countBadge.textContent = `${users.length} utilisateur${users.length > 1 ? 's' : ''}`;

  // 2. Indexation des comptes par user_id
  const accountsByUserId = {};
  (accounts || []).forEach(acc => {
    if (!accountsByUserId[acc.user_id]) accountsByUserId[acc.user_id] = {};
    accountsByUserId[acc.user_id][acc.account_type] = Number(acc.balance || 0);
  });

  // Fonction de rendu dynamique
  function displayUsers(list) {
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px;">Aucun résultat correspondant à votre recherche.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(u => {
      const userAccounts = accountsByUserId[u.id] || {};
      const savingsBal = userAccounts['savings'] ?? 0;
      const tontineBal = userAccounts['tontine'] ?? 0;
      const isAdmin = u.role === 'admin';

      return `
        <tr>
          <td><strong>${u.full_name || 'N/A'}</strong></td>
          <td>${u.phone || 'N/A'}</td>
          <td>${u.email || 'N/A'}</td>
          <td>
            <span class="badge" style="background:${isAdmin ? '#EFF6FF' : '#F1F5F9'}; color:${isAdmin ? '#2563EB' : '#475569'};">
              ${isAdmin ? 'Administrateur' : 'Client'}
            </span>
          </td>
          <td><strong style="color: var(--primary-blue);">${savingsBal.toLocaleString()} FCFA</strong></td>
          <td>${tontineBal.toLocaleString()} FCFA</td>
          <td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
        </tr>
      `;
    }).join('');
  }

  displayUsers(users);

  // Filtre de recherche dynamique
  const searchInput = document.getElementById('users-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (!val) {
        displayUsers(users);
        return;
      }
      const filtered = users.filter(u => 
        (u.full_name && u.full_name.toLowerCase().includes(val)) ||
        (u.phone && u.phone.toLowerCase().includes(val)) ||
        (u.email && u.email.toLowerCase().includes(val))
      );
      displayUsers(filtered);
    });
  }
}