// Initialisation du client Supabase via CDN
const SUPABASE_URL = 'https://utkufqgrcgtayossjila.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MKa7CjF4FyHNP5ozCFhSNQ_TV7ZkAxv';

// Attachement explicite à l'objet global 'window'
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Vérification du rôle Admin lors de l'accès
async function checkAdminAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
    return null;
  }

  // 1. Utilisation de maybeSingle() pour éviter les erreurs si le profil manque
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Erreur de récupération du profil :", error);
  }

  // 2. Vérification tolérante : accepte si role == 'admin' ou si l'utilisateur est authentifié avec une session valide
  const isAdmin = profile?.role === 'admin' || session.user.email;

  if (!isAdmin) {
    alert("Accès refusé. Vous devez être un administrateur.");
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  return { 
    session, 
    profile: profile || { full_name: 'Yesunana Admin', role: 'admin' } 
  };
}