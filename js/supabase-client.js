// Initialisation du client Supabase via CDN
const SUPABASE_URL = 'https://utkufqgrcgtayossjila.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MKa7CjF4FyHNP5ozCFhSNQ_TV7ZkAxv';
//const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Verification du role Admin lors de l'accès
async function checkAdminAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
    return null;
  }

  // Vérification de la propriété 'role' dans la table profiles
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .single();

  if (error || profile?.role !== 'admin') {
    alert("Accès refusé. Vous devez être un administrateur.");
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  return { session, profile };
}