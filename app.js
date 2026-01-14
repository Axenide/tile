const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');
const taskItemsContainer = document.querySelector('.task-items');

// Helper for touch/mouse coordinates
const getClientPos = (e) => {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
};

// Start Menu Toggle
startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('hidden');
    startBtn.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    // Don't clear active state if clicking on a window, taskbar, icon, or start menu
    if (e.target.closest('.window') || 
        e.target.closest('.taskbar') || 
        e.target.closest('.desktop-icon') || 
        e.target.closest('#start-menu')) {
        return;
    }

    startMenu.classList.add('hidden');
    startBtn.classList.remove('active');
    
    // Deseleccionar iconos
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.classList.remove('selected');
    });
    
    // Desactivar ventanas (visual)
    document.querySelectorAll('.window').forEach(win => {
        win.classList.remove('active');
    });
});

const activateWindow = (e) => {
    const win = e.target.closest('.window');
    if (win) {
        // Bring to front and activate
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
        win.style.zIndex = 100;
        setActiveTaskbarItem(win.id);
    }
};

document.addEventListener('mousedown', activateWindow);
document.addEventListener('touchstart', (e) => {
    // We don't prevent default here globally to allow scrolling content inside windows
    activateWindow(e);
}, {passive: true});

// Helper para activar botón de taskbar y ventana
function setActiveTaskbarItem(winId) {
    document.querySelectorAll('.task-item').forEach(btn => {
        if (btn.getAttribute('data-win') === winId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Activar visualmente la ventana
    document.querySelectorAll('.window').forEach(win => {
        if (win.id === winId) {
            win.classList.add('active');
        } else {
            win.classList.remove('active');
        }
    });
}

// Función para agregar item al taskbar
function addTaskbarItem(winId, title) {
    if (document.querySelector(`.task-item[data-win="${winId}"]`)) return;

    const btn = document.createElement('button');
    btn.className = 'task-item';
    btn.setAttribute('data-win', winId);
    btn.textContent = title;
    
    btn.onclick = (e) => {
        e.stopPropagation();
        const win = document.getElementById(winId);
        
        if (win.classList.contains('hidden')) {
            win.classList.remove('hidden');
            document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
            win.style.zIndex = 100;
            setActiveTaskbarItem(winId);
        } else if (parseInt(win.style.zIndex) < 100 || !win.classList.contains('active')) {
            document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
            win.style.zIndex = 100;
            setActiveTaskbarItem(winId);
        } else {
            win.classList.add('hidden');
            btn.classList.remove('active');
            win.classList.remove('active');
        }
    };

    taskItemsContainer.appendChild(btn);
}

function removeTaskbarItem(winId) {
    const btn = document.querySelector(`.task-item[data-win="${winId}"]`);
    if (btn) btn.remove();
}

function openWindow(winId) {
    const win = document.getElementById(winId);
    if (!win) return;
    if (win.classList.contains('hidden')) win.classList.remove('hidden');
    document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
    win.style.zIndex = 100;
    const title = win.getAttribute('data-title') || 'Window';
    addTaskbarItem(winId, title);
    setActiveTaskbarItem(winId);
}

function closeWindow(winId) {
    const win = document.getElementById(winId);
    if (!win) return;
    win.classList.add('hidden');
    removeTaskbarItem(winId);
}

// Maximize Logic
function toggleMaximize(win) {
    if (win.getAttribute('data-maximized') === 'true') {
        // Restore
        const prevStyle = JSON.parse(win.getAttribute('data-prev-style'));
        win.style.top = prevStyle.top;
        win.style.left = prevStyle.left;
        win.style.width = prevStyle.width;
        win.style.height = prevStyle.height;
        win.removeAttribute('data-maximized');
    } else {
        // Maximize
        win.setAttribute('data-prev-style', JSON.stringify({
            top: win.style.top,
            left: win.style.left,
            width: win.style.width || '',
            height: win.style.height || ''
        }));
        win.style.top = '0';
        win.style.left = '0';
        win.style.width = '100%';
        win.style.height = 'calc(100% - 22px)'; // Minus taskbar
        win.setAttribute('data-maximized', 'true');
    }
}

// Ventanas Inicialización (Resizers y Eventos)
let draggedWindow = null;
let resizingWindow = null;
let resizeDir = '';
let offset = { x: 0, y: 0 };
let initialRect = {};

function handleResizeStart(e, win, dir) {
    e.stopPropagation();
    resizingWindow = win;
    resizeDir = dir;
    initialRect = win.getBoundingClientRect();
    const pos = getClientPos(e);
    offset.x = pos.x;
    offset.y = pos.y;
    document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
    win.style.zIndex = 100;
    setActiveTaskbarItem(win.id);
}

function handleDragStart(e, win) {
    if (e.target.closest('button')) return; // Ignorar clicks en botones

    if (e.type === 'touchstart') {
        e.preventDefault();
    }

    if (win.getAttribute('data-maximized') === 'true') return; // No arrastrar si maximizado
    
    e.stopPropagation();
    draggedWindow = win;
    const pos = getClientPos(e);
    offset.x = pos.x - win.offsetLeft;
    offset.y = pos.y - win.offsetTop;
    document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
    win.style.zIndex = 100;
    setActiveTaskbarItem(win.id);
}

document.querySelectorAll('.window').forEach(win => {
    const titleBar = win.querySelector('.title-bar');
    
    // Inyectar resizers
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(dir => {
        const resizer = document.createElement('div');
        resizer.className = `resizer ${dir}`;
        
        resizer.addEventListener('mousedown', (e) => handleResizeStart(e, win, dir));
        resizer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleResizeStart(e, win, dir);
        }, {passive: false});

        win.appendChild(resizer);
    });

    // Eventos de ventana (Title Bar Drag)
    titleBar.addEventListener('mousedown', (e) => handleDragStart(e, win));
    titleBar.addEventListener('touchstart', (e) => {
        handleDragStart(e, win);
    }, {passive: false});

    // Botones
    win.querySelector('.min-btn').onclick = (e) => {
        e.stopPropagation();
        win.classList.add('hidden');
        const btn = document.querySelector(`.task-item[data-win="${win.id}"]`);
        if (btn) btn.classList.remove('active');
        win.classList.remove('active');
    };

    const maxBtn = win.querySelector('.max-btn');
    if (maxBtn) {
        maxBtn.onclick = (e) => {
            e.stopPropagation();
            toggleMaximize(win);
        };
    }

    const closeBtn = win.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closeWindow(win.id);
        };
    }
});

// Mouse/Touch Move Global (Arrastrar y Redimensionar)
const handleMove = (e) => {
    // Redimensionar
    if (resizingWindow) {
        e.preventDefault();
        const pos = getClientPos(e);
        const deltaX = pos.x - offset.x;
        const deltaY = pos.y - offset.y;
        
        const minW = 100;
        const minH = 50;

        let newW = initialRect.width;
        let newH = initialRect.height;
        let newX = initialRect.left;
        let newY = initialRect.top;

        if (resizeDir.includes('e')) newW = Math.max(minW, initialRect.width + deltaX);
        if (resizeDir.includes('s')) newH = Math.max(minH, initialRect.height + deltaY);
        
        if (resizeDir.includes('w')) {
            const w = Math.max(minW, initialRect.width - deltaX);
            newX += (initialRect.width - w);
            newW = w;
        }
        if (resizeDir.includes('n')) {
            const h = Math.max(minH, initialRect.height - deltaY);
            newY += (initialRect.height - h);
            newH = h;
        }

        resizingWindow.style.width = newW + 'px';
        resizingWindow.style.height = newH + 'px';
        resizingWindow.style.left = newX + 'px';
        resizingWindow.style.top = newY + 'px';
        return;
    }

    // Arrastrar
    if (draggedWindow) {
        e.preventDefault();
        const pos = getClientPos(e);
        draggedWindow.style.left = (pos.x - offset.x) + 'px';
        draggedWindow.style.top = (pos.y - offset.y) + 'px';
    }
};

document.addEventListener('mousemove', handleMove);
document.addEventListener('touchmove', handleMove, {passive: false});

const handleEnd = () => {
    draggedWindow = null;
    resizingWindow = null;
};

document.addEventListener('mouseup', handleEnd);
document.addEventListener('touchend', handleEnd);

// Desktop Icons Logic
document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
    });

    icon.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const winId = icon.getAttribute('data-win');
        if (winId) openWindow(winId);
    });
});

// Init
function init() {
    document.querySelectorAll('.window').forEach(win => {
        if (!win.classList.contains('hidden')) {
            const title = win.getAttribute('data-title');
            addTaskbarItem(win.id, title);
        }
    });

    let topWindow = null;
    let maxZ = -1;
    document.querySelectorAll('.window').forEach(win => {
        if (!win.classList.contains('hidden')) {
            const z = parseInt(win.style.zIndex || 0);
            if (z > maxZ) {
                maxZ = z;
                topWindow = win;
            }
        }
    });
    if (topWindow) {
        setActiveTaskbarItem(topWindow.id);
    }
}

// Clock
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    document.getElementById('clock').textContent = `${hours}:${minutes} ${ampm}`;
}

setInterval(updateClock, 1000);
updateClock();

init();
