require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const TARGET_EMAIL = 'daniel.phillippe27@gmail.com';
const TARGET_NAME = 'Daniel Phillippe';
const TARGET_WORKSPACE_NAME = 'Phillippe Group';
const TARGET_WORKSPACE_SLUG = 'phillippegroup';
const TARGET_BRAND = {
  logoUrl: null,
  primaryColor: '#22d3ee',
  accentColor: '#0f172a',
  tagline: "Track your specific home's market performance using TRREB-backed benchmark data.",
  ctaText: 'See My Home Equity',
};

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

const supabase = createClient(
  assertEnv('NEXT_PUBLIC_SUPABASE_URL'),
  assertEnv('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function listAllAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    users.push(...data.users);
    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return users;
}

async function main() {
  const users = await listAllAuthUsers();
  const targetUser = users.find(
    (user) => (user.email || '').toLowerCase() === TARGET_EMAIL
  );

  if (!targetUser) {
    throw new Error(`Auth user ${TARGET_EMAIL} was not found.`);
  }

  const targetUserId = targetUser.id;

  const [
    { data: workspaces, error: workspacesError },
    { data: importJobs, error: importJobsError },
    { data: profiles, error: profilesError },
    { data: memberships, error: membershipsError },
    { data: subscribers, error: subscribersError },
  ] = await Promise.all([
    supabase.from('workspaces').select('*').order('created_at', { ascending: true }),
    supabase
      .from('data_import_jobs')
      .select('id, workspace_id, uploaded_by_user_id, created_at')
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    supabase.from('workspace_memberships').select('*').order('created_at', { ascending: true }),
    supabase.from('subscribers').select('id, email, profile_id'),
  ]);

  if (workspacesError || importJobsError || profilesError || membershipsError || subscribersError) {
    throw new Error(
      JSON.stringify({
        workspacesError,
        importJobsError,
        profilesError,
        membershipsError,
        subscribersError,
      })
    );
  }

  let targetWorkspace =
    (workspaces || []).find((workspace) => workspace.slug === TARGET_WORKSPACE_SLUG) ||
    null;

  if (!targetWorkspace) {
    const importJobCounts = new Map();
    for (const job of importJobs || []) {
      importJobCounts.set(job.workspace_id, (importJobCounts.get(job.workspace_id) || 0) + 1);
    }

    const sortedWorkspaces = [...(workspaces || [])].sort((left, right) => {
      return (importJobCounts.get(right.id) || 0) - (importJobCounts.get(left.id) || 0);
    });

    targetWorkspace = sortedWorkspaces[0] || null;
  }

  if (!targetWorkspace) {
    const insertWorkspace = await supabase
      .from('workspaces')
      .insert({
        name: TARGET_WORKSPACE_NAME,
        slug: TARGET_WORKSPACE_SLUG,
        created_by: targetUserId,
        settings: TARGET_BRAND,
      })
      .select('*')
      .single();

    if (insertWorkspace.error || !insertWorkspace.data) {
      throw insertWorkspace.error || new Error('Failed to create target workspace.');
    }

    targetWorkspace = insertWorkspace.data;
  } else {
    const updateWorkspace = await supabase
      .from('workspaces')
      .update({
        name: TARGET_WORKSPACE_NAME,
        slug: TARGET_WORKSPACE_SLUG,
        created_by: targetUserId,
        settings: {
          ...(targetWorkspace.settings || {}),
          ...TARGET_BRAND,
        },
      })
      .eq('id', targetWorkspace.id)
      .select('*')
      .single();

    if (updateWorkspace.error || !updateWorkspace.data) {
      throw updateWorkspace.error || new Error('Failed to update target workspace.');
    }

    targetWorkspace = updateWorkspace.data;
  }

  const existingProfile = (profiles || []).find((profile) => profile.id === targetUserId) || null;

  if (existingProfile) {
    const { error } = await supabase
      .from('profiles')
      .update({
        email: TARGET_EMAIL,
        name: existingProfile.name || TARGET_NAME,
        account_type: 'owner',
        default_workspace_id: targetWorkspace.id,
      })
      .eq('id', targetUserId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from('profiles').insert({
      id: targetUserId,
      email: TARGET_EMAIL,
      name: TARGET_NAME,
      property_data: {},
      primary_estimate_id: null,
      account_type: 'owner',
      default_workspace_id: targetWorkspace.id,
    });

    if (error) {
      throw error;
    }
  }

  for (const profile of profiles || []) {
    if (profile.id === targetUserId) {
      continue;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ default_workspace_id: null })
      .eq('id', profile.id);

    if (error) {
      throw error;
    }
  }

  for (const job of importJobs || []) {
    const { error } = await supabase
      .from('data_import_jobs')
      .update({
        workspace_id: targetWorkspace.id,
        uploaded_by_user_id: targetUserId,
      })
      .eq('id', job.id);

    if (error) {
      throw error;
    }
  }

  for (const membership of memberships || []) {
    if (membership.workspace_id === targetWorkspace.id && membership.user_id === targetUserId) {
      continue;
    }

    const { error } = await supabase
      .from('workspace_memberships')
      .delete()
      .eq('id', membership.id);

    if (error) {
      throw error;
    }
  }

  const targetMembership = (memberships || []).find(
    (membership) =>
      membership.workspace_id === targetWorkspace.id &&
      membership.user_id === targetUserId
  );

  if (targetMembership) {
    const { error } = await supabase
      .from('workspace_memberships')
      .update({ role: 'owner' })
      .eq('id', targetMembership.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from('workspace_memberships').insert({
      workspace_id: targetWorkspace.id,
      user_id: targetUserId,
      role: 'owner',
    });

    if (error) {
      throw error;
    }
  }

  for (const subscriber of subscribers || []) {
    if ((subscriber.email || '').toLowerCase() !== TARGET_EMAIL) {
      continue;
    }

    const { error } = await supabase
      .from('subscribers')
      .update({ profile_id: targetUserId })
      .eq('id', subscriber.id);

    if (error) {
      throw error;
    }
  }

  for (const workspace of workspaces || []) {
    if (workspace.id === targetWorkspace.id) {
      continue;
    }

    const { error } = await supabase.from('workspaces').delete().eq('id', workspace.id);
    if (error) {
      throw error;
    }
  }

  console.log(
    JSON.stringify(
      {
        targetUserId,
        workspaceId: targetWorkspace.id,
        workspaceSlug: TARGET_WORKSPACE_SLUG,
        workspaceName: TARGET_WORKSPACE_NAME,
        importJobsReassigned: (importJobs || []).length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
