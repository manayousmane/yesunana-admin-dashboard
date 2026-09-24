async function renderUsersView(container) {
  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nom Complet</th>
            <th>Téléphone</th>
            <th>Solde Épargne (Savings)</th>
            <th>Solde Tontine</th>
            <th>Inscription</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr><td colspan="5">Chargement de la liste des utilisateurs...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // Jointure avec la table accounts
  const { data: users } = await supabaseClient
    .from('profiles')
    .select('*, accounts(account_type, balance)')
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('users-tbody');

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Aucun utilisateur inscrit.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const savingsAccount = u.accounts?.find(a => a.account_type === 'savings');
    const tontineAccount = u.accounts?.find(a => a.account_type === 'tontine');

    return `
      <tr>
        <td><strong>${u.full_name || 'N/A'}</strong></td>
        <td>${u.phone || 'N/A'}</td>
        <td><strong style="color: var(--primary-blue);">${Number(savingsAccount?.balance || 0).toLocaleString()} FCFA</strong></td>
        <td>${Number(tontineAccount?.balance || 0).toLocaleString()} FCFA</td>
        <td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
      </tr>
    `;
  }).join('');
}