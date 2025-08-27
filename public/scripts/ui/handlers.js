// Centralized UI/DOM event handler bindings extracted from eventHandlers.js
(function(){
  function initAuthBootstrap(){
    showLoadingIndicator();
    if(!usePAT){ signIn(); } else { onSuccessLogin(); }
  }

  function bindSelect2Behavior(){
    const sel = '#organization-select, #project-select, #team-select, #assigned-to-select';
    $(document).on('select2:select', sel, function(){ $(this).select2('close'); });
    // Explicit close for project/team (legacy redundancy preserved)
    $('#project-select').on('select2:select', e=>{ e.preventDefault(); $(e.currentTarget).select2('close'); });
    $('#team-select').on('select2:select', e=>{ e.preventDefault(); $(e.currentTarget).select2('close'); });
    $(document).on('select2:open', sel, function(){
      const dropdownId = $(this).attr('id');
      setTimeout(()=>{ const sf = $('.select2-container--open .select2-dropdown .select2-search__field'); if(sf.length){ try{ sf[0].focus(); sf[0].select(); }catch(_){} } },100);
      if(dropdownId === 'assigned-to-select'){
        setTimeout(()=>{ if(typeof updateAssigneeDropdownAvatars==='function') updateAssigneeDropdownAvatars(); },200);
        setTimeout(()=>{ const $sf = $('.select2-container--open .select2-search__field'); if($sf.length){ $sf.off('input.assigneeSearch keyup.assigneeSearch').on('input.assigneeSearch keyup.assigneeSearch', function(){ const v=$(this).val(); if(typeof debouncedAssigneeSearch==='function') debouncedAssigneeSearch(v); }); } },50);
      }
    });
  }

  function toggleDescription(e){
    e.preventDefault();
    const $btn = $(e.currentTarget);
    const $caret = $btn.find('.description-caret');
    const $section = $btn.closest('.form-group, .task-item').find('.description-section');
    if($section.is(':visible')){ $section.slideUp(200); $caret.removeClass('rotated'); } else { $section.slideDown(200); $caret.addClass('rotated'); }
  }

  function addDeliverable(e){
    e.preventDefault();
    $('.form-control').removeClass('is-invalid');
    if(!validateDeliverable()) return;
    const $last = $('.deliverable-item').last();
    const idx = parseInt($last.attr('data-index'),10);
    const nextIdx = idx + 1;
    const $new = $last.clone();
    $new.attr('data-index', nextIdx);
    $new.find('input, textarea').val('');
    if(window.ENABLE_RICH_TEXT_EDITOR){ $new.find('.deliverable-description, .task-description').empty(); } else { $new.find('.deliverable-description, .task-description').text(''); }
    const prefix = $('#deliverable-prefix').val();
    $new.find('.deliverable-prefix').val(prefix);
    $new.find('.deliverable-title').attr('placeholder', selectedWorkItemTypeName + ' Title');
    $new.find('.description-section').hide();
    $new.find('.description-caret').removeClass('rotated');
    $new.find('.delete-task-btn').attr('disabled', true);
    $new.find('.task-item:not(:first)').remove();
    $new.find('.form-control').each(function(){ const id=$(this).attr('id'); if(id){ $(this).attr('id', id.replace(idx, nextIdx)); } });
    $new.find('.delete-deliverable-btn').removeAttr('disabled');
    $last.after($new);
    $new.hide().slideDown(200);
    $new.find('.task-list').sortable({ handle: '.drag-handle', axis: 'y', containment: 'parent', tolerance: 'pointer' });
    updateDeleteDeliverableButtons(); updateDeleteTaskButtons(); updateDeliverableCount(); updateDeliverableEstimates(); updateFeatureEstimate(); hideLoadingIndicator();
  }

  function addTask(e){
    e.preventDefault();
    const $list = $(e.currentTarget).closest('.form-group').find('.task-list');
    const $titles = $list.find('.task-title'); const $estimates = $list.find('.task-estimate');
    $('.form-control').removeClass('is-invalid');
    let invalid=false;
    $titles.each(function(){ if($(this).val().trim()===''){ $(this).addClass('is-invalid'); invalid=true; } });
    $estimates.each(function(){ if($(this).val().trim()===''){ $(this).addClass('is-invalid'); invalid=true; } });
    if(invalid) return;
    const $item = $list.find('.task-item').first().clone();
    $item.find('input, textarea').val('');
    if(window.ENABLE_RICH_TEXT_EDITOR){ $item.find('.task-description').empty(); } else { $item.find('.task-description').text(''); }
    $item.find('.description-section').hide(); $item.find('.description-caret').removeClass('rotated');
    $list.append($item); $item.hide().slideDown(200);
    updateDeleteTaskButtons(); updateTaskCount($list);
  }

  function deleteTask(e){
    e.preventDefault();
    const $task = $(e.currentTarget).closest('.task-item');
    const $deliverable = $(e.currentTarget).closest('.deliverable-item');
    if($deliverable.find('.task-item').length === 1) return;
    $task.slideUp(200, function(){ $(this).remove(); updateDeleteTaskButtons(); updateTaskCount(); hideLoadingIndicator(); });
  }

  function submitFeatureForm(e){
    e.preventDefault();
    if(!validateForm()) return;
    showLoadingIndicator('Preparing to create Work Items...');
    totalCalls = 0;
    const areaPath = $('#area-path').val();
    const iteration = $('#iteration').val();
    const featureIdVal = $('#feature-id').val();
    const prefix = $(e.currentTarget).find('.deliverable-prefix').val();
    let totalTasksCount = 0; const deliverables = [];
    $('.deliverable-item').each(function(){
      const deliverableTitle = $(this).find('.deliverable-title').val();
      const $deliverableDescEditor = $(this).find('.deliverable-description');
      const deliverableDescription = getDescriptionContent($deliverableDescEditor);
      const tasks = [];
      $(this).find('.task-item').each(function(){
        const taskTitle = $(this).find('.task-title').val().trim();
        if(taskTitle){
          totalTasksCount++;
          const $taskDescEditor = $(this).find('.task-description');
          const taskDescription = getDescriptionContent($taskDescEditor);
          tasks.push({ title: taskTitle, estimate: $(this).find('.task-estimate').val().trim(), description: taskDescription });
        }
      });
      const prefixedTitle = (prefix + ' ' + deliverableTitle).trim();
      deliverables.push({ title: prefixedTitle, description: deliverableDescription, tasks });
    });
    const data = { featureId: featureIdVal, areaPath, iteration, deliverables };
    totalCalls = deliverables.length + totalTasksCount;
    setProgressBar(0);
    createDeliverablesAndTasks(data)
      .then(()=> featureIdVal ? getLinkedWorkItemsQuery(featureIdVal).then(queryUrl=>({queryUrl})) : { queryUrl:null })
      .then(({queryUrl})=>{
        const feedbackLink = 'Got suggestions? I\'d love to hear them – <a href="https://forms.office.com/r/6QYanppNWa" target="_blank">Submit Feedback</a>';
        let message = 'Work Item(s) saved to Azure DevOps.';
        if(queryUrl){ message += `<br/><br/><a href="${queryUrl}" target="_blank">Click here</a> to view the Work Item(s).`; }
        else { message += '<br/><br/>No parent Work Item provided; items were created standalone.'; }
        message += `<br/><br/>${feedbackLink}`;
        showSuccessPopup(message); stopProgressBar(false); resetForm(); hideLoadingIndicator();
      })
      .catch(err=>{ stopProgressBar(true); console.log(err); showErrorPopup('Error creating Work-Items. Check console log'); hideLoadingIndicator(); });
  }

  function loadSelectedTemplate(){
    $('#load-preconfigured-items-confirmationModal').modal('hide');
    const fileName = (window.TemplateSelection && window.TemplateSelection.getSelectedTemplateFileName()) || '';
    if(!fileName) return;
    const jsonFilePath = 'work_item_templates/' + fileName;
    readJSONFileByNameFromPublicFolder(jsonFilePath)
      .then(workItemsJson => populateFormWithPreconfiguredData(workItemsJson))
      .then(()=>{ updateDeliverableCount(); updateTaskCount(); updateDeleteDeliverableButtons(); updateDeleteTaskButtons(); updateDeliverableEstimates(); updateFeatureEstimate(); })
      .catch(err=>{ console.error('Error loading preconfigured data:', err); showErrorPopup('An error occurred while loading preconfigured data. Please try again.'); });
  }

  function clearValidationOnInput(e){ const el=e.currentTarget; if($(el).hasClass('is-invalid') && el.checkValidity && el.checkValidity()) { $(el).removeClass('is-invalid'); } }
  function pasteDigitsOnly(e){ const data=(e.originalEvent.clipboardData||window.clipboardData).getData('text'); if(!/^\d+$/.test(data)){ e.preventDefault(); } }
  function estimateChanged(){
    const $deliverableItem = $(this).closest('.deliverable-item');
    let sum = 0; $deliverableItem.find('.task-estimate').each(function(){ sum += parseFloat($(this).val()) || 0; });
    $deliverableItem.find('.deliverable-estimate').text('Dev Days: ' + sum.toFixed(2));
    updateFeatureEstimate();
  }
  function prefixChanged(){ $('.deliverable-prefix').val($(this).val()); }
  function submitPAT(){ PAT = $('#pat-input').val(); if(PAT){ storeTokenInLocalStorage(PAT); closePatPopup(); loadUserProfile(); } else { alert('Please enter a valid PAT.'); } }
  function patInputChanged(){ const pat=$(this).val(); $('#pat-submit').prop('disabled', !pat); }
  function featureIdBlur(){
    const featureIdText = $(this).val();
    if(!featureIdText){ $('#feature-name').text('').attr('href','#'); if (typeof featureIdValid !== 'undefined') { featureIdValid = false; } return; }
    $('#feature-id').removeClass('is-invalid');
    const organization = $('#organization-select').val(); const project = $('#project-select').val();
    if(!organization || !project){ showErrorPopup('Please select organization and project.'); return; }
    showLoadingIndicator('Fetching Work-Item Details...'); if (typeof featureIdValid !== 'undefined') { featureIdValid = false; }
    fetchFeatureDetails(featureIdText, organization, project, true)
      .then(featureDetails=>{ if(featureDetails && featureDetails.fields && featureDetails.fields['System.Title']){ $('#feature-name').text(featureDetails.fields['System.Title']).attr('href', getFeatureUrl()); } hideLoadingIndicator(); })
      .catch(err=>{ hideLoadingIndicator(); console.log(err); showErrorPopup('Error fetching feature details. Check console log.'); });
  }
  function organizationChanged(){
    $(this).select2('close');
    const selectedOrganization = $(this).val();
    if(!selectedOrganization){ return; }
    showLoadingIndicator('Fetching Projects...');
    clearProjectSelect(); clearWorkItemTypesDropdown(); clearTeamDropdown(); clearAssignedToDropdown();
    if (typeof cleanupAvatarCache === 'function') { cleanupAvatarCache(); }
    populateProjectsDropdown().then(()=>{
      const selectedProject = $('#project-select').val();
      if(selectedOrganization && selectedProject && selectedProject !== ''){
        clearTeamDropdown(); $('#iteration').empty(); $('#area-path').empty(); $('#feature-id').val(''); $('#feature-name').text('').attr('href','#'); $('#area-path').val(''); $('#iteration').val(''); clearWorkItemTypesDropdown(); clearAssignedToDropdown();
        document.getElementById('suggested-iterations-list').innerHTML=''; document.getElementById('suggested-area-paths-list').innerHTML='';
        fetchWorkItemTypes(selectedOrganization, selectedProject);
        populateTeamProfile().catch(err=> console.error('Error fetching user\'s teams:', err)).finally(()=> hideLoadingIndicator());
      } else { hideLoadingIndicator(); }
    });
  }
  function projectChanged(){
    $(this).select2('close');
    const selectedOrganization = $('#organization-select').val(); const selectedProject = $(this).val();
    if(!(selectedOrganization && selectedProject)) return;
    showLoadingIndicator('Fetching Project Details...');
    clearTeamDropdown(); $('#iteration').empty(); $('#area-path').empty(); $('#feature-id').val(''); $('#feature-name').text('').attr('href','#'); $('#area-path').val(''); $('#iteration').val(''); clearWorkItemTypesDropdown(); clearAssignedToDropdown();
    document.getElementById('suggested-iterations-list').innerHTML=''; document.getElementById('suggested-area-paths-list').innerHTML='';
    populateTeamProfile().catch(err=> console.error('Error fetching user\'s teams:', err)).finally(()=> hideLoadingIndicator());
  }
  function clearWorkItemTypesDropdown(){
    const workItemSelect = document.getElementById('work-item-type-select');
    while (workItemSelect.options.length > 1) { workItemSelect.remove(1); }
    selectedWorkItemTypeName = 'Work Item';
    $('#deliverables-container .deliverable-prefix').attr('placeholder', selectedWorkItemTypeName + ' Title Prefix');
    $('#deliverables-container .deliverable-title').attr('placeholder', selectedWorkItemTypeName + ' Title');
    $('#selected-work-item-name').text(selectedWorkItemTypeName); $('#work-item-hierarchy').show();
    $('#work-items-header').contents().first().replaceWith(selectedWorkItemTypeName + ' ');
    workItemSelect.selectedIndex = 0; workItemSelect.disabled = true;
  }
  function populateWorkItemTypesDropdown(workItemTypes){
    const $dropdown = $('#work-item-type-select'); clearWorkItemTypesDropdown(); workItemTypes.forEach(t=> $dropdown.append(new Option(t.name, t.referenceName))); $dropdown.prop('disabled', false);
  }
  function workItemTypeChanged(){
    selectedWorkItemTypeName = $(this).find('option:selected').text();
    $('#deliverables-container .deliverable-prefix').attr('placeholder', selectedWorkItemTypeName + ' Title Prefix');
    $('#deliverables-container .deliverable-title').attr('placeholder', selectedWorkItemTypeName + ' Title');
    $('#selected-work-item-name').text(selectedWorkItemTypeName); $('#work-item-hierarchy').show();
    $('#work-items-header').contents().first().replaceWith(selectedWorkItemTypeName + ' ');
  }
  function teamChanged(){
    $(this).select2('close'); const selectedTeam = $(this).val(); if(!selectedTeam) return;
    showLoadingIndicator('Fetching Team Configuration...'); $('#iteration').val(''); $('#area-path').val(''); clearAssignedToDropdown();
    fetchIterationsForTeam().then(()=> fetchAreaPathsForTeam()).then(()=>{ showLoadingIndicator('Fetching Team Members...'); return fetchUsersInTeam(); }).catch(err=> console.error('Error fetching team data:', err)).finally(()=> hideLoadingIndicator());
  }
  function profileDropdownClicked(e){ e.preventDefault(); $('.floating-menu').toggleClass('show'); }
  function docClick(e){ if(!$('#profile-dropdown').is(e.target) && $('#profile-dropdown').has(e.target).length===0 && !$('.floating-menu').is(e.target) && $('.floating-menu').has(e.target).length===0){ $('.floating-menu').removeClass('show'); } }
  function logoutClicked(e){ e.preventDefault(); logout(); }

  function bindCore(){
    // Initial auth / loading
    $(document).ready(initAuthBootstrap);
    bindSelect2Behavior();
    $(document).on('click', '.description-toggle-btn', toggleDescription);
    $('#add-deliverable').on('click', addDeliverable);
    $(document).on('click', '.add-task-btn', addTask);
    $(document).on('click', '.delete-task-btn', deleteTask);
    $('#feature-form').on('submit', submitFeatureForm);
    $('#load-preconfigured-items-confirmBtn').on('click', loadSelectedTemplate);
    $('#reset-form-link').on('click', e=>{ e.preventDefault(); resetForm(); });
    $('.form-control').on('input', clearValidationOnInput);
    $(document).on('input', '.task-estimate', estimateChanged);
    $('#feature-id').on('paste', pasteDigitsOnly).on('blur', featureIdBlur);
    $(document).on('paste', '.task-estimate', pasteDigitsOnly);
    $('#deliverable-prefix').on('input', prefixChanged);
    $(document).on('click', '#pat-submit', submitPAT);
    $(document).on('input', '#pat-input', patInputChanged);
    $('#organization-select').on('change', organizationChanged);
    $('#project-select').on('change', projectChanged);
    $(document).on('change', '#work-item-type-select', workItemTypeChanged);
    $('#team-select').on('change', teamChanged);
    $('#profile-dropdown').on('click', profileDropdownClicked);
    $(document).on('click', docClick);
    $('.logout-link').on('click', logoutClicked);
  }

  window.UIHandlers = { bindCore, populateWorkItemTypesDropdown };
  window.populateWorkItemTypesDropdown = populateWorkItemTypesDropdown; // legacy global
})();
