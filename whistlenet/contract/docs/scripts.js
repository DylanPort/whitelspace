// ========================================
// WHISTLE NETWORK - DOCS INTERACTIONS
// ========================================

// ===== Particle Background Animation (Mouse Interactive) =====
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animationId;
let mouse = { x: null, y: null, radius: 200 };

function initParticles() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    particles = [];
    
    // Mathematical grid layout
    const spacing = 80; // Distance between particles
    const cols = Math.ceil(canvas.width / spacing);
    const rows = Math.ceil(canvas.height / spacing);
    
    // Center the grid
    const offsetX = (canvas.width - (cols - 1) * spacing) / 2;
    const offsetY = (canvas.height - (rows - 1) * spacing) / 2;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const baseX = col * spacing + offsetX;
            const baseY = row * spacing + offsetY;
            
            particles.push({
                x: baseX,
                y: baseY,
                baseX: baseX,
                baseY: baseY,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                radius: Math.random() * 1.5 + 0.8,
                opacity: Math.random() * 0.15 + 0.15,
                density: (Math.random() * 20) + 10
            });
        }
    }
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
        // Mouse interaction - particles move toward mouse
        if (mouse.x != null && mouse.y != null) {
            const dx = mouse.x - particle.x;
            const dy = mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const maxDistance = mouse.radius;
            const force = (maxDistance - distance) / maxDistance;
            const directionX = forceDirectionX * force * particle.density;
            const directionY = forceDirectionY * force * particle.density;
            
            if (distance < mouse.radius) {
                particle.x -= directionX;
                particle.y -= directionY;
            } else {
                // Return to base position (faster for organized grid)
                const dx = particle.x - particle.baseX;
                const dy = particle.y - particle.baseY;
                particle.x -= dx / 10;
                particle.y -= dy / 10;
            }
        } else {
            // Gentle drift around base position
            particle.x += particle.vx * 0.3;
            particle.y += particle.vy * 0.3;
            
            // Return to base if drifting too far
            const dx = particle.x - particle.baseX;
            const dy = particle.y - particle.baseY;
            const distanceFromBase = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceFromBase > 5) {
                particle.x -= dx / 30;
                particle.y -= dy / 30;
            }
        }
        
        // Draw particle - SUBTLE GREEN
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 0, ${particle.opacity})`;
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgba(0, 255, 0, 0.15)';
        ctx.fill();
        ctx.shadowBlur = 0;
    });
    
    // Draw connections - SUBTLE GREEN
    particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Connect to immediate neighbors (very subtle)
            if (distance < 120) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(0, 255, 0, ${0.08 * (1 - distance / 120)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        });
        
        // Connect to mouse (subtle interaction)
        if (mouse.x != null && mouse.y != null) {
            const dx = mouse.x - p1.x;
            const dy = mouse.y - p1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mouse.radius) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = `rgba(0, 255, 0, ${0.15 * (1 - distance / mouse.radius)})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    });
    
    animationId = requestAnimationFrame(drawParticles);
}

// Track mouse position
window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

// Reset mouse when leaving window
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

// Initialize particles on load
if (canvas) {
    initParticles();
    drawParticles();
    
    // Reinitialize on resize
    window.addEventListener('resize', () => {
        cancelAnimationFrame(animationId);
        initParticles();
        drawParticles();
    });
}

// ===== Navigation Scroll Effect =====
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.background = 'rgba(10, 10, 15, 0.95)';
        navbar.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.background = 'rgba(10, 10, 15, 0.8)';
        navbar.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

// ===== Active Navigation Link =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Skip if href is just "#"
        if (href === '#') return;
        
        e.preventDefault();
        
        const target = document.querySelector(href);
        if (target) {
            const offsetTop = target.offsetTop - 100;
            
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Tab Switching =====
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        // Remove active class from all tabs and buttons
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        btn.classList.add('active');
        const targetContent = document.getElementById(`tab-${targetTab}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    });
});

// ===== Copy Code Buttons =====
const copyButtons = document.querySelectorAll('.copy-btn');

copyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const codeId = btn.getAttribute('data-code');
        const codeElement = document.getElementById(codeId);
        
        if (codeElement) {
            const codeText = codeElement.textContent;
            
            try {
                await navigator.clipboard.writeText(codeText);
                
                // Visual feedback
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = 'rgba(20, 241, 149, 0.2)';
                btn.style.borderColor = '#14F195';
                btn.style.color = '#14F195';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                btn.textContent = 'Error!';
                
                setTimeout(() => {
                    btn.textContent = 'Copy';
                }, 2000);
            }
        }
    });
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe animated elements
const animatedElements = document.querySelectorAll('.feature-card, .stat-card, .sdk-card, .example-card, .resource-card, .api-category');

animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ===== Stats Counter Animation =====
const statValues = document.querySelectorAll('.stat-value');

const animateCounter = (element) => {
    const target = element.textContent;
    const isNumber = /^\d+$/.test(target.replace(/[+k-]/g, ''));
    
    if (!isNumber) return;
    
    const value = parseInt(target.replace(/[+k-]/g, ''));
    const duration = 2000;
    const increment = value / (duration / 16);
    let current = 0;
    
    const counter = setInterval(() => {
        current += increment;
        if (current >= value) {
            element.textContent = target;
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(current) + (target.includes('k') ? 'k' : '');
        }
    }, 16);
};

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
            animateCounter(entry.target);
            entry.target.dataset.counted = 'true';
        }
    });
}, { threshold: 0.5 });

statValues.forEach(stat => {
    statsObserver.observe(stat);
});

// ===== Code Syntax Highlighting (Basic) =====
function highlightCode() {
    const codeBlocks = document.querySelectorAll('.code-block code');
    
    codeBlocks.forEach(block => {
        let html = block.innerHTML;
        
        // Comments
        html = html.replace(/(\/\/.*$)/gm, '<span style="color: #6c7086;">$1</span>');
        html = html.replace(/(#.*$)/gm, '<span style="color: #6c7086;">$1</span>');
        
        // Strings
        html = html.replace(/(['"`].*?['"`])/g, '<span style="color: #14F195;">$1</span>');
        
        // Keywords
        const keywords = ['const', 'let', 'var', 'function', 'async', 'await', 'import', 'export', 'from', 'return', 'if', 'else', 'for', 'while', 'class', 'new'];
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            html = html.replace(regex, `<span style="color: #b36fff;">${keyword}</span>`);
        });
        
        // Numbers
        html = html.replace(/\b(\d+)\b/g, '<span style="color: #fab387;">$1</span>');
        
        block.innerHTML = html;
    });
}

// Run syntax highlighting after DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightCode);
} else {
    highlightCode();
}

// ===== Mobile Menu Toggle (if needed) =====
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinksContainer = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
    });
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search (if search exists)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.focus();
    }
    
    // ESC to close modals or clear focus
    if (e.key === 'Escape') {
        document.activeElement.blur();
    }
});

// ===== Performance: Lazy Load Images =====
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===== Prevent Layout Shift =====
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// ===== Console Easter Egg - HACKER STYLE =====
console.log('%c⚡ WHISTLE NETWORK', 'font-size: 24px; font-weight: bold; color: #00ff00; text-shadow: 0 0 10px rgba(0,255,0,0.5); font-family: monospace;');
console.log('%c> Building decentralized data infrastructure for Solana', 'font-size: 14px; color: #cccccc; font-family: monospace;');
console.log('%c> Join us: https://whistle.ninja', 'font-size: 12px; color: #00ff00; font-family: monospace;');
console.log('%c> Interested in contributing? Check out our GitHub:', 'font-size: 12px; color: #888888; font-family: monospace;');
console.log('%c> https://github.com/DylanPort/whitelspace', 'font-size: 12px; color: #00ff00; font-family: monospace;');

// ===== Export for potential imports =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initParticles,
        highlightCode
    };
}

