// Gestionnaire principal de l'interface Grabber
const GrabberUI = {
    // État de l'interface
    state: {
        isFormVisible: false,
        isDragging: false,
    },

    // Éléments DOM
    elements: {
        button: null,
        form: null,
        minimizeBtn: null,
    },

    // Simplification de la gestion des événements
    init() {
        this.injectHTML();
        this.injectFontAwesome();

        // Initialisation des références DOM
        this.elements = {
            button: document.getElementById('grabberButton'),
            form: document.getElementById('grabberForm'),
            minimizeBtn: document.getElementById('minimizeBtn'),
            searchBtn: document.getElementById('searchBtn'),
            input: document.getElementById('grabberInput')
        };

        // Position initiale
        this.elements.button.style.top = '20px';
        this.elements.button.style.left = '20px';
        this.elements.form.style.top = '20px';
        this.elements.form.style.left = '20px';

        // Cacher le formulaire et montrer le bouton par défaut
        this.elements.form.style.setProperty('display', 'none', 'important');
        this.elements.button.style.setProperty('display', 'flex', 'important');

        // Initialiser les événements
        this.setupEventListeners();

        // Vérifier si un compte existe
        this.updateGrabberVisibility();
    },

    injectFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesome = document.createElement('link');
            fontAwesome.rel = 'stylesheet';
            fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
            document.head.appendChild(fontAwesome);
        }
    },

    injectHTML() {
        const container = document.createElement('div');
        container.id = 'grabberContainer';
        container.innerHTML = `
            <div class="grabber-button" id="grabberButton">
                <i class="fas fa-hand-pointer"></i>
            </div>

            <div class="grabber-form" id="grabberForm">
                <div class="grabber-header">
                    <div class="flex items-center">
                        <div class="grabber-title"><h2 style="color: #3B82F6;">Grabbber AI Agents</h2></div>
                    </div>
                    <div class="minimize-btn" id="minimizeBtn"><h3>−</h3></div>
                </div>
                
                <div class="grabber-subtitle"><h3>Download a video by describing it</h3></div>
                
                <input type="text" 
                       class="grabber-input" 
                       id="grabberInput" 
                       placeholder="Ex: MrBeast, Squid Game, over 500M views, YouTube">
                
                <button class="grabber-search-btn" id="searchBtn">
                    🔍 Search
                </button>

                <!-- Loading Steps -->
                <div class="loading-step" id="step0">
                    <span class="step-icon">⏳</span>
                    <span>Enhancing video description...</span>
                </div>
                <div class="loading-step" id="step1">
                    <span class="step-icon">⏳</span>
                    <span>Visiting <span class="website-name">youtube.com</span>...</span>
                </div>
                <div class="loading-step" id="step2">
                    <span class="step-icon">⏳</span>
                    <span>Looking for video...</span>
                </div>
                <div class="loading-step" id="step3">
                    <span class="step-icon">⏳</span>
                    <span>Scraping video URL...</span>
                </div>

                <!-- Result Container -->
                <div class="result-container"></div>
            </div>
        `;
        document.body.appendChild(container);

        this.updateGrabberVisibility();
    },

    syncPosition(sourceElement) {
        const targetElement = sourceElement === this.elements.button ? 
            this.elements.form : this.elements.button;
        
        targetElement.style.top = sourceElement.style.top;
        targetElement.style.left = sourceElement.style.left;

        // S'assurer que les événements sont réattachés après la transition
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Gestionnaire de clic pour le Grabber Button
        this.elements.button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            chrome.storage.local.get('userInfo', (result) => {
                if (!result.userInfo) {
                    alert('Create an account first');
                } else {
                    this.elements.form.style.setProperty('display', 'block', 'important');
                    this.elements.button.style.setProperty('display', 'none', 'important');
                }
            });
        };

        // Gestionnaire de clic pour le minimizer
        this.elements.minimizeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.form.style.setProperty('display', 'none', 'important');
            this.elements.button.style.setProperty('display', 'flex', 'important');
        };

        // Gestionnaire de clic pour le bouton de recherche
        if (this.elements.searchBtn) {
            this.elements.searchBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleSearch();
            };
        }

        // Gestionnaire pour l'input
        if (this.elements.input) {
            this.elements.input.onclick = (e) => e.stopPropagation();
            this.elements.input.onfocus = (e) => e.stopPropagation();
        }

        // Ajouter la fonctionnalité de drag
        this.setupDraggable(this.elements.button);
        this.setupDraggable(this.elements.form, '.grabber-header');
    },

    async handleSearch() {
        const input = document.getElementById('grabberInput');
        const searchText = input.value.trim();
        const searchBtn = document.getElementById('searchBtn');
        const resultContainer = document.querySelector('.result-container');
        const steps = [
            document.getElementById('step0'),
            document.getElementById('step1'),
            document.getElementById('step2'),
            document.getElementById('step3')
        ];

        if (!searchText) {
            this.showNotification('Please enter a description to search.', 'error');
            return;
        }

        // Désactiver le bouton et changer le texte
        searchBtn.disabled = true;
        searchBtn.textContent = 'Searching...';
        
        // Réinitialiser le conteneur de résultats
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';

        // Réinitialiser et cacher tous les steps
        steps.forEach(step => {
            step.style.display = 'none';
            step.querySelector('.step-icon').textContent = '⏳';
        });

        // Fonction pour animer un step
        const animateStep = async (step) => {
            step.style.display = 'flex';
            step.querySelector('.step-icon').textContent = '⏳';
            
            // Attendre 1 seconde avec le sablier
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Changer en ✅ et attendre encore 1 seconde
            step.querySelector('.step-icon').textContent = '✅';
            await new Promise(resolve => setTimeout(resolve, 1000));
        };

        try {
            // Animer chaque step séquentiellement tout en les gardant visibles
            for (let i = 0; i < steps.length; i++) {
                await animateStep(steps[i]);
            }

            // Faire la requête API
            const response = await fetch('http://localhost:5000/process_video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ description: searchText })
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            
            if (data.success) {
                // Créer et afficher le conteneur de résultat
                resultContainer.innerHTML = `
                    <div class="video-info">
                        <button class="delete-btn">&times;</button>
                        <div class="video-thumbnail">
                            <img src="${data.thumbnail}" alt="Video thumbnail">
                        </div>
                        <div class="video-details">
                            <div class="video-title">${data.title}</div>
                            <div class="channel-name">${data.channel}</div>
                            <div class="status-text">
                                Ready to download
                            </div>
                        </div>
                    </div>
                    <button class="download-btn">
                        Download
                    </button>
                `;
                resultContainer.style.display = 'block';

                // Ajouter les gestionnaires d'événements
                const downloadBtn = resultContainer.querySelector('.download-btn');
                const deleteBtn = resultContainer.querySelector('.delete-btn');

                downloadBtn.addEventListener('click', async () => {
                    downloadBtn.disabled = true;
                    downloadBtn.innerHTML = 'Downloading...';

                    try {
                        const downloadResponse = await fetch('http://localhost:5000/download', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ url: data.url })
                        });

                        if (!downloadResponse.ok) {
                            throw new Error('Download failed');
                        }

                        const downloadData = await downloadResponse.json();
                        
                        if (downloadData.success) {
                            // Créer un lien de téléchargement
                            const downloadLink = document.createElement('a');
                            downloadLink.href = `http://localhost:5000/download/${downloadData.filename}`;
                            downloadLink.download = downloadData.filename;
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);

                            // Mettre à jour l'historique dans le stockage local
                            chrome.storage.local.get(['downloadHistory'], (result) => {
                                const history = result.downloadHistory || [];
                                history.unshift({
                                    title: data.title,
                                    thumbnail: data.thumbnail,
                                    date: new Date().toISOString()
                                });
                                chrome.storage.local.set({ downloadHistory: history });
                            });

                            // Mettre à jour le quota
                            chrome.storage.local.get(['dailyQuota'], (result) => {
                                const newQuota = (result.dailyQuota || 0) + 1;
                                chrome.storage.local.set({ dailyQuota: newQuota });
                            });

                            this.showNotification('Download completed!', 'success');
                        } else {
                            throw new Error('Download failed');
                        }
                    } catch (error) {
                        this.showNotification('Download failed: ' + error.message, 'error');
                    } finally {
                        downloadBtn.disabled = false;
                        downloadBtn.innerHTML = 'Download';
                    }
                });

                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        // Réinitialiser le conteneur de résultat
                        resultContainer.style.display = 'none';
                        resultContainer.innerHTML = '';

                        // Réinitialiser les étapes de chargement
                        const steps = [
                            document.getElementById('step0'),
                            document.getElementById('step1'),
                            document.getElementById('step2'),
                            document.getElementById('step3')
                        ];
                        
                        steps.forEach(step => {
                            if (step) {
                                step.style.display = 'none';
                                const icon = step.querySelector('.step-icon');
                                if (icon) {
                                    icon.textContent = '⏳';
                                }
                            }
                        });

                        // Réinitialiser le champ de saisie
                        const input = document.getElementById('grabberInput');
                        if (input) {
                            input.value = '';
                        }

                        // Réinitialiser le bouton de recherche
                        const searchBtn = document.getElementById('searchBtn');
                        if (searchBtn) {
                            searchBtn.disabled = false;
                            searchBtn.textContent = '🔍 Search';
                        }
                    });
                }

            } else {
                throw new Error(data.error || 'No video found');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            // Réinitialiser les icônes des étapes
            steps.forEach(step => {
                const icon = step.querySelector('.step-icon');
                icon.textContent = '⏳';
                step.style.display = 'none';
            });
        } finally {
            // Réactiver le bouton de recherche
            searchBtn.disabled = false;
            searchBtn.textContent = '🔍 Search';
        }
    },

    updateGrabberVisibility() {
        chrome.storage.local.get('userInfo', (result) => {
            if (result.userInfo) {
                // Activer les fonctionnalités si un compte existe
                this.elements.button.classList.remove('grabber-disabled');
                this.elements.button.style.setProperty('display', 'flex', 'important');
            } else {
                // Désactiver les fonctionnalités si aucun compte
                this.elements.button.classList.add('grabber-disabled');
                this.elements.button.style.setProperty('display', 'flex', 'important');
            }
        });
    },

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    },

    setupDraggable(element, dragHandle = null) {
        let offsetX = 0, offsetY = 0;
        let isDragging = false;
        let mouseDownTime = 0;

        const dragStart = (e) => {
            // Si un dragHandle est spécifié et que le clic n'est pas dessus, ne rien faire
            if (dragHandle && !e.target.closest(dragHandle)) {
                return;
            }

            mouseDownTime = Date.now();
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            isDragging = false;

            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        };

        const drag = (e) => {
            isDragging = true;

            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            const newTop = e.clientY - offsetY;
            const newLeft = e.clientX - offsetX;

            element.style.top = `${Math.min(Math.max(0, newTop), maxY)}px`;
            element.style.left = `${Math.min(Math.max(0, newLeft), maxX)}px`;

            // Si on déplace le formulaire, mettre à jour la position du bouton
            if (element === this.elements.form) {
                this.elements.button.style.top = element.style.top;
                this.elements.button.style.left = element.style.left;
            } else if (element === this.elements.button) {
                this.elements.form.style.top = element.style.top;
                this.elements.form.style.left = element.style.left;
            }
        };

        const dragEnd = (e) => {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);

            // Ne déclencher le clic que si c'était un vrai clic (pas de drag)
            if (!isDragging && element === this.elements.button) {
                chrome.storage.local.get('userInfo', (result) => {
                    if (!result.userInfo) {
                        alert('Create an account first');
                    } else {
                        // Synchroniser la position avant d'afficher le formulaire
                        this.elements.form.style.top = this.elements.button.style.top;
                        this.elements.form.style.left = this.elements.button.style.left;
                        this.elements.form.style.setProperty('display', 'block', 'important');
                        this.elements.button.style.setProperty('display', 'none', 'important');
                    }
                });
            }
        };

        if (dragHandle) {
            const handle = element.querySelector(dragHandle);
            if (handle) {
                handle.style.cursor = 'move';
                handle.addEventListener('mousedown', dragStart);
            }
        } else {
            element.addEventListener('mousedown', dragStart);
        }
    },
};

// Démarrage
GrabberUI.init();

// Écoute le message du popup pour rendre le Grabber visible après création de compte
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showGrabber") {
        const grabberButton = document.getElementById('grabberButton');
        if (grabberButton) {
            grabberButton.style.display = 'flex';
        }
    }
});

// Ajout de l'écouteur pour la création de compte
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "accountCreated") {
        // Mettre à jour immédiatement l'état du Grabber
        GrabberUI.elements.button.classList.remove('grabber-disabled');
        GrabberUI.elements.button.style.setProperty('display', 'flex', 'important');
        
        // Synchroniser la position du formulaire avec le bouton
        GrabberUI.elements.form.style.top = GrabberUI.elements.button.style.top;
        GrabberUI.elements.form.style.left = GrabberUI.elements.button.style.left;
    }
});

// Met à jour la visibilité du Grabber dès que le storage change (compte créé ou supprimé)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.userInfo) {
        GrabberUI.updateGrabberVisibility();
    }
});

// Modification du style CSS pour rendre les éléments cliquables
const style = document.createElement('style');
style.innerHTML = `
.grabber-disabled {
    opacity: 0.5 !important;
    background: #d3d3d3 !important;
    pointer-events: auto !important;
    cursor: not-allowed !important;
}

.grabber-form {
    pointer-events: auto !important;
    z-index: 999999 !important;
}

.grabber-form input,
.grabber-form button,
.grabber-form .minimize-btn {
    pointer-events: auto !important;
    cursor: pointer !important;
    z-index: 1000000 !important;
}

.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 4px 12px;
    border-radius: 4px;
    z-index: 1000001;
    font-size: 14px;
    width: 180px;
    height: 40px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.notification.error {
    background-color: #f44336;
    color: white;
}

.notification.success {
    background-color: #4CAF50;
    color: white;
}
`;
document.head.appendChild(style);