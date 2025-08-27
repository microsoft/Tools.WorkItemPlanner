// Assignee search & option rebuild logic
(function(){
  let teamMembersSnapshot = [];
  const orgUserSearchCache = new Map();
  let assigneeSearchDebounce = null;
  let lastAssigneeAppliedQuery = '';
  let lastAssigneeSearchRequestId = 0;
  let lastTeamFilterQuery = '';
  function rebuildAssigneeOptionsFromGenericUsers(users, { preserveSelection=true, isOrgSearch=false, silent=false }={}){
    const $sel=$('#assigned-to-select'); if (!$sel.length) return; const currentVal=$sel.val();
    $sel.find('option:not(:first)').remove();
    const userInList = Array.isArray(users) && users.some(u=> u && u.email && u.email===userEmailId);
    // Only inject current user if: performing org search OR current user actually part of the team snapshot
    if (userDisplayName && userEmailId && (isOrgSearch || userInList)){
      const opt=new Option(userDisplayName + ' (You)', userEmailId, false, false);
      $(opt).attr('data-user-id','current-user').attr('data-display-name', userDisplayName).attr('data-email', userEmailId);
      $sel.append(opt);
    }
    const deduped=[]; const seen=new Set();
    for (const u of (users||[])){
      if (!u || !u.email || seen.has(u.email) || u.email===userEmailId) continue; // skip duplicates & current user (already added if needed)
      seen.add(u.email); deduped.push(u);
    }
    deduped.sort((a,b)=> a.displayName.localeCompare(b.displayName));
    for (const u of deduped){ const o=new Option(u.displayName, u.email, false, false); $(o).attr('data-user-id', u.id || '').attr('data-display-name', u.displayName).attr('data-email', u.email).attr('data-source', isOrgSearch ? 'org':'team'); $sel.append(o); }
    if (preserveSelection && currentVal && (seen.has(currentVal) || currentVal===userEmailId)) $sel.val(currentVal);
    if (!silent) $sel.trigger('change.select2');
    setTimeout(()=> updateAssigneeDropdownAvatars(), 50);
  }
  async function searchOrganizationUsers(query){ const organization=$('#organization-select').val(); if (!organization || !query) return []; const normalized=query.trim().toLowerCase(); if (orgUserSearchCache.has(normalized)) return orgUserSearchCache.get(normalized); try { const authHeaders=await generateAuthHeaders(usePAT); authHeaders['Content-Type']='application/json'; const response=await fetch(`https://vssps.dev.azure.com/${organization}/_apis/graph/subjectquery?api-version=7.1-preview.1`, { method:'POST', headers:authHeaders, body: JSON.stringify({ query, subjectKind:['User'] }) }); let users=[]; if (response.ok){ const data=await response.json(); if (Array.isArray(data.value)){ users = data.value.map(u=> ({ id:u.descriptor||u.originId||u.id, displayName:u.displayName||u.principalName||u.mailAddress||'Unknown User', email:u.mailAddress||u.principalName||'' })).filter(u=> u.email && emailRegex.test(u.email)); } } else { const fallback=await fetch(`https://vssps.dev.azure.com/${organization}/_apis/IdentityPicker/Identities?searchFilter=General&filterValue=${encodeURIComponent(query)}&queryMembership=None&api-version=7.1-preview.1`, { headers: authHeaders }); if (fallback.ok){ const fData=await fallback.json(); if (Array.isArray(fData.results)){ users = fData.results.flatMap(r=> r.identities || []).map(i=> ({ id:i.localId||i.originId||i.subjectDescriptor, displayName:i.displayName, email:i.signInAddress||i.mail||i.upn||'' })).filter(u=> u.email && emailRegex.test(u.email)); } } }
    orgUserSearchCache.set(normalized, users); return users; } catch(e){ console.warn('Org user search failed', e); return []; } }
  function showAssigneeLoadingIndicator(){ const $r=$('.select2-container--open .select2-results__options'); if (!$r.length) return; if ($('#assignee-loading-indicator').length) return; $r.prepend('<li class="select2-results__option select2-assignee-loading" id="assignee-loading-indicator" aria-disabled="true"><span class="spinner"></span><span> Searching directory...</span></li>'); }
  function hideAssigneeLoadingIndicator(){ $('#assignee-loading-indicator').remove(); }
  async function handleAssigneeSearchInput(rawQuery){ const q=(rawQuery||'').trim(); const originalRaw=rawQuery||''; const $preField=$('.select2-container--open .select2-search__field'); let caretStart=null, caretEnd=null, preValue=null; if ($preField.length){ preValue=$preField.val(); if ($preField[0].selectionStart!=null){ caretStart=$preField[0].selectionStart; caretEnd=$preField[0].selectionEnd; } }
    // 0-2 chars: locally filter within team snapshot (no org search); 0 => full list
    if (q.length < 3){
      if (!Array.isArray(teamMembersSnapshot) || teamMembersSnapshot.length===0){
        // snapshot not ready yet: no-op to avoid clearing; try again later
        return;
      }
      const filterKey = q.toLowerCase();
      let filtered = teamMembersSnapshot;
      if (filterKey){
        filtered = teamMembersSnapshot.filter(u=> (u.displayName && u.displayName.toLowerCase().includes(filterKey)) || (u.email && u.email.toLowerCase().includes(filterKey)));
      }
      // Only rebuild if query or filtered size changed to reduce flicker
      const signature = filterKey + '::' + filtered.length;
      if (signature !== lastTeamFilterQuery){
        rebuildAssigneeOptionsFromGenericUsers(filtered, { preserveSelection:true, isOrgSearch:false, silent:false });
        lastTeamFilterQuery = signature;
        lastAssigneeAppliedQuery='__team__';
      }
      // Invalidate any in-flight org search requests so their results won't overwrite team view when they resolve
      lastAssigneeSearchRequestId++;
      return;
    }
  if (q === lastAssigneeAppliedQuery) return; showAssigneeLoadingIndicator(); const requestId=++lastAssigneeSearchRequestId; const users=await searchOrganizationUsers(q); hideAssigneeLoadingIndicator();
  // Abort applying if a newer mode (team view) took over or request is stale
  if (requestId !== lastAssigneeSearchRequestId) return; const currentOpenVal = ($('.select2-container--open .select2-search__field').val()||'').trim(); if (currentOpenVal.length <3 || lastAssigneeAppliedQuery==='__team__') return;
  rebuildAssigneeOptionsFromGenericUsers(users, { preserveSelection:true, isOrgSearch:true, silent:true }); lastAssigneeAppliedQuery=q; const inst2=$('#assigned-to-select').data('select2'); if (inst2 && inst2.isOpen && inst2.isOpen()){ try { inst2.trigger('query',{ term: originalRaw }); } catch(e){ $('#assigned-to-select').trigger('change.select2'); } } setTimeout(()=> { const $sf=$('.select2-container--open .select2-search__field'); if ($sf.length){ if ($sf.val()===preValue || $sf.val()===originalRaw){ $sf.val(originalRaw); if ($sf[0].setSelectionRange && caretStart!=null){ try { $sf[0].setSelectionRange(caretStart, caretEnd);} catch(_){} } } } },0); }
  function debouncedAssigneeSearch(rawQuery){ clearTimeout(assigneeSearchDebounce); assigneeSearchDebounce=setTimeout(()=> { handleAssigneeSearchInput(rawQuery); }, 350); }
  // Snapshot hook - wrap original populateAssignedToDropdown
  const _origPopulate = window.populateAssignedToDropdown;
  if (typeof _origPopulate === 'function'){
    window.populateAssignedToDropdown = function(users){ _origPopulate(users); if (Array.isArray(users)){ const filtered = users.filter(u=> { const i=u.identity; return i && i.displayName && i.uniqueName && emailRegex.test(i.uniqueName) && (!u.isContainer || u.isContainer===false) && !i.displayName.toLowerCase().includes('[service]') && !i.displayName.toLowerCase().includes('[inactive]'); }).map(u=> ({ id:u.identity.id, displayName:u.identity.displayName, email:u.identity.uniqueName })); teamMembersSnapshot = filtered; } };
  }
  const _baselineDebounced = debouncedAssigneeSearch;
  window.debouncedAssigneeSearch = function(rawQuery){
    const q=(rawQuery||'').trim();
    if (q.length <3){
      clearTimeout(assigneeSearchDebounce);
      const snapshotReady = Array.isArray(teamMembersSnapshot) && teamMembersSnapshot.length>0;
      handleAssigneeSearchInput(rawQuery);
      if (!snapshotReady){
        setTimeout(()=> { const curr=($('.select2-container--open .select2-search__field').val()||'').trim(); if (curr.length<3){ handleAssigneeSearchInput(curr); } }, 150);
      }
    } else {
      clearTimeout(assigneeSearchDebounce);
      assigneeSearchDebounce=setTimeout(()=> handleAssigneeSearchInput(rawQuery), 300);
    }
  };
  window._baselineDebouncedAssigneeSearch = _baselineDebounced;
})();
