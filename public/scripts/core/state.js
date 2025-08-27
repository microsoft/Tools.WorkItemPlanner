// Central shared state & simple getters/setters
// (Extracted from main.js for modularity; no behavior changes)

window.AppState = (function(){
  const state = {
    tokenKeyName: 'wpx_feature_planner_user_auth_token',
    totalCalls: 0,
    userEmailId: '',
    userDisplayName: '',
    noTeamAccess: false,
    featureIdValid: false,
    selectedWorkItemTypeName: 'Work-Item'
  };

  // Expose legacy globals to avoid refactors across existing scripts
  window.totalCalls = state.totalCalls;
  window.userEmailId = state.userEmailId;
  window.userDisplayName = state.userDisplayName;
  window.noTeamAccess = state.noTeamAccess;
  window.featureIdValid = state.featureIdValid;
  window.selectedWorkItemTypeName = state.selectedWorkItemTypeName;
  // Legacy constant compatibility
  window.token_key_name = state.tokenKeyName;
  // Common reusable regexes
  if(!window.emailRegex){ window.emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i; }

  return {
    get: (k) => state[k],
    set: (k,v) => { state[k] = v; window[k] = v; return v; },
    inc: (k,delta=1)=> { state[k]+=delta; window[k] = state[k]; return state[k]; },
    snapshot: () => ({...state})
  };
})();

// Global logout shim (moved from removed main.js)
window.logout = function(){
  if (typeof usePAT !== 'undefined' && usePAT){
    if (typeof clearTokenFromLocalStorage === 'function') clearTokenFromLocalStorage();
    window.location.reload();
  } else if (typeof signOut === 'function') {
    signOut();
  }
};
