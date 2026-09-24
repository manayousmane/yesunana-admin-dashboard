async function renderSettingsView(container) {
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div class="card">
        <h3>Informations Yesunana Finance</h3>
        <br>
        <div class="form-group">
          <label>Nom de la structure</label>
          <input type="text" id="cfg-name" class="form-control" readonly>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="cfg-desc" class="form-control" readonly rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="text" id="cfg-email" class="form-control" readonly>
        </div>
        <div class="form-group">
          <label>Téléphone</label>
          <input type="text" id="cfg-phone" class="form-control" readonly>
        </div>
      </div>

      <div class="card">
        <h3>Numéros de Dépôt Officiels</h3>
        <p style="margin-bottom: 16px;">Source dynamique depuis la table payment_methods</p>
        <div id="payment-methods-list">Chargement des numéros...</div>
      </div>
    </div>
  `;

  const { data: settings } = await supabaseClient.from('company_settings').select('*').limit(1).single();
  if (settings) {
    document.getElementById('cfg-name').value = settings.company_name || '';
    document.getElementById('cfg-desc').value = settings.description || '';
    document.getElementById('cfg-email').value = settings.email || '';
    document.getElementById('cfg-phone').value = settings.phone || '';
  }

  const { data: methods } = await supabaseClient.from('payment_methods').select('*');
  const methodsContainer = document.getElementById('payment-methods-list');

  if (!methods || methods.length === 0) {
    methodsContainer.innerHTML = `<p>Aucun numéro configuré.</p>`;
    return;
  }

  methodsContainer.innerHTML = methods.map(m => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--card-border);">
      <div>
        <strong>${m.name}</strong>
        <div style="font-size: 13px; color: var(--text-muted);">${m.phone_number}</div>
      </div>
      <span class="badge ${m.is_active ? 'badge-approved' : 'badge-rejected'}">${m.is_active ? 'Actif' : 'Inactif'}</span>
    </div>
  `).join('');
}