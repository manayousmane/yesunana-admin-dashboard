async function renderWithdrawalsView(container) {
  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Montant</th>
            <th>Opérateur</th>
            <th>Numéro Réception</th>
            <th>Statut</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="withdrawals-tbody">
          <tr><td colspan="6">Chargement...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const { data: withdrawals } = await supabaseClient.from('withdrawal_requests').select('*, profiles(full_name)').order('created_at', { ascending: false });
  const tbody = document.getElementById('withdrawals-tbody');

  if (!withdrawals || withdrawals.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Aucune demande de retrait.</td></tr>`;
    return;
  }

  tbody.innerHTML = withdrawals.map(w => `
    <tr>
      <td><strong>${w.profiles?.full_name || 'N/A'}</strong></td>
      <td><strong>${Number(w.amount).toLocaleString()} FCFA</strong></td>
      <td>${w.operator}</td>
      <td>${w.phone_number}</td>
      <td><span class="badge badge-${w.status === 'Validé' ? 'approved' : w.status === 'Rejeté' ? 'rejected' : 'pending'}">${w.status}</span></td>
      <td>${new Date(w.created_at).toLocaleDateString('fr-FR')}</td>
    </tr>
  `).join('');
}