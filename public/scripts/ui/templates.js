(function(){
  let prefilCategoryChoice = '';
  async function populatePrefilWorkItemsDropdown(){
    const dropdownMenu = $('.preconfigured-templates-dropdown');
    $.each(workItemTemplatesList, function(_idx, item){
      const option = $('<a>', { class:'dropdown-item preconfigured-choice', href:'#', 'data-choice': item.fileName, html: `${item.displayName}` });
      option.on('click', function(e){ e.preventDefault(); prefilCategoryChoice = $(this).data('choice'); $('#load-preconfigured-items-confirmationModal').modal('show'); });
      dropdownMenu.append(option);
    });
  }
  function getSelectedTemplateFileName(){ return prefilCategoryChoice; }
  window.populatePrefilWorkItemsDropdown = populatePrefilWorkItemsDropdown;
  window.TemplateSelection = { getSelectedTemplateFileName };
})();