// UI update & validation helpers extracted from main.js (behavior preserved)
(function(){
  function updateDeliverableCount(){
    const deliverableCount = $('.deliverable-item').length;
    $('#deliverable-count').text('(' + deliverableCount + ')');
  }
  function updateDeliverableEstimates(){
    $('.deliverable-item').each(function(){
      const $d = $(this); let total = 0;
      $d.find('.task-estimate').each(function(){ const v = parseFloat($(this).val()); if(!isNaN(v)) total += v; });
      $d.find('.deliverable-estimate').text('Dev Days: ' + total.toFixed(2));
    });
  }
  function updateFeatureEstimate(){
    let total = 0;
    document.querySelectorAll('.task-estimate').forEach(inp=>{
      const v = parseFloat(inp.value); if(!isNaN(v)) total += v;
    });
    if(isNaN(total)) total = 0;
    const el = document.getElementById('estimates-sum');
    if(el) el.textContent = '' + total;
  }
  function updateTaskCount(){
    $('.deliverable-item').each(function(){
      const $d = $(this); const taskCount = $d.find('.task-item').length;
      $d.find('h3 span').first().text('(' + taskCount + ')');
    });
    updateDeliverableEstimates();
    updateFeatureEstimate();
  }
  function updateDeleteTaskButtons(){
    $('.deliverable-item').each(function(){
      const $items = $(this).find('.task-item');
      if ($items.length === 1){ $items.find('.delete-task-btn').attr('disabled', true);} else { $items.find('.delete-task-btn').removeAttr('disabled'); }
    });
  }
  function updateDeleteDeliverableButtons(){
    const $deliverables = $('.deliverable-item');
    if ($deliverables.length > 1){ $deliverables.find('.delete-deliverable-btn').removeAttr('disabled'); } else { $deliverables.find('.delete-deliverable-btn').attr('disabled', true); }
  }
  window.UIUpdates = { updateDeliverableCount, updateDeliverableEstimates, updateTaskCount, updateDeleteTaskButtons, updateDeleteDeliverableButtons };
  // Preserve global name for existing inline references
  window.updateFeatureEstimate = updateFeatureEstimate;
})();
