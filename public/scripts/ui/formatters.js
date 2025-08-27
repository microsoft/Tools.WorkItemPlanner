// Select2 formatting helpers
(function(){
  function formatUserOption(user){
    if (!user.id) return user.text;
    const $user = $(user.element);
    const userId = $user.data('user-id');
    const displayName = $user.data('display-name') || user.text;
    const email = $user.data('email') || $user.val() || '';
    const avatarUrl = avatarCache.get(userId) || createAvatarCanvas(displayName);
    return $(
      `<div class="select2-user-option" data-user-id="${userId || ''}" data-display-name="${displayName}">
         <img class="select2-user-image" src="${avatarUrl}" alt="${displayName}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;">
         <div class="select2-user-text">
           <div class="select2-user-name">${displayName}</div>
           ${email ? `<div class=\"select2-user-email\">${email}</div>` : ''}
         </div>
       </div>`
    );
  }
  function formatUserSelection(user){
    if (!user.id) return user.text;
    const $user = $(user.element);
    const userId = $user.data('user-id');
    const displayName = $user.data('display-name') || user.text;
    let avatarUrl = avatarCache.get(userId) || createAvatarCanvas(displayName);
    if (!avatarCache.has(userId) && userId && userId !== 'current-user'){
      fetchUserAvatar(userId, displayName).then(real=>{ avatarCache.set(userId, real); $('.select2-user-image').filter(`[data-user-id="${userId}"]`).attr('src', real); $('.select2-selection__rendered .select2-user-image').attr('src', real); }).catch(()=>{});
    }
    return $(
      `<div class="select2-user-selection">
         <img class="select2-user-image" src="${avatarUrl}" alt="${displayName}" style="width:20px;height:20px;border-radius:50%;margin-right:6px;">
         <span>${displayName}</span>
       </div>`
    );
  }
  window.formatUserOption = formatUserOption;
  window.formatUserSelection = formatUserSelection;
})();
