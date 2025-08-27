// Authentication helpers (extracted from main.js)
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
  window.generateAuthHeaders = generateAuthHeaders; // expose globally
})();
