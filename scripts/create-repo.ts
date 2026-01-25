import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
  return accessToken;
}

async function main() {
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });
  
  try {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: 'iuria',
      description: 'Sistema de Gestão Jurídica - Legal Management System for Brazilian Law Firms',
      private: false,
      auto_init: false
    });
    console.log('Repositorio criado: ' + data.clone_url);
    console.log('REPO_URL=' + data.clone_url);
  } catch (error: any) {
    if (error.status === 422) {
      const user = await octokit.users.getAuthenticated();
      console.log('Repositorio ja existe: https://github.com/' + user.data.login + '/iuria.git');
      console.log('REPO_URL=https://github.com/' + user.data.login + '/iuria.git');
    } else {
      console.error('Erro:', error.message);
      throw error;
    }
  }
}

main();
