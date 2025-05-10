console.log('Popup.js chargé');

let auth;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup.js chargé');

    const modeToggle = document.getElementById('modeToggle');
    const historyBox = document.getElementById('historyBox');
    
    // Charger l'état du toggle
    chrome.storage.local.get(['isAIMode'], function(result) {
        modeToggle.checked = result.isAIMode || false;
    });

    // Gérer le toggle AI
    modeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        
        const ball = document.querySelector('.slider-ball');
        
        // Animation jusqu'au milieu (50% du chemin total)
        ball.style.transform = 'translateX(27px)'; // La moitié de la distance totale
        
        // Retour à la position initiale après 300ms
        setTimeout(() => {
            ball.style.transform = 'translateX(0)';
        }, 300);

        // Afficher le message
        showToggleMessage();
    });

    updateQuotaDisplay();
    loadHistory();
    setupQuotaRefresh();

    // Configuration Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyAi4kcjeNo1e6bw0nuUWZAznVzYHp0dkkE",
        authDomain: "ai-agents-by-grabbber.firebaseapp.com",
        projectId: "ai-agents-by-grabbber",
        storageBucket: "ai-agents-by-grabbber.firebasestorage.app",
        messagingSenderId: "933712651554",
        appId: "1:933712651554:web:57c7033fb0b5d234d3317b",
        measurementId: "G-MQH79KTMV2"
    };

    // Initialiser Firebase
    firebase.initializeApp(firebaseConfig);
    if (firebase.analytics) {
        firebase.analytics();
    }
    auth = firebase.auth();

    // Vérifier immédiatement si un compte existe
    chrome.storage.local.get('userInfo', (result) => {
        if (!result.userInfo) {
            // Si pas de compte, afficher directement le formulaire de connexion
            showAuthForm();
            // Désactiver le bouton Grabber
            disableGrabberFunctionality();
        } else {
            // Si compte existe, activer les fonctionnalités
            enableGrabberFunctionality();
            // Mettre à jour l'icône du profil
            updateProfileIcon(result.userInfo.initial);
        }
    });

    document.getElementById('profileBtn').addEventListener('click', () => {
        console.log('Profile icon clicked');
        chrome.storage.local.get('userInfo', (result) => {
            if (result.userInfo) {
                showUserInfo(result.userInfo.email);
            } else {
                showAuthForm();
            }
        });
    });
});

function checkAndResetQuota() {
    chrome.storage.local.get(['lastQuotaReset'], function(result) {
        const now = new Date();
        const lastReset = result.lastQuotaReset ? new Date(result.lastQuotaReset) : null;
        
        // Vérifier si c'est un nouveau jour
        if (!lastReset || 
            now.getDate() !== lastReset.getDate() || 
            now.getMonth() !== lastReset.getMonth() || 
            now.getFullYear() !== lastReset.getFullYear()) {
            
            // Réinitialiser le quota
            chrome.storage.local.set({
                dailyQuota: 0,
                lastQuotaReset: now.getTime()
            }, function() {
                // Mettre à jour l'affichage
                updateQuotaDisplay();
                // Afficher une notification
                showNotification('Daily quota has been reset! You have 10 new downloads available.');
            });
        }
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        background: ${type === 'success' ? '#4CAF50' : '#dc2626'};
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: slideUp 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showToggleMessage() {
    // Supprimer le message précédent s'il existe
    const existingMessage = document.querySelector('.toggle-premium-message');
    if (existingMessage) existingMessage.remove();

    const message = document.createElement('div');
    message.className = 'toggle-premium-message';
    message.textContent = 'Grabbber feature coming soon!';
    
    // Ajouter directement au body pour un meilleur positionnement
    document.body.appendChild(message);

    // Positionner le message par rapport au toggle
    const toggle = document.querySelector('.switch');
    const toggleRect = toggle.getBoundingClientRect();
    
    message.style.position = 'absolute';
    message.style.left = `${toggleRect.left + (toggleRect.width/2)}px`;
    message.style.top = `${toggleRect.top - 10}px`; // 10px au-dessus du toggle

    // Supprimer après 2 secondes
    setTimeout(() => message.remove(), 2000);
}

const notificationStyle = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #22c55e;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2s forwards;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;

const toggleMessageStyle = `
    .toggle-premium-message {
        position: fixed;
        transform: translate(-50%, -100%);
        background: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        color: #666;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        width: max-content;
        max-width: 200px;
        text-align: center;
        animation: fadeInMessage 0.2s ease;
        z-index: 10000;
    }

    .toggle-premium-message::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid white;
    }

    @keyframes fadeInMessage {
        from { 
            opacity: 0; 
            transform: translate(-50%, -90%);
        }
        to { 
            opacity: 1; 
            transform: translate(-50%, -100%);
        }
    }
`;

// S'assurer que le style est ajouté
if (!document.querySelector('#toggle-message-style')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toggle-message-style';
    styleSheet.textContent = toggleMessageStyle;
    document.head.appendChild(styleSheet);
}

// Style CSS mis à jour
const toggleStyle = `
    .switch {
        position: relative;
        width: 60px;
        height: 30px;
        display: inline-block;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #3B82F6;
        border-radius: 34px;
    }

    .slider-ball {
        position: absolute;
        height: 24px;
        width: 24px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        border-radius: 50%;
        transition: transform 0.3s ease;
    }

    /* Supprimer toutes les autres transitions */
    input:checked + .slider {
        background-color: #3B82F6;
    }
`;

function handleAuthSuccess(user, password) {
    const initial = user.email.charAt(0).toUpperCase();
    
    // Sauvegarder dans le stockage local avec le mot de passe
    chrome.storage.local.set({
        'userInfo': {
            email: user.email,
            initial: initial,
            password: password
        }
    }, () => {
        // Mettre à jour l'icône
        updateProfileIcon(initial);
        
        // Fermer le modal
        document.getElementById('authModal').style.display = 'none';
        
        // Afficher une notification de succès
        showNotification('Account created successfully!');

        // Envoyer un message à content.js pour activer immédiatement le Grabber
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: "accountCreated",
                    userInfo: {
                        email: user.email,
                        initial: initial
                    }
                });
            }
        });

        // Activer les fonctionnalités immédiatement
        enableGrabberFunctionality();
    });
}

function updateProfileIcon(initial) {
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        // Mettre à jour l'icône
        profileBtn.innerHTML = `
            <div class="profile-initial" style="width: 24px; height: 24px; background: #3B82F6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                ${initial}
            </div>
        `;

        // Réattacher l'event listener
        profileBtn.addEventListener('click', () => {
            console.log('Profile clicked'); // Pour debug
            chrome.storage.local.get('userInfo', (result) => {
                if (result.userInfo) {
                    showUserInfo(result.userInfo.email);
                } else {
                    showAuthForm();
                }
            });
        });
    }
}

function updateQuotaDisplay() {
    chrome.storage.local.get(['dailyQuota'], function(result) {
        const quota = result.dailyQuota || 0;
        document.querySelector('.quota-text').textContent = `Free quota: ${quota}/10 per day.`;
        
        // Désactiver le toggle si quota atteint
        if (quota >= 10) {
            modeToggle.disabled = true;
            modeToggle.checked = false;
        } else {
            modeToggle.disabled = false;
        }
    });
}

function loadHistory() {
    chrome.storage.local.get(['downloadHistory'], function(result) {
        const history = result.downloadHistory || [];
        
        if (history.length === 0) {
            historyBox.innerHTML = '<div class="no-history">No history yet</div>';
            return;
        }

        historyBox.innerHTML = history.map(item => `
            <div class="history-item">
                <img src="${item.thumbnail}" onerror="this.src='default-thumbnail.png'">
                <div class="history-info">
                    <div class="history-title">${item.title}</div>
                    <div class="history-date">${new Date(item.date).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    });
}

function setupQuotaRefresh() {
    // Vérifier si c'est un nouveau jour
    chrome.storage.local.get(['lastQuotaReset'], function(result) {
        const now = new Date().getTime();
        const lastReset = result.lastQuotaReset || 0;
        const dayInMs = 24 * 60 * 60 * 1000;

        if (now - lastReset > dayInMs) {
            chrome.storage.local.set({
                dailyQuota: 0,
                lastQuotaReset: now
            }, updateQuotaDisplay);
        }
    });
}

// Écouter les changements de storage pour mettre à jour l'interface
chrome.storage.onChanged.addListener(function(changes) {
    if (changes.dailyQuota) {
        updateQuotaDisplay();
    }
    if (changes.downloadHistory) {
        loadHistory();
    }
});

checkAndResetQuota();
// Vérifier toutes les minutes
setInterval(checkAndResetQuota, 60000);

function showUserInfo(email) {
    const authModal = document.getElementById('authModal');
    const authContent = authModal.querySelector('.auth-content');
    
    // Récupérer les informations de l'utilisateur
    chrome.storage.local.get('userInfo', (result) => {
        const userInfo = result.userInfo || {};
        
        authContent.innerHTML = `
            <div class="auth-header">
                <h1 class="auth-title">Profile</h1>
                <span class="close-modal">&times;</span>
            </div>
            <div class="profile-info">
                <p>Username: ${userInfo.email}</p>
                <p>Password: ${userInfo.password}</p>
            </div>
            <button class="delete-btn" id="deleteAccountBtn" style="
                background-color: #dc2626;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                width: 100%;
                margin-top: 16px;
                font-weight: 500;
                transition: background-color 0.2s ease;
            ">
                Delete Account
            </button>
        `;

        // Réattacher les event listeners
        const closeModal = authContent.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                authModal.style.display = 'none';
            });
        }

        const deleteBtn = document.getElementById('deleteAccountBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleDeleteAccount);
        }

        authModal.style.display = 'block';
    });
}

function showAuthForm() {
    const authModal = document.getElementById('authModal');
    const authContent = authModal.querySelector('.auth-content');
    
    authContent.innerHTML = `
        <div class="auth-header">
            <h1 class="auth-title" style="color: #4285f4;">Welcome to Grabbber</h1>
            <p class="auth-subtitle">Create an account to start downloading</p>
        </div>
        <form id="emailAuthForm" class="auth-form">
            <input type="email" placeholder="Email" required>
            <input type="password" placeholder="Password" required>
            <button type="submit" class="create-account-btn">
                Create Account
            </button>
        </form>
        <div class="auth-divider">
            <span>or</span>
        </div>
        <button id="googleAuthBtn" class="google-btn">
            <i class="fab fa-google" style="color: #4285f4;"></i>
            Sign up with Google
        </button>
    `;

    // Ajouter les styles pour le nouveau design
    const styles = `
        .auth-header {
            text-align: center;
            margin-bottom: 20px;
        }
        .auth-title {
            font-size: 24px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .auth-subtitle {
            color: #666;
            font-size: 14px;
        }
        .auth-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .create-account-btn {
            background: #3B82F6;
            color: white;
            padding: 12px;
            border-radius: 6px;
            border: none;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }
        .create-account-btn:hover {
            background: #2563EB;
        }
    `;

    if (!document.querySelector('#auth-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'auth-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // Attacher les event listeners
    const form = document.getElementById('emailAuthForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;

        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            handleAuthSuccess(result.user, password);
            enableGrabberFunctionality();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // Afficher immédiatement le modal
    authModal.style.display = 'block';
}

async function handleDeleteAccount() {
    try {
        const user = auth.currentUser;
        if (user) {
            // Vérifier la méthode d'authentification utilisée
            const providers = user.providerData;
            let credential;

            if (providers[0].providerId === 'google.com') {
                // Ré-authentification avec Google
                const provider = new firebase.auth.GoogleAuthProvider();
                await user.reauthenticateWithPopup(provider);
            } else {
                // Pour l'authentification par email/password
                // Afficher un modal pour demander le mot de passe
                const password = await showPasswordConfirmDialog();
                credential = firebase.auth.EmailAuthProvider.credential(
                    user.email,
                    password
                );
                await user.reauthenticateWithCredential(credential);
            }

            // Procéder à la suppression
            await user.delete();
            
            // Nettoyer le stockage local
            chrome.storage.local.remove(['userInfo', 'proStatus']);
            
            // Restaurer l'interface par défaut
            resetInterface();
            
            showNotification('Account deleted successfully');
            showAuthForm();
        }
    } catch (error) {
        console.error('Delete Error:', error);
        showNotification('Error deleting account: ' + error.message, 'error');
    }
}

// Fonction pour afficher le dialog de confirmation du mot de passe
function showPasswordConfirmDialog() {
    return new Promise((resolve, reject) => {
        const authModal = document.getElementById('authModal');
        const authContent = authModal.querySelector('.auth-content');
        
        authContent.innerHTML = `
            <div class="auth-header">
                <h1 class="auth-title">Confirm Password</h1>
                <span class="close-modal">&times;</span>
            </div>
            <form id="passwordConfirmForm" class="auth-form">
                <p>Please enter your password to delete your account</p>
                <input type="password" placeholder="Password" required>
                <button type="submit" class="delete-confirm-btn" style="
                    background-color: #dc2626;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 16px;
                    font-weight: 500;
                    transition: background-color 0.2s ease;
                ">
                    Confirm Delete
                </button>
            </form>
        `;

        const form = document.getElementById('passwordConfirmForm');
        const closeBtn = authContent.querySelector('.close-modal');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = e.target.querySelector('input[type="password"]').value;
            resolve(password);
            authModal.style.display = 'none';
        });

        closeBtn.addEventListener('click', () => {
            authModal.style.display = 'none';
            reject(new Error('Cancelled by user'));
        });

        authModal.style.display = 'block';
    });
}

// Fonction pour réinitialiser l'interface
function resetInterface() {
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        `;
    }
}

function disableGrabberFunctionality() {
    // Désactiver le bouton de téléchargement
    const downloadButton = document.querySelector('.download-button');
    if (downloadButton) {
        downloadButton.style.opacity = '0.5';
        downloadButton.style.cursor = 'not-allowed';
        
        // Ajouter l'event listener pour le message
        downloadButton.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification('Create account first', 'error');
        });
    }

    // Désactiver le toggle AI
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) {
        modeToggle.disabled = true;
        modeToggle.checked = false;
    }
}

function enableGrabberFunctionality() {
    // Activer le bouton de téléchargement
    const downloadButton = document.querySelector('.download-button');
    if (downloadButton) {
        downloadButton.style.opacity = '1';
        downloadButton.style.cursor = 'pointer';
        
        // Supprimer l'ancien event listener et ajouter le nouveau
        downloadButton.replaceWith(downloadButton.cloneNode(true));
        document.querySelector('.download-button').addEventListener('click', handleDownload);
    }

    // Réactiver le toggle AI (si l'utilisateur est Pro)
    chrome.storage.local.get('proStatus', (result) => {
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle && result.proStatus && result.proStatus.active) {
            modeToggle.disabled = false;
        }
    });
}