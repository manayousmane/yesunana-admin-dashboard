async function renderDepositsView(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap;">
        <input type="text" id="deposit-search" class="form-control" style="max-width: 320px;" placeholder="Rechercher par référence, nom ou téléphone...">
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" id="btn-dep-all" onclick="loadDeposits('all')">Tous</button>
          <button class="btn btn-secondary btn-sm" id="btn-dep-pending" onclick="loadDeposits('pending')">En attente</button>
          <button class="btn btn-secondary btn-sm" id="btn-dep-approved" onclick="loadDeposits('approved')">Approuvés</button>
          <button class="btn btn-secondary btn-sm" id="btn-dep-rejected" onclick="loadDeposits('rejected')">Rejetés</button>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Montant</th>
            <th>Opérateur</th>
            <th>Expéditeur</th>
            <th>Référence</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="deposits-tbody">
          <tr><td colspan="8" style="text-align:center; padding: 24px;">Chargement des dépôts...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  let currentDepositsList = [];
  let profilesCache = {};

  window.loadDeposits = async function(filterStatus = 'all') {
    // Boutons actifs
    ['all', 'pending', 'approved', 'rejected'].forEach(s => {
      const btn = document.getElementById(`btn-dep-${s}`);
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

    let query = supabaseClient.from('deposit_requests').select('*').order('created_at', { ascending: false });
    
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const tbody = document.getElementById('deposits-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px;">Chargement des données...</td></tr>`;

    // 1. Récupération parallèle sans jointure PostgREST fragile
    const [
      { data: deposits, error: depError },
      { data: profiles, error: profError }
    ] = await Promise.all([
      query,
      supabaseClient.from('profiles').select('id, full_name, phone')
    ]);

    if (depError) {
      console.error("Erreur chargement dépôts :", depError);
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#DC2626; padding: 24px;">Erreur de chargement : ${depError.message}</td></tr>`;
      return;
    }

    // Mise en cache des profils
    if (profiles) {
      profiles.forEach(p => {
        profilesCache[p.id] = p.full_name || p.phone || 'Utilisateur';
      });
    }

    currentDepositsList = deposits || [];
    displayDeposits(currentDepositsList);
  };

  function displayDeposits(list) {
    const tbody = document.getElementById('deposits-tbody');
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px;">Aucun dépôt trouvé.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(d => {
      const userName = profilesCache[d.user_id] || d.sender_phone || d.phone_number || 'Utilisateur';
      const senderPhone = d.sender_phone || d.phone_number || 'N/A';
      const isPending = d.status === 'pending';
      const isApproved = d.status === 'approved';
      const isRejected = d.status === 'rejected';

      const badgeClass = isApproved ? 'approved' : (isRejected ? 'rejected' : 'pending');
      const badgeLabel = isApproved ? 'Approuvé' : (isRejected ? 'Rejeté' : 'En attente');

      return `
        <tr>
          <td><strong>${userName}</strong></td>
          <td><strong style="color: var(--primary-blue);">${Number(d.amount || 0).toLocaleString()} FCFA</strong></td>
          <td>${d.operator || 'Mobile Money'}</td>
          <td>${senderPhone}</td>
          <td><code style="background: #F1F5F9; padding: 3px 6px; border-radius: 4px;">${d.transaction_reference || 'N/A'}</code></td>
          <td><span class="badge badge-${badgeClass}">${badgeLabel}</span></td>
          <td>${new Date(d.created_at).toLocaleDateString('fr-FR')} ${new Date(d.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
          <td>
            ${isPending ? `
              <div style="display:flex; gap:6px;">
                <button class="btn btn-primary btn-sm" onclick="approveDeposit('${d.id}')">Valider</button>
                <button class="btn btn-danger btn-sm" onclick="openRejectDepositModal('${d.id}')">Rejeter</button>
              </div>
            ` : (isRejected && d.rejection_reason ? `<span style="font-size:12px; color:var(--text-muted);">${d.rejection_reason}</span>` : '-')}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Écouteur recherche dynamique
  const searchInput = document.getElementById('deposit-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (!val) {
        displayDeposits(currentDepositsList);
        return;
      }
      const filtered = currentDepositsList.filter(d => {
        const uName = (profilesCache[d.user_id] || '').toLowerCase();
        const ref = (d.transaction_reference || '').toLowerCase();
        const phone = (d.sender_phone || d.phone_number || '').toLowerCase();
        const op = (d.operator || '').toLowerCase();
        return uName.includes(val) || ref.includes(val) || phone.includes(val) || op.includes(val);
      });
      displayDeposits(filtered);
    });
  }

  loadDeposits();
}

async function approveDeposit(depositId) {
  if (!confirm("Confirmer la validation du dépôt ? Le solde de l'utilisateur sera automatiquement crédité.")) return;

  const { error } = await supabaseClient.rpc('approve_deposit', { deposit_id: depositId });

  if (error) {
    alert("Erreur de validation : " + error.message);
  } else {
    alert("Dépôt validé avec succès ! Le compte a été crédité.");
    if (window.loadDeposits) window.loadDeposits();
  }
}

function openRejectDepositModal(depositId) {
  document.getElementById('modal-item-id').value = depositId;
  document.getElementById('reject-modal').classList.add('active');
  
  document.getElementById('reject-form').onsubmit = async (e) => {
    e.preventDefault();
    const reason = document.getElementById('reject-reason-select').value;
    
    const { error } = await supabaseClient.rpc('reject_deposit', { 
      deposit_id: depositId, 
      reason: reason 
    });

    if (error) {
      alert("Erreur lors du rejet : " + error.message);
    } else {
      closeRejectModal();
      if (window.loadDeposits) window.loadDeposits();
    }
  };
}