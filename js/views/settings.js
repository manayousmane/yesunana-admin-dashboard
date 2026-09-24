async function renderSettingsView(container) {
  // Structure HTML interactive avec formulaires éditables
  container.innerHTML = `
    <form id="settings-form">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
        
        <!-- CARTE 1 : INFORMATIONS DE L'ENTREPRISE -->
        <div class="card">
          <h3 style="color: var(--dark-blue); margin-bottom: 4px;">Informations Yesunana Finance</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
            Informations officielles affichées aux utilisateurs sur l'application mobile.
          </p>

          <div class="form-group">
            <label style="font-weight: 600;">Nom de la structure</label>
            <input type="text" id="cfg-name" class="form-control" value="Yesunana Finance" readonly style="background-color: #F1F5F9; cursor: not-allowed; font-weight: 700; color: #334155;">
          </div>

          <div class="form-group">
            <label style="font-weight: 600;">Description de la structure *</label>
            <textarea id="cfg-desc" class="form-control" rows="4" style="resize: vertical; font-size: 13.5px;" required></textarea>
          </div>

          <div class="form-group">
            <label style="font-weight: 600;">Email de contact *</label>
            <input type="email" id="cfg-email" class="form-control" placeholder="contact@yesunana.com" required>
          </div>

          <div class="form-group">
            <label style="font-weight: 600;">Numéro WhatsApp *</label>
            <input type="text" id="cfg-phone" class="form-control" placeholder="01 97 00 11 22" required>
          </div>
        </div>

        <!-- CARTE 2 : NUMÉROS DE DÉPÔT OFFICIELS -->
        <div class="card">
          <h3 style="color: var(--dark-blue); margin-bottom: 4px;">Numéros de dépôt officiels</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
            Configurez les numéros récepteurs (Mobile Money / Cash) affichés lors des dépôts.
          </p>

          <div id="payment-methods-list">
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">Chargement des numéros...</div>
          </div>
        </div>

      </div>

      <!-- BOUTON D'ENREGISTREMENT EN BAS -->
      <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
        <button type="submit" id="save-settings-btn" class="btn btn-primary" style="padding: 12px 28px; font-size: 14px;">
         Enregistrer les modifications
        </button>
      </div>
    </form>
  `;

  // Description détaillée par défaut
  const defaultDescription = "Yesunana Finance est le pôle financier stratégique de Yesunana, dédié à la gestion sécurisée de l'épargne, l'organisation des comptes tontine, le suivi fluide des transactions et l'accompagnement des utilisateurs vers l'autonomie financière.";

  // 1. Récupération des données d'entreprise
  const { data: settings } = await supabaseClient.from('company_settings').select('*').limit(1).single();
  if (settings) {
    document.getElementById('cfg-desc').value = settings.description || defaultDescription;
    document.getElementById('cfg-email').value = settings.email || '';
    document.getElementById('cfg-phone').value = settings.phone || '';
  } else {
    document.getElementById('cfg-desc').value = defaultDescription;
  }

  // 2. Récupération des méthodes de paiement (MTN, Moov, Celtis)
  const { data: methods } = await supabaseClient.from('payment_methods').select('*').order('created_at', { ascending: true });
  const methodsContainer = document.getElementById('payment-methods-list');

  if (methods && methods.length > 0) {
    methodsContainer.innerHTML = methods.map(m => `
      <div style="padding: 14px; background: #F8FAFC; border: 1px solid var(--card-border); border-radius: var(--radius-sm); margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 14px; color: var(--dark-blue);">${m.name}</strong>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
            <input type="checkbox" class="pm-active" data-id="${m.id}" ${m.is_active ? 'checked' : ''}>
            <span>${m.is_active ? 'Actif' : 'Inactif'}</span>
          </label>
        </div>
        <input type="text" class="form-control pm-phone" data-id="${m.id}" value="${m.phone_number || ''}" placeholder="Ex: 01 97 00 11 22">
      </div>
    `).join('');
  } else {
    methodsContainer.innerHTML = `<p style="font-size: 13px; color: var(--text-muted);">Aucun moyen de paiement configuré dans la table payment_methods.</p>`;
  }

  // 3. Soumission et mise à jour dans Supabase
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    btn.disabled = true;
    btn.textContent = "Enregistrement en cours...";

    try {
      // Mettre à jour company_settings
      const { error: settingsErr } = await supabaseClient
        .from('company_settings')
        .update({
          description: document.getElementById('cfg-desc').value.trim(),
          email: document.getElementById('cfg-email').value.trim(),
          phone: document.getElementById('cfg-phone').value.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', settings?.id || 1);

      if (settingsErr) throw settingsErr;

      // Mettre à jour chaque numéro de paiement
      const phoneInputs = document.querySelectorAll('.pm-phone');
      const activeInputs = document.querySelectorAll('.pm-active');

      for (let i = 0; i < phoneInputs.length; i++) {
        const id = phoneInputs[i].getAttribute('data-id');
        const phone = phoneInputs[i].value.trim();
        const isActive = activeInputs[i].checked;

        await supabaseClient
          .from('payment_methods')
          .update({
            phone_number: phone,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      }

      alert("Modifications enregistrées avec succès !");
      renderSettingsView(container); // Rechargement propre de la vue
    } catch (err) {
      alert("Erreur lors de l'enregistrement : " + err.message);
      btn.disabled = false;
      btn.textContent = "Enregistrer les modifications";
    }
  });
}