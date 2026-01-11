
// Helper functions
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

// Main initialization
function initApp() {
    var startBtn = document.getElementById('start-btn');
    var startMenu = document.getElementById('start-menu');
    var taskItemsContainer = document.querySelector('.task-items');
    var clockEl = document.getElementById('clock');
    var desktop = document.querySelector('.desktop');

    // State
    var draggedWindow = null;
    var resizingWindow = null;
    var resizeDir = '';
    var offset = { x: 0, y: 0 };
    var initialRect = { w: 0, h: 0, x: 0, y: 0 };

    // Clock
    function updateClock() {
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes().toString();
        if (minutes.length < 2) minutes = '0' + minutes;
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        if (clockEl) clockEl.textContent = hours + ':' + minutes + ' ' + ampm;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Start Menu Interaction
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            toggleClass(startMenu, 'hidden');
            toggleClass(startBtn, 'active');
        });
    }

    // Taskbar Management
    function updateTaskbarState(activeWinId) {
        var items = document.querySelectorAll('.task-item');
        for (var i = 0; i < items.length; i++) {
            if (items[i].getAttribute('data-win') === activeWinId) {
                addClass(items[i], 'active');
            } else {
                removeClass(items[i], 'active');
            }
        }
        
        var wins = document.querySelectorAll('.window');
        for (var i = 0; i < wins.length; i++) {
            if (wins[i].id === activeWinId) {
                addClass(wins[i], 'active');
                wins[i].style.zIndex = 100;
            } else {
                removeClass(wins[i], 'active');
                wins[i].style.zIndex = 10;
            }
        }
    }

    function addTaskbarItem(winId, title) {
        if (document.querySelector('.task-item[data-win="' + winId + '"]')) return;

        var btn = document.createElement('button');
        btn.className = 'task-item';
        btn.setAttribute('data-win', winId);
        btn.textContent = title; // Use textContent for plain text
        
        btn.addEventListener('click', function(e) {
            var win = document.getElementById(winId);
            if (!win) return;

            if (hasClass(win, 'hidden')) {
                removeClass(win, 'hidden');
                updateTaskbarState(winId);
            } else if (!hasClass(win, 'active')) {
                updateTaskbarState(winId);
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

    // Window Management
    function setupWindow(win) {
        // Taskbar item
        if (!hasClass(win, 'hidden')) {
            addTaskbarItem(win.id, win.getAttribute('data-title'));
        }

        // Activation on click
        win.addEventListener('mousedown', function(e) {
            // No stopPropagation here to allow resizing/dragging checks
            updateTaskbarState(win.id);
        });

        // Close button
        var closeBtn = win.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                addClass(win, 'hidden');
                removeTaskbarItem(win.id);
            });
        }

        // Minimize button
        var minBtn = win.querySelector('.min-btn');
        if (minBtn) {
            minBtn.addEventListener('click', function(e) {
                addClass(win, 'hidden');
                var btn = document.querySelector('.task-item[data-win="' + win.id + '"]');
                if (btn) removeClass(btn, 'active');
            });
        }

        // Maximize button
        var maxBtn = win.querySelector('.max-btn');
        if (maxBtn) {
            maxBtn.addEventListener('click', function(e) {
                toggleMaximize(win);
            });
        }

        // Title Bar Dragging
        var titleBar = win.querySelector('.title-bar');
        if (titleBar) {
            titleBar.addEventListener('mousedown', function(e) {
                // Ignore buttons - ES5 compatible check
                var target = e.target;
                while (target && target !== titleBar) {
                    if (target.tagName === 'BUTTON') return;
                    target = target.parentNode;
                }
                
                if (win.getAttribute('data-maximized') !== 'true') {
                    e.preventDefault(); // Prevent selection
                    draggedWindow = win;
                    offset.x = e.clientX - win.offsetLeft;
                    offset.y = e.clientY - win.offsetTop;
                    updateTaskbarState(win.id);
                }
            });
        }

        // Resizers
        var dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        for (var i = 0; i < dirs.length; i++) {
            (function(dir) {
                var r = document.createElement('div');
                r.className = 'resizer ' + dir;
                r.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    resizingWindow = win;
                    resizeDir = dir;
                    initialRect = {
                        w: win.offsetWidth,
                        h: win.offsetHeight,
                        x: win.offsetLeft,
                        y: win.offsetTop,
                        mouseX: e.clientX,
                        mouseY: e.clientY
                    };
                    updateTaskbarState(win.id);
                });
                win.appendChild(r);
            })(dirs[i]);
        }
    }

    function toggleMaximize(win) {
        var isMax = win.getAttribute('data-maximized') === 'true';
        if (isMax) {
            win.style.top = win.getAttribute('data-prev-top');
            win.style.left = win.getAttribute('data-prev-left');
            win.style.width = win.getAttribute('data-prev-width');
            win.style.height = win.getAttribute('data-prev-height');
            win.removeAttribute('data-maximized');
        } else {
            win.setAttribute('data-prev-top', win.style.top);
            win.setAttribute('data-prev-left', win.style.left);
            win.setAttribute('data-prev-width', win.style.width);
            win.setAttribute('data-prev-height', win.style.height);
            
            win.style.top = '0';
            win.style.left = '0';
            win.style.width = '250px';
            win.style.height = '222px';
            win.setAttribute('data-maximized', 'true');
        }
    }

    // Initialize all windows
    var windows = document.querySelectorAll('.window');
    for (var i = 0; i < windows.length; i++) {
        setupWindow(windows[i]);
    }

    // Desktop Icons - using single click to open (dblclick may not work in sandbox)
    var icons = document.querySelectorAll('.desktop-icon');
    for (var i = 0; i < icons.length; i++) {
        (function(icon) {
            icon.addEventListener('click', function(e) {
                // Select icon
                for (var j = 0; j < icons.length; j++) removeClass(icons[j], 'selected');
                addClass(icon, 'selected');
                
                // Open associated window
                var winId = icon.getAttribute('data-win');
                var win = document.getElementById(winId);
                if (win) {
                    removeClass(win, 'hidden');
                    if (!document.querySelector('.task-item[data-win="' + winId + '"]')) {
                        addTaskbarItem(winId, win.getAttribute('data-title'));
                    }
                    updateTaskbarState(winId);
                }
            });
        })(icons[i]);
    }

    // Global Interaction Handlers
    document.addEventListener('mousemove', function(e) {
        if (draggedWindow) {
            e.preventDefault();
            draggedWindow.style.left = (e.clientX - offset.x) + 'px';
            draggedWindow.style.top = (e.clientY - offset.y) + 'px';
        } else if (resizingWindow) {
            e.preventDefault();
            var deltaX = e.clientX - initialRect.mouseX;
            var deltaY = e.clientY - initialRect.mouseY;
            
            // Simple resizing (South-East oriented for simplicity, can be expanded)
            if (resizeDir.indexOf('e') !== -1) {
                resizingWindow.style.width = Math.max(100, initialRect.w + deltaX) + 'px';
            }
            if (resizeDir.indexOf('s') !== -1) {
                resizingWindow.style.height = Math.max(50, initialRect.h + deltaY) + 'px';
            }
            // For full implementation we would handle N/W/NE/SW etc here
        }
    });

    document.addEventListener('mouseup', function() {
        draggedWindow = null;
        resizingWindow = null;
    });

    // Background Click
    if (desktop) {
        desktop.addEventListener('click', function(e) {
            if (e.target === desktop) {
                if (!hasClass(startMenu, 'hidden')) addClass(startMenu, 'hidden');
                if (hasClass(startBtn, 'active')) removeClass(startBtn, 'active');
                
                for (var i = 0; i < icons.length; i++) removeClass(icons[i], 'selected');
                for (var i = 0; i < windows.length; i++) removeClass(windows[i], 'active');
            }
        });
    }
}

// Ensure execution
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
