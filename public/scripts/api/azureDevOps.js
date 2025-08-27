// Azure DevOps API wrappers extracted from main.js (no behavior changes)
(function(){
  async function generateAuthHeaders(usePAT){
    const headers = {};
    if (usePAT){
      const authToken = getTokenFromLocalStorage();
      const base64PAT = btoa(`:${authToken}`);
      headers['Authorization'] = `Basic ${base64PAT}`;
    } else {
      const accessToken = await getAccessToken();
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
  }

  async function createWorkItem({organization, project, type, document, usePAT}){
    const headers = await generateAuthHeaders(usePAT);
    headers['Content-Type'] = 'application/json-patch+json';
    const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$${encodeURIComponent(type)}?api-version=7.0`;
    const resp = await fetch(url, { method:'POST', headers, body: JSON.stringify(document)});
    return resp.json();
  }

  window.AdoApi = { generateAuthHeaders, createWorkItem };
})();
