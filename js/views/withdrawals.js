async function renderWithdrawalsView(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap;">
        <input type="text" id="withdrawal-search" class="form-control" style="max-width: 320px;" placeholder="Rechercher par utilisateur, téléphone...">
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" id="btn-wit-all" onclick="loadWithdrawals('all')">Tous</button>
          <button class="btn btn-secondary btn-sm" id="btn-wit-pending" onclick="loadWithdrawals('pending')">En attente</button>
          <button class="btn btn-secondary btn-sm" id="btn-wit-approved" onclick="loadWithdrawals('approved')">Approuvés</button>
          <button class="btn btn-secondary btn-sm" id="btn-wit-rejected" onclick="loadWithdrawals('rejected')">Rejetés</button>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Type Compte</th>
            <th>Montant</th>
            <th>Opérateur</th>
            <th>Téléphone Réception</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="withdrawals-tbody">
          <tr><td colspan="8" style="text-align:center; padding: 24px;">Chargement des demandes de retrait...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  let currentWithdrawalsList = [];
  let profilesCache = {};
  let accountsCache = {};

  window.loadWithdrawals = async function(filterStatus = 'all') {
    ['all', 'pending', 'approved', 'rejected'].forEach(s => {
      const btn = document.getElementById(`btn-wit-${s}`);
      if (btn) {
        if (s === filterStatus) {
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary');
        } else {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-secondary');
        }
      }
    });

    let query = supabaseClient.from('withdrawal_requests').select('*').order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const tbody = document.getElementById('withdrawals-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px;">Chargement des données...</td></tr>`;

    // Récupération parallèle indépendante
    const [
      { data: withdrawals, error: witError },
      { data: profiles },
      { data: accounts }
    ] = await Promise.all([
      query,
      supabaseClient.from('profiles').select('id, full_name, phone'),
      supabaseClient.from('accounts').select('id, account_type')
    ]);

    if (witError) {
      console.error("Erreur retraits :", witError);
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#DC2626; padding: 24px;">Erreur de chargement : ${witError.message}</td></tr>`;
      return;
    }

    if (profiles) {
      profiles.forEach(p => {
        profilesCache[p.id] = p.full_name || p.phone || 'Utilisateur';
      });
    }

    if (accounts) {
      accounts.forEach(a => {
        accountsCache[a.id] = a.account_type;
      });
    }

    currentWithdrawalsList = withdrawals || [];
    displayWithdrawals(currentWithdrawalsList);
  };

  function displayWithdrawals(list) {
    const tbody = document.getElementById('withdrawals-tbody');
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px;">Aucune demande de retrait trouvée.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(w => {
      const userName = profilesCache[w.user_id] || w.phone_number || 'Utilisateur';
      const accType = accountsCache[w.account_id] || 'savings';
      const isPending = w.status === 'pending';
      const isApproved = w.status === 'approved';
      const isRejected = w.status === 'rejected';

      const badgeClass = isApproved ? 'approved' : (isRejected ? 'rejected' : 'pending');
      const badgeLabel = isApproved ? 'Approuvé' : (isRejected ? 'Rejeté' : 'En attente');

      return `
        <tr>
          <td><strong>${userName}</strong></td>
          <td><span class="badge" style="background:#E2E8F0; color:#334155;">${accType === 'savings' ? 'Épargne' : 'Tontine'}</span></td>
          <td><strong style="color: var(--status-red);">${Number(w.amount || 0).toLocaleString()} FCFA</strong></td>
          <td>${w.operator || 'Mobile Money'}</td>
          <td>${w.phone_number || 'N/A'}</td>
          <td><span class="badge badge-${badgeClass}">${badgeLabel}</span></td>
          <td>${new Date(w.created_at).toLocaleDateString('fr-FR')} ${new Date(w.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
          <td>
            ${isPending ? `
              <div style="display:flex; gap:6px;">
                <button class="btn btn-primary btn-sm" onclick="approveWithdrawal('${w.id}')">Approuver</button>
                <button class="btn btn-danger btn-sm" onclick="openRejectWithdrawalModal('${w.id}')">Rejeter</button>
              </div>
            ` : (isRejected && w.rejection_reason ? `<span style="font-size:12px; color:var(--text-muted);">${w.rejection_reason}</span>` : '-')}
          </td>
        </tr>
      `;
    }).join('');
  }

  const searchInput = document.getElementById('withdrawal-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (!val) {
        displayWithdrawals(currentWithdrawalsList);
        return;
      }
      const filtered = currentWithdrawalsList.filter(w => {
        const uName = (profilesCache[w.user_id] || '').toLowerCase();
        const phone = (w.phone_number || '').toLowerCase();
        const op = (w.operator || '').toLowerCase();
        return uName.includes(val) || phone.includes(val) || op.includes(val);
      });
      displayWithdrawals(filtered);
    });
  }

  loadWithdrawals();
}

async function approveWithdrawal(withdrawalId) {
  if (!confirm("Confirmer l'approbation de ce retrait ? Le solde de l'utilisateur sera débité.")) return;

  const { error } = await supabaseClient.rpc('approve_withdrawal', { p_withdrawal_id: withdrawalId });

  if (error) {
    alert("Erreur de traitement du retrait : " + error.message);
  } else {
    alert("Retrait approuvé et solde débité avec succès !");
    if (window.loadWithdrawals) window.loadWithdrawals();
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
      if (window.loadWithdrawals) window.loadWithdrawals();
    }
  };
}