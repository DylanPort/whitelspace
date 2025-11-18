// Whistle AI Documentation App

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Set last updated date
  document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString();
  
  // Handle navigation clicks
  document.querySelectorAll('.nav-section a').forEach(link => {
    link.addEventListener('click', (e) => {
      // Skip external links (those without data-page attribute)
      const page = link.dataset.page;
      if (!page) {
        return; // Let external links work normally
      }
      
      e.preventDefault();
      loadPage(page);
      
      // Update active state
      document.querySelectorAll('.nav-section a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Close mobile menu
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
      }
      
      // Scroll to top
      window.scrollTo(0, 0);
    });
  });
  
  // Mobile menu toggle
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
  });
  
  // Search functionality
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterNavigation(query);
  });
  
  // Load initial page
  const hash = window.location.hash.substr(1) || 'overview';
  const initialLink = document.querySelector(`[data-page="${hash}"]`);
  if (initialLink) {
    initialLink.click();
  } else {
    loadPage('overview');
  }
  
  // Handle back/forward buttons
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.substr(1);
    if (page && content[page]) {
      loadPage(page);
    }
  });
  
  // Navigation buttons
  document.getElementById('prevPage').addEventListener('click', navigatePrev);
  document.getElementById('nextPage').addEventListener('click', navigateNext);
}

function loadPage(pageName) {
  const contentWrapper = document.getElementById('contentWrapper');
  const pageContent = content[pageName];
  
  if (pageContent) {
    contentWrapper.innerHTML = pageContent;
    window.location.hash = pageName;
    
    // Syntax highlighting for code blocks (simple version)
    contentWrapper.querySelectorAll('pre code').forEach(block => {
      highlightCode(block);
    });
  } else {
    contentWrapper.innerHTML = `
      <h1>Page Not Found</h1>
      <p>The requested page could not be found.</p>
      <p><a href="#overview">Return to Overview</a></p>
    `;
  }
}

function filterNavigation(query) {
  const sections = document.querySelectorAll('.nav-section');
  
  if (!query) {
    sections.forEach(section => {
      section.style.display = 'block';
      section.querySelectorAll('li').forEach(li => li.style.display = 'block');
    });
    return;
  }
  
  sections.forEach(section => {
    let hasVisibleItems = false;
    section.querySelectorAll('li').forEach(li => {
      const text = li.textContent.toLowerCase();
      if (text.includes(query)) {
        li.style.display = 'block';
        hasVisibleItems = true;
      } else {
        li.style.display = 'none';
      }
    });
    section.style.display = hasVisibleItems ? 'block' : 'none';
  });
}

function highlightCode(block) {
  let text = block.textContent;
  
  // Simple syntax highlighting
  text = text.replace(/\/\/.*/g, '<span style="color: #6a9955">$&</span>'); // Comments
  text = text.replace(/(['"`]).*?\1/g, '<span style="color: #ce9178">$&</span>'); // Strings
  text = text.replace(/\b(const|let|var|function|async|await|import|export|class|if|else|for|while|return)\b/g, '<span style="color: #569cd6">$&</span>'); // Keywords
  
  block.innerHTML = text;
}

function navigatePrev() {
  // Implement previous page navigation
  const currentHash = window.location.hash.substr(1);
  const allPages = Object.keys(content);
  const currentIndex = allPages.indexOf(currentHash);
  
  if (currentIndex > 0) {
    const prevPage = allPages[currentIndex - 1];
    const link = document.querySelector(`[data-page="${prevPage}"]`);
    if (link) link.click();
  }
}

function navigateNext() {
  // Implement next page navigation
  const currentHash = window.location.hash.substr(1);
  const allPages = Object.keys(content);
  const currentIndex = allPages.indexOf(currentHash);
  
  if (currentIndex < allPages.length - 1) {
    const nextPage = allPages[currentIndex + 1];
    const link = document.querySelector(`[data-page="${nextPage}"]`);
    if (link) link.click();
  }
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  
  if (window.innerWidth <= 768 && 
      sidebar.classList.contains('active') && 
      !sidebar.contains(e.target) && 
      !menuToggle.contains(e.target)) {
    sidebar.classList.remove('active');
  }
});

