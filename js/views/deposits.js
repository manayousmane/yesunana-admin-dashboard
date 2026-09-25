async function renderDepositsView(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap;">
        <input type="text" id="deposit-search" class="form-control" style="max-width: 300px;" placeholder="Rechercher par référence ou nom...">
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="loadDeposits('all')">Tous</button>
          <button class="btn btn-secondary btn-sm" onclick="loadDeposits('pending')">En attente</button>
          <button class="btn btn-secondary btn-sm" onclick="loadDeposits('approved')">Approuvés</button>
          <button class="btn btn-secondary btn-sm" onclick="loadDeposits('rejected')">Rejetés</button>
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
            <th>Preuve</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="deposits-tbody">
          <tr><td colspan="9">Chargement des dépôts...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  window.loadDeposits = async function(filterStatus = 'all') {
    let query = supabaseClient.from('deposit_requests').select('*, profiles!left(full_name)').order('created_at', { ascending: false });
    
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data: deposits, error } = await query;
    const tbody = document.getElementById('deposits-tbody');

    if (error || !deposits || deposits.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Aucun dépôt correspondant.</td></tr>`;
      return;
    }

    tbody.innerHTML = deposits.map(d => `
      <tr>
        <td><strong>${d.profiles?.full_name || 'Utilisateur'}</strong></td>
        <td><strong>${Number(d.amount).toLocaleString()} FCFA</strong></td>
        <td>${d.operator}</td>
        <td>${d.sender_phone || 'N/A'}</td>
        <td><code>${d.transaction_reference || 'N/A'}</code></td>
        <td>${d.proof_url ? `<a href="${d.proof_url}" target="_blank" class="btn btn-secondary btn-sm">Voir</a>` : '-'}</td>
        <td><span class="badge badge-${d.status === 'approved' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending'}">${d.status}</span></td>
        <td>${new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
        <td>
          ${d.status === 'pending' ? `
            <button class="btn btn-primary btn-sm" onclick="approveDeposit('${d.id}')">Valider</button>
            <button class="btn btn-danger btn-sm" onclick="openRejectDepositModal('${d.id}')">Rejeter</button>
          ` : '-'}
        </td>
      </tr>
    `).join('');
  };

  loadDeposits();
}

async function approveDeposit(depositId) {
  if (!confirm("Confirmer la validation du dépôt ? L'opération créditera le compte associé via la fonction PostgreSQL.")) return;

  const { error } = await supabaseClient.rpc('approve_deposit', { deposit_id: depositId });

  if (error) {
    alert("Erreur de validation : " + error.message);
  } else {
    alert("Dépôt validé avec succès !");
    loadDeposits();
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
      loadDeposits();
    }
  };
}