document.addEventListener('DOMContentLoaded', async () => {
  const authData = await checkAdminAuth();
  if (!authData) return;

  // Récupère le nom du profil s'il existe et n'est pas "Utilisateur", sinon met "Yesunana Admin"
  const displayName = (authData.profile?.full_name && authData.profile.full_name !== 'Utilisateur') 
    ? authData.profile.full_name 
    : 'Yesunana Admin';

  document.getElementById('admin-name').textContent = displayName;
  document.getElementById('admin-avatar').textContent = displayName.charAt(0).toUpperCase();

  // Écouteurs pour la navigation
  const links = document.querySelectorAll('.sidebar-link[data-view]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      navigateTo(view);
    });
  });

  // Déconnexion
  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });

  // Chargement de la vue par défaut
  navigateTo('dashboard');
});

function navigateTo(viewName) {
  // Update UI sidebar
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-link[data-view="${viewName}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Titles Update
  const titles = {
    dashboard: 'Dashboard',
    users: 'Gestion des utilisateurs',
    deposits: 'Déclarations de dépôts',
    withdrawals: 'Demandes de retraits',
    transactions: 'Historique des transactions',
    settings: 'Paramètres'
  };
  document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';

  // Injections de vues réelles
  const appView = document.getElementById('app-view');
  appView.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Chargement en cours...</div>`;

  if (viewName === 'dashboard') renderDashboardView(appView);
  else if (viewName === 'users') renderUsersView(appView);
  else if (viewName === 'deposits') renderDepositsView(appView);
  else if (viewName === 'withdrawals') renderWithdrawalsView(appView);
  else if (viewName === 'transactions') renderTransactionsView(appView);
  else if (viewName === 'settings') renderSettingsView(appView);
}

function closeRejectModal() {
  document.getElementById('reject-modal').classList.remove('active');
}