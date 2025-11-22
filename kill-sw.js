// KILL SWITCH - Unregister all service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('🔥 Unregistered service worker:', registration.scope);
    }
  });
  
  // Clear all caches
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
      console.log('🗑️ Deleted cache:', name);
    }
  });
  
  // Clear localStorage
  localStorage.removeItem('app-version');
  
  console.log('✅ Service workers killed - reloading in 2 seconds...');
  setTimeout(() => {
    window.location.reload(true);
  }, 2000);
}

