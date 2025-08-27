// Lookup & fetch functions (organizations, projects, teams, iterations, work item types, users, feature details, area paths)
(function(){
  async function fetchFeatureDetails(){
    const featureId = $('#feature-id').val();
    const organization = $('#organization-select').val();
    const project = $('#project-select').val();
    const headers = await generateAuthHeaders(usePAT);
    if (featureId && organization && project){
      const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${featureId}?api-version=7.0`;
      try {
        const response = await fetch(url, { method:'GET', headers });
        if (response.ok){
          featureIdValid = true; return await response.json();
        } else {
          if (response.status === 404){
            hideLoadingIndicator();
            showErrorPopup(`Feature with Id '${featureId}' not found. Verify the Feature Id, selected Organization & Project`);
            $('#feature-id').addClass('is-invalid');
            $('#feature-name').text('').attr('href','#');
            featureIdValid = false;
          } else { console.error('Error:', response.statusText); throw new Error('Network response was not ok'); }
        }
      } catch(err){ console.error('Error:', err); featureIdValid = false; throw err; }
    }
    if (!featureId) featureIdValid = false;
  }
  async function fetchUserPublicAlias(){
    const url = `https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0`;
    const authHeaders = await generateAuthHeaders(usePAT);
    try { const response = await $.ajax({ url, method:'GET', headers: authHeaders }); return response.publicAlias; } catch(e){ console.error('Error fetching public alias:', e); }
  }
  async function fetchUserOrganizations(publicAlias){
    const url = `https://app.vssps.visualstudio.com/_apis/accounts?memberId=${publicAlias}&api-version=7.1`;
    const authHeaders = await generateAuthHeaders(usePAT);
    try { const response = await $.ajax({ url, method:'GET', headers: authHeaders }); return response.value; } catch(e){ console.error('Error fetching organizations:', e); }
  }
  async function populateOrganizationsDropdown(){
    const publicAlias = await fetchUserPublicAlias();
    if (!publicAlias){ hideLoadingIndicator(); console.error('No public alias found.'); showNonDismissibleErrorPopup("You do not have access to Azure DevOps. Ensure that you are able to access atleast one <b>Organization</b> - 'https://dev.azure.com/'"); return; }
    const organizations = await fetchUserOrganizations(publicAlias);
    if (!organizations || organizations.length===0){ hideLoadingIndicator(); showNonDismissibleErrorPopup("You do not have access to any <b>Organization</b> in Azure DevOps. Ensure that you are able to access atleast one <b>Organization</b> - 'https://dev.azure.com/'"); return; }
    const organizationSelect = document.getElementById('organization-select');
    while (organizationSelect.options.length > 1) { organizationSelect.remove(1); }
    organizations.sort((a,b)=> a.accountName.localeCompare(b.accountName));
    organizations.forEach(o=> { const opt = document.createElement('option'); opt.value = o.accountName; opt.textContent = o.accountName; organizationSelect.appendChild(opt); });
  }
  async function fetchProjectsForOrganization(organization){
    const url = `https://dev.azure.com/${organization}/_apis/projects?api-version=7.0`;
    const authHeaders = await generateAuthHeaders(usePAT);
    try { const response = await $.ajax({ url, method:'GET', headers: authHeaders }); return response.value; } catch(e){ if (e.status===404){ console.warn('Projects not found:', e); return []; } else { console.error('Error fetching projects:', e); } }
  }
  function clearProjectSelect(){ const projectSelect = document.getElementById('project-select'); while (projectSelect.options.length > 1){ projectSelect.remove(1);} projectSelect.selectedIndex=0; projectSelect.disabled = true; }
  async function populateProjectsDropdown(){
    const organization = $('#organization-select').val();
    const projects = await fetchProjectsForOrganization(organization);
    if (projects.length === 0){ hideLoadingIndicator(); showErrorPopup("You do not have access to any <b>Project</b> in the selected <b>Organization</b>. Use the dropdowns to select your <b>Organization</b>"); return; }
    clearProjectSelect();
    projects.sort((a,b)=> a.name.localeCompare(b.name));
    const projectSelect = document.getElementById('project-select');
    projects.forEach(p=> { const opt=document.createElement('option'); opt.value=p.name; opt.textContent=p.name; projectSelect.appendChild(opt); });
    projectSelect.disabled = false;
  }
  async function populateTeamProfile(){
    const organization = $('#organization-select').val();
    const project = $('#project-select').val();
    if (organization && project){
      const url = `https://dev.azure.com/${organization}/_apis/projects/${project}/teams?api-version=7.0&$mine=true`;
      const authHeaders = await generateAuthHeaders(usePAT);
      return $.ajax({ url, method:'GET', headers: authHeaders })
        .done(data => {
          const teams = data.value.sort((a,b)=> a.name.localeCompare(b.name));
          populateTeamDropdown(teams);
          if (teams.length >= 1){ fetchWorkItemTypes().then(()=> fetchAreaPathsForTeam()).then(()=> fetchIterationsForTeam()).then(()=> fetchUsersInTeam()).then(()=> hideLoadingIndicator()); }
        })
        .fail(xhr => { if (xhr.status===401){ console.error('Unauthorized. Logging out'); logout(); } else { console.log(xhr.responseText); hideLoadingIndicator(); showErrorPopup('Error fetching teams. Check console log.'); }});
    } else { return Promise.reject('Please select both Organization and Project.'); }
  }
  function populateTeamDropdown(teams){
    if (teams.length===0){ noTeamAccess = true; clearTeamDropdown(); const teamSelect = document.getElementById('team-select'); const placeholder = teamSelect.options[0]; if (placeholder) placeholder.textContent='No Teams (Proceed Without Team)'; hideLoadingIndicator(); showInfoPopup('You are not a member of any <b>Team</b> in the selected <b>Project</b>...'); enableAssigneeFallback(); fetchWorkItemTypes().catch(err=> { console.warn('Failed to fetch Work Item Types in no-team fallback', err); showErrorPopup('Failed to load Work Item Types. Retry after selecting project again.'); }); } else { noTeamAccess=false; clearTeamDropdown(); const teamSelect=document.getElementById('team-select'); teams.forEach(t=> { const opt=document.createElement('option'); opt.value=t.id; opt.textContent=t.name; teamSelect.appendChild(opt); }); teamSelect.disabled=false; }
  }
  function clearTeamDropdown(){ const teamSelect=document.getElementById('team-select'); while (teamSelect.options.length>1){ teamSelect.remove(1);} teamSelect.selectedIndex=0; teamSelect.disabled=true; }
  async function fetchIterationsForTeam(){
    const organization=$('#organization-select').val(); const project=$('#project-select').val(); const team=$('#team-select').val();
    if (organization && project && team){
      const url=`https://dev.azure.com/${organization}/${project}/${team}/_apis/work/teamsettings/iterations?api-version=7.0`;
      const authHeaders = await generateAuthHeaders(usePAT);
      return $.ajax({ url, method:'GET', headers: authHeaders })
        .done(data=> { populateIterationSuggestions(data.value); })
        .fail(xhr=> { if (xhr.status===401){ console.error('Unauthorized. Logging out'); logout(); } else { console.log(xhr.responseText); hideLoadingIndicator(); showErrorPopup('Error fetching iterations. Check console log.'); }});
    } else { return Promise.reject('Please select organization, project & team.'); }
  }
  async function fetchWorkItemTypes(){
    const organization=$('#organization-select').val(); const project=$('#project-select').val();
    if (organization && project){
      const url=`https://dev.azure.com/${organization}/${project}/_apis/wit/workitemtypes?api-version=7.0`;
      const authHeaders = await generateAuthHeaders(usePAT);
      return $.ajax({ url, method:'GET', headers: authHeaders })
        .done(data=> { const workItemTypes = data.value.sort((a,b)=> a.name.localeCompare(b.name)); populateWorkItemTypesDropdown(workItemTypes); })
        .fail(xhr=> { if (xhr.status===401){ console.error('Unauthorized. Logging out'); logout(); } else { console.log(xhr.responseText); hideLoadingIndicator(); showErrorPopup('Error fetching Work Item Types. Check console log.'); }});
    } else { return Promise.reject('Please select both Organization and Project.'); }
  }
  async function fetchUsersInTeam(){
    const organization=$('#organization-select').val(); const project=$('#project-select').val(); const team=$('#team-select').val();
    if (organization && project && team){
      const url=`https://dev.azure.com/${organization}/_apis/projects/${project}/teams/${team}/members?$expandMembership=true&api-version=7.0`;
      const authHeaders = await generateAuthHeaders(usePAT);
      return $.ajax({ url, method:'GET', headers: authHeaders })
        .done(data=> { populateAssignedToDropdown(data.value); })
        .fail(xhr=> { if (xhr.status===401){ console.error('Unauthorized. Logging out'); logout(); } else { console.error('Error fetching team users:', xhr.responseText); hideLoadingIndicator(); showErrorPopup('Error fetching Team Users. Check console log.'); }});
    } else { return Promise.reject('Please select organization, project, and team.'); }
  }
  function clearAssignedToDropdown(){ const $sel=$('#assigned-to-select'); if ($sel.length){ $sel.find('option:not(:first)').remove(); $sel.val('').trigger('change'); $sel.prop('disabled', true).removeClass('is-invalid'); }}
  function enableAssigneeFallback(){ const $sel=$('#assigned-to-select'); if (!$sel.length) return; if (!$sel.prop('disabled')) return; $sel.find('option:not(:first)').remove(); if (userDisplayName && userEmailId){ const opt=new Option(userDisplayName + ' (You)', userEmailId, true, true); $(opt).attr('data-user-id','current-user').attr('data-display-name', userDisplayName).attr('data-email', userEmailId); $sel.append(opt); } $sel.prop('disabled', false).trigger('change'); }
  function populateAssignedToDropdown(users){
    clearAssignedToDropdown(); const $sel=$('#assigned-to-select'); if (!$sel.length){ console.error('Assigned to dropdown element not found'); return; }
    // Strictly list only returned team members (do not auto-add current user unless actually part of team)
    if (users && users.length>0){
      const valid = users.filter(u=> { const i=u.identity; return i && i.displayName && i.uniqueName && emailRegex.test(i.uniqueName) && !i.displayName.toLowerCase().includes('[service]') && !i.displayName.toLowerCase().includes('[inactive]') && (!u.isContainer || u.isContainer===false); });
      valid.sort((a,b)=> a.identity.displayName.localeCompare(b.identity.displayName));
      valid.forEach(u=> { const d=u.identity.displayName; const e=u.identity.uniqueName; const id=u.identity.id; const opt=new Option(d, e, false, false); $(opt).attr('data-user-id', id).attr('data-display-name', d).attr('data-email', e); $sel.append(opt); });
      if(valid.length>0){ $sel.prop('disabled', false).trigger('change'); prefetchAssigneeAvatars(); }
    }
  }
  async function fetchAreaPathsForTeam(){ const organization=$('#organization-select').val(); const project=$('#project-select').val(); const team=$('#team-select').val(); if (organization && project && team){ const url=`https://dev.azure.com/${organization}/${project}/${team}/_apis/work/teamsettings/teamfieldvalues?api-version=7.0`; const authHeaders=await generateAuthHeaders(usePAT); return $.ajax({ url, method:'GET', headers: authHeaders }).done(data=> { populateAreaPathSuggestions(data.values); }).fail(xhr=> { if (xhr.status===401){ console.error('Unauthorized. Logging out'); logout(); } else { console.log(xhr.responseText); hideLoadingIndicator(); showErrorPopup('Error fetching area paths. Check console log.'); } return []; }); } else { return Promise.reject('Please select organization, project & team.'); } }
  function populateIterationSuggestions(iterations){ const list=document.getElementById('suggested-iterations-list'); list.innerHTML=''; for (let i=iterations.length-1;i>=0;i--){ const it=iterations[i]; const opt=document.createElement('option'); opt.value=it.path; opt.textContent = it.attributes.timeFrame==='current'? `${it.path} (current)` : it.path; list.appendChild(opt);} }
  function populateAreaPathSuggestions(areaPaths){ const list=document.getElementById('suggested-area-paths-list'); list.innerHTML=''; areaPaths.forEach(ap=> { const opt=document.createElement('option'); opt.value=ap.value; list.appendChild(opt); }); }
  window.fetchFeatureDetails = fetchFeatureDetails;
  window.populateOrganizationsDropdown = populateOrganizationsDropdown;
  window.fetchProjectsForOrganization = fetchProjectsForOrganization;
  window.clearProjectSelect = clearProjectSelect;
  window.populateProjectsDropdown = populateProjectsDropdown;
  window.populateTeamProfile = populateTeamProfile;
  window.populateTeamDropdown = populateTeamDropdown;
  window.clearTeamDropdown = clearTeamDropdown;
  window.fetchIterationsForTeam = fetchIterationsForTeam;
  window.fetchWorkItemTypes = fetchWorkItemTypes;
  window.fetchUsersInTeam = fetchUsersInTeam;
  window.clearAssignedToDropdown = clearAssignedToDropdown;
  window.enableAssigneeFallback = enableAssigneeFallback;
  window.populateAssignedToDropdown = populateAssignedToDropdown;
  window.fetchAreaPathsForTeam = fetchAreaPathsForTeam;
  window.populateIterationSuggestions = populateIterationSuggestions;
  window.populateAreaPathSuggestions = populateAreaPathSuggestions;
})();
