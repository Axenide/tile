
// --- Helper Functions for Sandboxed Environment ---

// Polyfill for classList operations using className
function hasClass(el, className) {
    if (!el) return false;
    return (' ' + el.className + ' ').indexOf(' ' + className + ' ') > -1;
}

function addClass(el, className) {
    if (!el) return;
    if (!hasClass(el, className)) {
        el.className = (el.className + ' ' + className).trim();
    }
}

function removeClass(el, className) {
    if (!el) return;
    var newClass = (' ' + el.className + ' ').replace(' ' + className + ' ', ' ');
    el.className = newClass.trim();
}

function toggleClass(el, className) {
    if (hasClass(el, className)) {
        removeClass(el, className);
    } else {
        addClass(el, className);
    }
}

// Helper to replace closest()
function getClosest(elem, selector) {
    var first = selector.charAt(0);
    for ( ; elem && elem !== document; elem = elem.parentNode ) {
        // If selector is class
        if (first === '.') {
            if (hasClass(elem, selector.substr(1))) return elem;
        } 
        // If selector is id
        else if (first === '#') {
            if (elem.id === selector.substr(1)) return elem;
        } 
        // If selector is tag
        else {
            if (elem.tagName === selector.toUpperCase()) return elem;
        }
    }
    return null;
}

// --- Main Application Logic ---

var startBtn = document.getElementById('start-btn');
var startMenu = document.getElementById('start-menu');
var taskItemsContainer = document.querySelector('.task-items');

// Start Menu Toggle
if (startBtn) {
    startBtn.addEventListener('click', function(e) {
        if (e.stopPropagation) e.stopPropagation();
        toggleClass(startMenu, 'hidden');
        toggleClass(startBtn, 'active');
    });
}

document.addEventListener('click', function(e) {
    var target = e.target || e.srcElement;
    // Don't clear active state if clicking on a window, taskbar, icon, or start menu
    if (getClosest(target, '.window') || 
        getClosest(target, '.taskbar') || 
        getClosest(target, '.desktop-icon') || 
        getClosest(target, '#start-menu')) {
        return;
    }

    if (startMenu) addClass(startMenu, 'hidden');
    if (startBtn) removeClass(startBtn, 'active');
    
    // Deseleccionar iconos
    var icons = document.querySelectorAll('.desktop-icon');
    for (var i = 0; i < icons.length; i++) {
        removeClass(icons[i], 'selected');
    }
    
    // Desactivar ventanas (visual)
    var wins = document.querySelectorAll('.window');
    for (var i = 0; i < wins.length; i++) {
        removeClass(wins[i], 'active');
    }
});

document.addEventListener('mousedown', function(e) {
    var target = e.target || e.srcElement;
    var win = getClosest(target, '.window');
    if (win) {
        // Bring to front and activate
        var wins = document.querySelectorAll('.window');
        for (var i = 0; i < wins.length; i++) {
            wins[i].style.zIndex = 10;
        }
        win.style.zIndex = 100;
        setActiveTaskbarItem(win.id);
    }
});

// Helper para activar botón de taskbar y ventana
function setActiveTaskbarItem(winId) {
    var btns = document.querySelectorAll('.task-item');
    for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute('data-win') === winId) {
            addClass(btns[i], 'active');
        } else {
            removeClass(btns[i], 'active');
        }
    }

    // Activar visualmente la ventana
    var wins = document.querySelectorAll('.window');
    for (var i = 0; i < wins.length; i++) {
        if (wins[i].id === winId) {
            addClass(wins[i], 'active');
        } else {
            removeClass(wins[i], 'active');
        }
    }
}

// Función para agregar item al taskbar
function addTaskbarItem(winId, title) {
    if (document.querySelector('.task-item[data-win="' + winId + '"]')) return;

    var btn = document.createElement('button');
    btn.className = 'task-item';
    btn.setAttribute('data-win', winId);
    // Use createTextNode for safety against HTML injection
    btn.appendChild(document.createTextNode(title));
    
    btn.addEventListener('click', function(e) {
        if (e.stopPropagation) e.stopPropagation();
        var win = document.getElementById(winId);
        
        if (hasClass(win, 'hidden')) {
            removeClass(win, 'hidden');
            var wins = document.querySelectorAll('.window');
            for (var i = 0; i < wins.length; i++) {
                wins[i].style.zIndex = 10;
            }
            win.style.zIndex = 100;
            setActiveTaskbarItem(winId);
        } else if (parseInt(win.style.zIndex) < 100 || !hasClass(win, 'active')) {
            var wins = document.querySelectorAll('.window');
            for (var i = 0; i < wins.length; i++) {
                wins[i].style.zIndex = 10;
            }
            win.style.zIndex = 100;
            setActiveTaskbarItem(winId);
        } else {
            addClass(win, 'hidden');
            removeClass(btn, 'active');
            removeClass(win, 'active');
        }
    });

    if (taskItemsContainer) taskItemsContainer.appendChild(btn);
}

function removeTaskbarItem(winId) {
    var btn = document.querySelector('.task-item[data-win="' + winId + '"]');
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
}

function openWindow(winId) {
    var win = document.getElementById(winId);
    if (!win) return;
    if (hasClass(win, 'hidden')) removeClass(win, 'hidden');
    var wins = document.querySelectorAll('.window');
    for (var i = 0; i < wins.length; i++) {
        wins[i].style.zIndex = 10;
    }
    win.style.zIndex = 100;
    var title = win.getAttribute('data-title') || 'Window';
    addTaskbarItem(winId, title);
    setActiveTaskbarItem(winId);
}

function closeWindow(winId) {
    var win = document.getElementById(winId);
    if (!win) return;
    addClass(win, 'hidden');
    removeTaskbarItem(winId);
}

// Maximize Logic
function toggleMaximize(win) {
    if (win.getAttribute('data-maximized') === 'true') {
        // Restore
        var prevStyle = JSON.parse(win.getAttribute('data-prev-style'));
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
var draggedWindow = null;
var resizingWindow = null;
var resizeDir = '';
var offset = { x: 0, y: 0 };
var initialRect = {};

var windowElements = document.querySelectorAll('.window');
for (var i = 0; i < windowElements.length; i++) {
    (function(win) {
        var titleBar = win.querySelector('.title-bar');
        
        // Inyectar resizers
        var dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        for (var j = 0; j < dirs.length; j++) {
            (function(dir) {
                var resizer = document.createElement('div');
                resizer.className = 'resizer ' + dir;
                resizer.addEventListener('mousedown', function(e) {
                    if (e.stopPropagation) e.stopPropagation();
                    resizingWindow = win;
                    resizeDir = dir;
                    initialRect = win.getBoundingClientRect();
                    offset.x = e.clientX;
                    offset.y = e.clientY;
                    var wins = document.querySelectorAll('.window');
                    for (var k = 0; k < wins.length; k++) {
                        wins[k].style.zIndex = 10;
                    }
                    win.style.zIndex = 100;
                    setActiveTaskbarItem(win.id);
                });
                win.appendChild(resizer);
            })(dirs[j]);
        }

        if (titleBar) {
            titleBar.addEventListener('mousedown', function(e) {
                var target = e.target || e.srcElement;
                if (getClosest(target, 'button')) return; // Ignorar clicks en botones
                if (win.getAttribute('data-maximized') === 'true') return; // No arrastrar si maximizado

                if (e.stopPropagation) e.stopPropagation();
                draggedWindow = win;
                offset.x = e.clientX - win.offsetLeft;
                offset.y = e.clientY - win.offsetTop;
                var wins = document.querySelectorAll('.window');
                for (var k = 0; k < wins.length; k++) {
                    wins[k].style.zIndex = 10;
                }
                win.style.zIndex = 100;
                setActiveTaskbarItem(win.id);
            });
        }

        // Botones
        var minBtn = win.querySelector('.min-btn');
        if (minBtn) {
            minBtn.addEventListener('click', function(e) {
                if (e.stopPropagation) e.stopPropagation();
                addClass(win, 'hidden');
                var btn = document.querySelector('.task-item[data-win="' + win.id + '"]');
                if (btn) removeClass(btn, 'active');
                removeClass(win, 'active');
            });
        }

        var maxBtn = win.querySelector('.max-btn');
        if (maxBtn) {
            maxBtn.addEventListener('click', function(e) {
                if (e.stopPropagation) e.stopPropagation();
                toggleMaximize(win);
            });
        }

        var closeBtn = win.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                if (e.stopPropagation) e.stopPropagation();
                closeWindow(win.id);
            });
        }
    })(windowElements[i]);
}

// Mouse Move Global (Arrastrar y Redimensionar)
document.addEventListener('mousemove', function(e) {
    // Redimensionar
    if (resizingWindow) {
        if (e.preventDefault) e.preventDefault();
        var deltaX = e.clientX - offset.x;
        var deltaY = e.clientY - offset.y;
        
        var minW = 100;
        var minH = 50;

        var newW = initialRect.width;
        var newH = initialRect.height;
        var newX = initialRect.left;
        var newY = initialRect.top;

        if (resizeDir.indexOf('e') !== -1) newW = Math.max(minW, initialRect.width + deltaX);
        if (resizeDir.indexOf('s') !== -1) newH = Math.max(minH, initialRect.height + deltaY);
        
        if (resizeDir.indexOf('w') !== -1) {
            var w = Math.max(minW, initialRect.width - deltaX);
            newX += (initialRect.width - w);
            newW = w;
        }
        if (resizeDir.indexOf('n') !== -1) {
            var h = Math.max(minH, initialRect.height - deltaY);
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
        draggedWindow.style.left = (e.clientX - offset.x) + 'px';
        draggedWindow.style.top = (e.clientY - offset.y) + 'px';
    }
});

document.addEventListener('mouseup', function() {
    draggedWindow = null;
    resizingWindow = null;
});

// Desktop Icons Logic
var desktopIcons = document.querySelectorAll('.desktop-icon');
for (var i = 0; i < desktopIcons.length; i++) {
    (function(icon) {
        icon.addEventListener('click', function(e) {
            if (e.stopPropagation) e.stopPropagation();
            var allIcons = document.querySelectorAll('.desktop-icon');
            for (var j = 0; j < allIcons.length; j++) {
                removeClass(allIcons[j], 'selected');
            }
            addClass(icon, 'selected');
        });

        icon.addEventListener('dblclick', function(e) {
            if (e.stopPropagation) e.stopPropagation();
            var winId = icon.getAttribute('data-win');
            if (winId) openWindow(winId);
        });
    })(desktopIcons[i]);
}

// Init
function init() {
    var wins = document.querySelectorAll('.window');
    for (var i = 0; i < wins.length; i++) {
        var win = wins[i];
        // Check if NOT hidden
        if (!hasClass(win, 'hidden')) {
            var title = win.getAttribute('data-title');
            addTaskbarItem(win.id, title);
        }
    }

    var topWindow = null;
    var maxZ = -1;
    for (var i = 0; i < wins.length; i++) {
        var win = wins[i];
        if (!hasClass(win, 'hidden')) {
            var z = parseInt(win.style.zIndex || 0);
            if (z > maxZ) {
                maxZ = z;
                topWindow = win;
            }
        }
    }
    if (topWindow) {
        setActiveTaskbarItem(topWindow.id);
    }
}

// Clock
function updateClock() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes().toString();
    // Padding logic since padStart is ES2017
    if (minutes.length < 2) minutes = '0' + minutes;
    
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    var clock = document.getElementById('clock');
    if (clock) clock.textContent = hours + ':' + minutes + ' ' + ampm;
}

setInterval(updateClock, 1000);
updateClock();

init();
