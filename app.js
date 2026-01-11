
var startBtn = document.getElementById('start-btn');
var startMenu = document.getElementById('start-menu');
var taskItemsContainer = document.querySelector('.task-items');

// Helper to replace closest()
function getClosest(elem, selector) {
    var first = selector.charAt(0);
    for ( ; elem && elem !== document; elem = elem.parentNode ) {
        if (first === '.') {
            if (elem.classList.contains(selector.substr(1))) return elem;
        } else if (first === '#') {
            if (elem.id === selector.substr(1)) return elem;
        } else {
            if (elem.tagName === selector.toUpperCase()) return elem;
        }
    }
    return null;
}

// Start Menu Toggle
startBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    startMenu.classList.toggle('hidden');
    startBtn.classList.toggle('active');
});

document.addEventListener('click', function(e) {
    // Don't clear active state if clicking on a window, taskbar, icon, or start menu
    if (getClosest(e.target, '.window') || 
        getClosest(e.target, '.taskbar') || 
        getClosest(e.target, '.desktop-icon') || 
        getClosest(e.target, '#start-menu')) {
        return;
    }

    startMenu.classList.add('hidden');
    startBtn.classList.remove('active');
    
    // Deseleccionar iconos
    var icons = document.querySelectorAll('.desktop-icon');
    for (var i = 0; i < icons.length; i++) {
        icons[i].classList.remove('selected');
    }
    
    // Desactivar ventanas (visual)
    var wins = document.querySelectorAll('.window');
    for (var i = 0; i < wins.length; i++) {
        wins[i].classList.remove('active');
    }
});

document.addEventListener('mousedown', function(e) {
    var win = getClosest(e.target, '.window');
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
            btns[i].classList.add('active');
        } else {
            btns[i].classList.remove('active');
        }
    }

    // Activar visualmente la ventana
    var wins = document.querySelectorAll('.window');
    for (var i = 0; i < wins.length; i++) {
        if (wins[i].id === winId) {
            wins[i].classList.add('active');
        } else {
            wins[i].classList.remove('active');
        }
    }
}

// Función para agregar item al taskbar
function addTaskbarItem(winId, title) {
    if (document.querySelector('.task-item[data-win="' + winId + '"]')) return;

    var btn = document.createElement('button');
    btn.className = 'task-item';
    btn.setAttribute('data-win', winId);
    btn.textContent = title;
    
    btn.onclick = function(e) {
        e.stopPropagation();
        var win = document.getElementById(winId);
        
        if (win.classList.contains('hidden')) {
            win.classList.remove('hidden');
            var wins = document.querySelectorAll('.window');
            for (var i = 0; i < wins.length; i++) {
                wins[i].style.zIndex = 10;
            }
            win.style.zIndex = 100;
            setActiveTaskbarItem(winId);
        } else if (parseInt(win.style.zIndex) < 100 || !win.classList.contains('active')) {
            var wins = document.querySelectorAll('.window');
            for (var i = 0; i < wins.length; i++) {
                wins[i].style.zIndex = 10;
            }
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
    var btn = document.querySelector('.task-item[data-win="' + winId + '"]');
    if (btn) btn.parentNode.removeChild(btn);
}

function openWindow(winId) {
    var win = document.getElementById(winId);
    if (!win) return;
    if (win.classList.contains('hidden')) win.classList.remove('hidden');
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
    win.classList.add('hidden');
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
                resizer.onmousedown = function(e) {
                    e.stopPropagation();
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
                };
                win.appendChild(resizer);
            })(dirs[j]);
        }

        titleBar.onmousedown = function(e) {
            if (getClosest(e.target, 'button')) return; // Ignorar clicks en botones
            if (win.getAttribute('data-maximized') === 'true') return; // No arrastrar si maximizado

            e.stopPropagation();
            draggedWindow = win;
            offset.x = e.clientX - win.offsetLeft;
            offset.y = e.clientY - win.offsetTop;
            var wins = document.querySelectorAll('.window');
            for (var k = 0; k < wins.length; k++) {
                wins[k].style.zIndex = 10;
            }
            win.style.zIndex = 100;
            setActiveTaskbarItem(win.id);
        };

        // Botones
        win.querySelector('.min-btn').onclick = function(e) {
            e.stopPropagation();
            win.classList.add('hidden');
            var btn = document.querySelector('.task-item[data-win="' + win.id + '"]');
            if (btn) btn.classList.remove('active');
            win.classList.remove('active');
        };

        var maxBtn = win.querySelector('.max-btn');
        if (maxBtn) {
            maxBtn.onclick = function(e) {
                e.stopPropagation();
                toggleMaximize(win);
            };
        }

        var closeBtn = win.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = function(e) {
                e.stopPropagation();
                closeWindow(win.id);
            };
        }
    })(windowElements[i]);
}

// Mouse Move Global (Arrastrar y Redimensionar)
document.onmousemove = function(e) {
    // Redimensionar
    if (resizingWindow) {
        e.preventDefault();
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
};

document.onmouseup = function() {
    draggedWindow = null;
    resizingWindow = null;
};

// Desktop Icons Logic
var desktopIcons = document.querySelectorAll('.desktop-icon');
for (var i = 0; i < desktopIcons.length; i++) {
    (function(icon) {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            var allIcons = document.querySelectorAll('.desktop-icon');
            for (var j = 0; j < allIcons.length; j++) {
                allIcons[j].classList.remove('selected');
            }
            icon.classList.add('selected');
        });

        icon.addEventListener('dblclick', function(e) {
            e.stopPropagation();
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
        if (!win.classList.contains('hidden')) {
            var title = win.getAttribute('data-title');
            addTaskbarItem(win.id, title);
        }
    }

    var topWindow = null;
    var maxZ = -1;
    for (var i = 0; i < wins.length; i++) {
        var win = wins[i];
        if (!win.classList.contains('hidden')) {
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
    document.getElementById('clock').textContent = hours + ':' + minutes + ' ' + ampm;
}

setInterval(updateClock, 1000);
updateClock();

init();
