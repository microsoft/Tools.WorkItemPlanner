// UI initialization pieces (sortable, select2) factored out from main.js
(function(){
  function initSortables(){
    $('.task-list').sortable({ handle: '.drag-handle', axis: 'y', containment: 'parent', tolerance: 'pointer'});
    $('#deliverables-container').sortable({ handle: '.drag-handle', axis: 'y', containment: 'parent', tolerance: 'pointer'});
  }
  function initializeSelect2Dropdowns(){
    // Moved verbatim from main.js (simplified to rely on existing formatter functions on window)
    $('#organization-select').select2({ placeholder:'Select an Organization', allowClear:false, width:'100%', dropdownAutoWidth:true, closeOnSelect:true, minimumResultsForSearch:0, dropdownCssClass:'select2-dropdown-large'});
    $('#project-select').select2({ placeholder:'Select a Project', allowClear:false, width:'100%', dropdownAutoWidth:true, closeOnSelect:true, minimumResultsForSearch:0, dropdownCssClass:'select2-dropdown-large'});
    $('#team-select').select2({ placeholder:'Select a Team', allowClear:false, width:'100%', dropdownAutoWidth:true, closeOnSelect:true, minimumResultsForSearch:0, dropdownCssClass:'select2-dropdown-large'});
    $('#assigned-to-select').select2({ placeholder:'Select an Assignee', allowClear:false, width:'100%', closeOnSelect:true, templateResult: formatUserOption, templateSelection: formatUserSelection, escapeMarkup: m=>m, minimumResultsForSearch:0, dropdownCssClass:'select2-dropdown-large', matcher: window.assigneeMatcher || undefined });
  }
  window.UIInit = { initSortables, initializeSelect2Dropdowns };
})();
