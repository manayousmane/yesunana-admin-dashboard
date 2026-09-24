async function renderWithdrawalsView(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="loadWithdrawals('all')">Tous</button>
        <button class="btn btn-secondary btn-sm" onclick="loadWithdrawals('pending')">En attente</button>
        <button class="btn btn-secondary btn-sm" onclick="loadWithdrawals('approved')">Approuvés</button>
        <button class="btn btn-secondary btn-sm" onclick="loadWithdrawals('rejected')">Rejetés</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Compte Débité</th>
            <th>Montant</th>
            <th>Opérateur</th>
            <th>Téléphone Réception</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="withdrawals-tbody">
          <tr><td colspan="8">Chargement des demandes de retrait...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  window.loadWithdrawals = async function(filterStatus = 'all') {
    let query = supabaseClient
      .from('withdrawal_requests')
      .select('*, profiles(full_name), accounts(account_type)')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data: withdrawals, error } = await query;
    const tbody = document.getElementById('withdrawals-tbody');

    if (error || !withdrawals || withdrawals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Aucune demande trouvée.</td></tr>`;
      return;
    }

    tbody.innerHTML = withdrawals.map(w => `
      <tr>
        <td><strong>${w.profiles?.full_name || 'N/A'}</strong></td>
        <td><span class="badge" style="background:#E2E8F0; color:#334155;">${w.accounts?.account_type || 'savings'}</span></td>
        <td><strong>${Number(w.amount).toLocaleString()} FCFA</strong></td>
        <td>${w.operator}</td>
        <td>${w.phone_number}</td>
        <td><span class="badge badge-${w.status === 'approved' ? 'approved' : w.status === 'rejected' ? 'rejected' : 'pending'}">${w.status}</span></td>
        <td>${new Date(w.created_at).toLocaleDateString('fr-FR')}</td>
        <td>
          ${w.status === 'pending' ? `
            <button class="btn btn-primary btn-sm" onclick="approveWithdrawal('${w.id}')">Approuver</button>
            <button class="btn btn-danger btn-sm" onclick="openRejectWithdrawalModal('${w.id}')">Rejeter</button>
          ` : '-'}
        </td>
      </tr>
    `).join('');
  };

  loadWithdrawals();
}

async function approveWithdrawal(withdrawalId) {
  if (!confirm("Êtes-vous sûr de vouloir approuver ce retrait ? Le solde du compte sélectionné sera débité.")) return;

  const { error } = await supabaseClient.rpc('approve_withdrawal', { p_withdrawal_id: withdrawalId });

  if (error) {
    alert("Erreur de traitement du retrait : " + error.message);
  } else {
    alert("Retrait approuvé et solde débité avec succès !");
    loadWithdrawals();
  }
}

function openRejectWithdrawalModal(withdrawalId) {
  document.getElementById('modal-item-id').value = withdrawalId;
  document.getElementById('reject-modal').classList.add('active');

  document.getElementById('reject-form').onsubmit = async (e) => {
    e.preventDefault();
    const reason = document.getElementById('reject-reason-select').value;

    const { error } = await supabaseClient.rpc('reject_withdrawal', {
      p_withdrawal_id: withdrawalId,
      p_reason: reason
    });

    if (error) {
      alert("Erreur lors du rejet du retrait : " + error.message);
    } else {
      closeRejectModal();
      loadWithdrawals();
    }
  };
}