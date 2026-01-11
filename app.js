const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');

// Start Menu Toggle
startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('hidden');
    startBtn.classList.toggle('active');
});

document.addEventListener('click', () => {
    startMenu.classList.add('hidden');
    startBtn.classList.remove('active');
});

// Helper para activar botón de taskbar
function setActiveTaskbarItem(winId) {
    document.querySelectorAll('.task-item').forEach(btn => {
        if (btn.getAttribute('data-win') === winId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Inicialización: activar la ventana superior por defecto
function initActiveWindow() {
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

// Lógica de Ventanas
let draggedWindow = null;
let offset = { x: 0, y: 0 };

document.querySelectorAll('.window').forEach(win => {
    const titleBar = win.querySelector('.title-bar');

    // Al hacer click en la ventana (para traer al frente)
    win.onmousedown = () => {
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 1);
        win.style.zIndex = 10;
        setActiveTaskbarItem(win.id);
    };

    titleBar.onmousedown = (e) => {
        // Evita que el evento se propague al win.onmousedown (que haría lo mismo, pero para ser explícitos)
        e.stopPropagation(); 
        
        draggedWindow = win;
        offset.x = e.clientX - win.offsetLeft;
        offset.y = e.clientY - win.offsetTop;
        
        // Traer al frente
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 1);
        win.style.zIndex = 10;
        setActiveTaskbarItem(win.id);
    };

    // Minimizar
    win.querySelector('.min-btn').onclick = (e) => {
        e.stopPropagation();
        win.classList.add('hidden');
        
        // Quitar estado activo del botón correspondiente
        const btn = document.querySelector(`.task-item[data-win="${win.id}"]`);
        if (btn) btn.classList.remove('active');
    };
});

document.onmousemove = (e) => {
    if (!draggedWindow) return;
    draggedWindow.style.left = (e.clientX - offset.x) + 'px';
    draggedWindow.style.top = (e.clientY - offset.y) + 'px';
};

document.onmouseup = () => {
    draggedWindow = null;
};

// Botones de la Taskbar
document.querySelectorAll('.task-item').forEach(item => {
    item.onclick = (e) => {
        e.stopPropagation(); // Evitar cerrar menú inicio si es el caso, pero principalmente buena práctica
        const winId = item.getAttribute('data-win');
        const win = document.getElementById(winId);
        
        // Si está minimizada -> mostrar y activar
        if (win.classList.contains('hidden')) {
            win.classList.remove('hidden');
            document.querySelectorAll('.window').forEach(w => w.style.zIndex = 1);
            win.style.zIndex = 10;
            setActiveTaskbarItem(winId);
        } 
        // Si está visible pero no activa (z-index bajo) -> traer al frente
        else if (win.style.zIndex < 10) {
            document.querySelectorAll('.window').forEach(w => w.style.zIndex = 1);
            win.style.zIndex = 10;
            setActiveTaskbarItem(winId);
        }
        // Si está visible y activa (al frente) -> minimizar y desactivar
        else {
            win.classList.add('hidden');
            item.classList.remove('active');
        }
    };
});

// Correr inicialización
initActiveWindow();
