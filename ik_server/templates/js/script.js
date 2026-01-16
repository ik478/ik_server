'use strict';

// Time update function
function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    document.getElementById('discTime').textContent = hours + ':' + minutes;
    document.getElementById('discDate').textContent = month + '/' + day;
}

updateTime();
setInterval(updateTime, 1000);

// Radial Menu Implementation
var DEFAULT_SIZE = 100;
var MIN_SECTORS = 6;

function RadialMenu(params) {
    var self = this;
    self.parent = params.parent || document.body;
    self.size = params.size || DEFAULT_SIZE;
    self.onClick = params.onClick || null;
    self.menuItems = params.menuItems || [];
    
    self.radius = 50;
    self.innerRadius = self.radius * 0.55;
    self.sectorCount = Math.max(self.menuItems.length, MIN_SECTORS);
    self.closeOnClick = params.closeOnClick !== undefined ? !!params.closeOnClick : false;
    
    self.scale = 1;
    self.holder = null;
    self.parentMenu = [];
    self.parentItems = [];
    self.levelItems = null;
    self.currentMenu = null;
    
    self.isDragging = false;
    self.currentRotation = 0;
    self.lastAngle = 0;
    self.selectedIndex = 0;
    
    self.createHolder();
    
    document.addEventListener('wheel', self.onMouseWheel.bind(self));
    document.addEventListener('keydown', self.onKeyDown.bind(self));
}

RadialMenu.prototype.open = function () {
    var self = this;
    if (!self.currentMenu) {
        self.currentMenu = self.createMenu('menu inner', self.menuItems);
        self.holder.appendChild(self.currentMenu);
        
        RadialMenu.nextTick(function () {
            self.currentMenu.setAttribute('class', 'menu');
        });
    }
};

RadialMenu.prototype.close = function () {
    var self = this;
    if (self.currentMenu) {
        var parentMenu;
        while (parentMenu = self.parentMenu.pop()) {
            parentMenu.remove();
        }
        self.parentItems = [];
        
        RadialMenu.setClassAndWaitForTransition(self.currentMenu, 'menu inner').then(function () {
            self.currentMenu.remove();
            self.currentMenu = null;
        });
    }
};

RadialMenu.prototype.getParentMenu = function () {
    var self = this;
    return self.parentMenu.length > 0 ? self.parentMenu[self.parentMenu.length - 1] : null;
};

RadialMenu.prototype.createHolder = function () {
    var self = this;
    self.holder = document.createElement('div');
    self.holder.className = 'menuHolder';
    self.holder.style.width = self.size + 'px';
    self.holder.style.height = self.size + 'px';
    self.parent.appendChild(self.holder);
};

RadialMenu.prototype.showNestedMenu = function (item) {
    var self = this;
    self.parentMenu.push(self.currentMenu);
    self.parentItems.push(self.levelItems);
    self.currentMenu = self.createMenu('menu inner', item.items, true);
    self.holder.appendChild(self.currentMenu);
    
    RadialMenu.nextTick(function () {
        self.getParentMenu().setAttribute('class', 'menu outer');
        self.currentMenu.setAttribute('class', 'menu');
    });
};

RadialMenu.prototype.returnToParentMenu = function () {
    var self = this;
    self.getParentMenu().setAttribute('class', 'menu');
    RadialMenu.setClassAndWaitForTransition(self.currentMenu, 'menu inner').then(function () {
        self.currentMenu.remove();
        self.currentMenu = self.parentMenu.pop();
        self.levelItems = self.parentItems.pop();
    });
};

RadialMenu.prototype.handleClick = function () {
    var self = this;
    var selectedIndex = self.selectedIndex;
    if (selectedIndex >= 0 && selectedIndex < self.levelItems.length) {
        var item = self.levelItems[selectedIndex];
        if (item.items) {
            self.showNestedMenu(item);
        } else {
            if (self.onClick) {
                self.onClick(item);
                if (self.closeOnClick) {
                    self.close();
                }
            }
        }
    }
};

RadialMenu.prototype.handleCenterClick = function () {
    var self = this;
    if (self.parentItems.length > 0) {
        self.returnToParentMenu();
    } else {
        self.close();
    }
};

RadialMenu.prototype.createMenu = function (classValue, levelItems, nested) {
    var self = this;
    self.levelItems = levelItems;
    self.sectorCount = Math.max(self.levelItems.length, MIN_SECTORS);
    
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', classValue);
    svg.setAttribute('viewBox', '-50 -50 100 100');
    svg.setAttribute('width', self.size);
    svg.setAttribute('height', self.size);
    
    // Create single ring structure
    self.createSingleRing(svg);
    
    // Create text labels for each item
    var angleStep = 360 / self.sectorCount;
    var angleShift = angleStep / 2 + 270;
    
    for (var i = 0; i < self.levelItems.length; i++) {
        var angle = angleShift + angleStep * i;
        var item = self.levelItems[i];
        var centerPoint = RadialMenu.getDegreePos(angle, self.innerRadius + (self.radius - self.innerRadius) / 2);
        
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('data-index', i);
        g.setAttribute('data-id', item.id);
        g.setAttribute('class', i === 0 ? 'text-label selected' : 'text-label');
        
        var text = self.createText(centerPoint.x, centerPoint.y, item.title);
        g.appendChild(text);
        svg.appendChild(g);
    }
    
    self.setupSVGEvents(svg);
    return svg;
};

RadialMenu.prototype.createSingleRing = function (svg) {
    var self = this;
    
    // Create complete ring path
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ring-structure');
    
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Create ring using two circles
    var outerCircle = 'M 0,' + (-self.radius) + ' A ' + self.radius + ',' + self.radius + ' 0 1,1 0,' + self.radius + ' A ' + self.radius + ',' + self.radius + ' 0 1,1 0,' + (-self.radius);
    var innerCircle = 'M 0,' + (-self.innerRadius) + ' A ' + self.innerRadius + ',' + self.innerRadius + ' 0 1,0 0,' + self.innerRadius + ' A ' + self.innerRadius + ',' + self.innerRadius + ' 0 1,0 0,' + (-self.innerRadius);
    
    path.setAttribute('d', outerCircle + ' ' + innerCircle);
    path.setAttribute('fill-rule', 'evenodd');
    
    g.appendChild(path);
    svg.appendChild(g);
    
    // Add divider lines between sections
    var angleStep = 360 / self.sectorCount;
    for (var i = 0; i < self.sectorCount; i++) {
        var angle = angleStep * i;
        var innerPoint = RadialMenu.getDegreePos(angle, self.innerRadius);
        var outerPoint = RadialMenu.getDegreePos(angle, self.radius);
        
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', RadialMenu.numberToString(innerPoint.x));
        line.setAttribute('y1', RadialMenu.numberToString(innerPoint.y));
        line.setAttribute('x2', RadialMenu.numberToString(outerPoint.x));
        line.setAttribute('y2', RadialMenu.numberToString(outerPoint.y));
        line.setAttribute('class', 'divider');
        g.appendChild(line);
    }
};

RadialMenu.prototype.setupSVGEvents = function (svg) {
    var self = this;
    
    svg.addEventListener('mousedown', function (e) {
        var target = e.target;
        if (target.tagName === 'text' || target.parentNode.classList.contains('text-label')) {
            var labelNode = target.tagName === 'text' ? target.parentNode : target;
            var index = parseInt(labelNode.getAttribute('data-index'));
            if (!isNaN(index)) {
                self.setSelectedIndex(index);
            }
        } else {
            self.isDragging = true;
            self.lastAngle = self.getAngle(e, svg);
            e.preventDefault();
        }
    });
    
    svg.addEventListener('click', function (e) {
        if (self.isDragging) return;
        var target = e.target;
        if (target.tagName === 'text' || target.parentNode.classList.contains('text-label')) {
            self.handleClick();
        }
    });
    
    document.addEventListener('mousemove', function (e) {
        if (!self.isDragging) return;
        var currentAngle = self.getAngle(e, svg);
        var deltaAngle = currentAngle - self.lastAngle;
        self.currentRotation += deltaAngle;
        svg.style.transform = 'rotate(' + self.currentRotation + 'deg)';
        self.lastAngle = currentAngle;
    });
    
    document.addEventListener('mouseup', function () {
        self.isDragging = false;
    });
};

RadialMenu.prototype.getAngle = function (e, element) {
    var rect = element.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    var x = e.clientX - centerX;
    var y = e.clientY - centerY;
    return Math.atan2(y, x) * (180 / Math.PI);
};

RadialMenu.prototype.selectDelta = function (indexDelta) {
    var self = this;
    self.selectedIndex += indexDelta;
    
    if (self.selectedIndex < 0) {
        self.selectedIndex = self.levelItems.length - 1;
    } else if (self.selectedIndex >= self.levelItems.length) {
        self.selectedIndex = 0;
    }
    self.updateSelection();
};

RadialMenu.prototype.setSelectedIndex = function (index) {
    var self = this;
    if (index >= 0 && index < self.levelItems.length) {
        self.selectedIndex = index;
        self.updateSelection();
    }
};

RadialMenu.prototype.updateSelection = function () {
    var self = this;
    var labels = self.currentMenu.querySelectorAll('.text-label');
    labels.forEach(function (label) {
        var index = parseInt(label.getAttribute('data-index'));
        if (index === self.selectedIndex) {
            label.setAttribute('class', 'text-label selected');
        } else {
            label.setAttribute('class', 'text-label');
        }
    });
};

RadialMenu.prototype.onKeyDown = function (e) {
    var self = this;
    if (self.currentMenu) {
        switch (e.key) {
            case 'Escape':
            case 'Backspace':
                self.handleCenterClick();
                e.preventDefault();
                break;
            case 'Enter':
                self.handleClick();
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                self.selectDelta(1);
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                self.selectDelta(-1);
                e.preventDefault();
                break;
        }
    }
};

RadialMenu.prototype.onMouseWheel = function (e) {
    var self = this;
    if (self.currentMenu) {
        var delta = -e.deltaY;
        self.selectDelta(delta > 0 ? 1 : -1);
    }
};

RadialMenu.prototype.createText = function (x, y, title) {
    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('x', RadialMenu.numberToString(x));
    text.setAttribute('y', RadialMenu.numberToString(y));
    text.setAttribute('font-size', '22%');
    text.setAttribute('font-weight', 'bold');
    text.innerHTML = title;
    return text;
};

RadialMenu.getDegreePos = function (angleDeg, length) {
    return {
        x: Math.sin(RadialMenu.degToRad(angleDeg)) * length,
        y: Math.cos(RadialMenu.degToRad(angleDeg)) * length
    };
};

RadialMenu.numberToString = function (n) {
    if (Number.isInteger(n)) {
        return n.toString();
    } else if (n) {
        var r = (+n).toFixed(5);
        if (r.match(/\./)) {
            r = r.replace(/\.?0+$/, '');
        }
        return r;
    }
};

RadialMenu.degToRad = function (deg) {
    return deg * (Math.PI / 180);
};

RadialMenu.setClassAndWaitForTransition = function (node, newClass) {
    return new Promise(function (resolve) {
        function handler(e) {
            if (e.target == node && e.propertyName == 'visibility') {
                node.removeEventListener('transitionend', handler);
                resolve();
            }
        }
        node.addEventListener('transitionend', handler);
        node.setAttribute('class', newClass);
    });
};

RadialMenu.nextTick = function (fn) {
    setTimeout(fn, 10);
};

// Initialize menu items
var menuItems = [
    {id: 'home', title: 'HOME'},
    {id: 'about', title: 'ABOUT'},
    {id: 'services', title: 'SERVICES'},
    {id: 'portfolio', title: 'PORTFOLIO'},
    {id: 'blog', title: 'BLOG'},
    {id: 'contact', title: 'CONTACT'}
];

// Create radial menu instance
var discMenuContainer = document.getElementById('discMenu');
var svgMenu = new RadialMenu({
    parent: discMenuContainer,
    size: 300,
    closeOnClick: true,
    menuItems: menuItems,
    onClick: function (item) {
        console.log('Selected:', item.id, item.title);
        // You can add navigation logic here
        // For example: location.href = item.id + '.html';
    }
});

// Toggle menu on disc click
var mainDisc = document.getElementById('mainDisc');
var isMenuOpen = false;

mainDisc.addEventListener('click', function() {
    if (isMenuOpen) {
        svgMenu.close();
        mainDisc.classList.remove('active');
    } else {
        svgMenu.open();
        mainDisc.classList.add('active');
    }
    isMenuOpen = !isMenuOpen;
});