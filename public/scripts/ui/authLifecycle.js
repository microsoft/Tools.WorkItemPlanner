// Authentication lifecycle helpers (extracted after main.js removal)
(function(){
  async function loadUserProfile(){
    try {
      // Acquire a token (no scopes variant sufficient for Graph photo via separate call in avatar.js)
      if(!usePAT){
        // Basic profile info from MSAL cached account
        const accounts = (window.myMSALObj && myMSALObj.getAllAccounts()) || [];
        if(accounts.length){
          const acct = accounts[0];
          userEmailId = acct.username || userEmailId;
          userDisplayName = acct.name || acct.username || userDisplayName;
        }
      }
      if(typeof displayUserName === 'function' && userDisplayName){ displayUserName(userDisplayName); }
      // Fetch profile image (non-blocking)
      if(typeof fetchUserProfileImage === 'function' && !usePAT){ fetchUserProfileImage(); }
    } catch(e){ console.warn('loadUserProfile failed', e); }
  }

  function onSuccessLogin(){
    try { loadUserProfile(); } catch(e){ console.warn('post-login profile load failed', e); }
    // Initialize Select2 & template dropdown etc.
    if(window.UIInit && typeof UIInit.initializeSelect2Dropdowns==='function'){ UIInit.initializeSelect2Dropdowns(); }
  if(window.UIInit && typeof UIInit.initSortables==='function'){ UIInit.initSortables(); }
    if(typeof populatePrefilWorkItemsDropdown==='function'){ populatePrefilWorkItemsDropdown(); }
  // Kick off org/project/team bootstrap
  if(typeof populateOrganizationsDropdown==='function'){ try { showLoadingIndicator('Loading Organizations...'); populateOrganizationsDropdown().then(()=> hideLoadingIndicator()).catch(err=> { console.error('Org load failed', err); hideLoadingIndicator(); }); } catch(e){ console.warn('populateOrganizationsDropdown failed early', e); } }
  // Ensure prefix placeholders align with default work item label
  if(typeof selectedWorkItemTypeName !== 'undefined'){ $('#deliverables-container .deliverable-title').attr('placeholder', selectedWorkItemTypeName + ' Title'); $('#deliverables-container .deliverable-prefix').attr('placeholder', selectedWorkItemTypeName + ' Title Prefix'); }
  // Reveal application root if hidden
  const appRoot = document.getElementById('app-root'); if(appRoot){ appRoot.classList.remove('app-root-hidden'); }
    hideLoadingIndicator();
  }

  window.loadUserProfile = loadUserProfile;
  window.onSuccessLogin = onSuccessLogin;
})();