# 🚀 Quick Start - Devver Overlay

Guide rapide pour intégrer Devver Overlay dans vos projets.

## Installation en 1 ligne

Ajoutez simplement cette ligne dans votre HTML :

```html
<script src="https://www.devver.app/devver-overlay.iife.js"></script>
```

**C'est tout !** Le bouton flottant avec le logo Devver apparaît automatiquement en bas à droite. ✨

---

## Exemple complet

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mon Projet avec Devver Overlay</title>
</head>
<body>
    <h1>Bienvenue sur mon site</h1>
    <p>Mon contenu...</p>

    <!-- Devver Overlay - s'initialise automatiquement -->
    <script src="https://www.devver.app/devver-overlay.iife.js"></script>
</body>
</html>
```

---

## Utilisation de l'API JavaScript

Une fois le script chargé, vous avez accès à l'API globale `DevverOverlay` :

### Afficher un overlay personnalisé

```html
<button onclick="showMyOverlay()">Ouvrir un overlay</button>

<script>
function showMyOverlay() {
    DevverOverlay.show({
        title: '👋 Bonjour !',
        content: '<p>Ceci est un overlay personnalisé.</p>'
    });
}
</script>
```

### Options disponibles

```javascript
DevverOverlay.show({
    title: 'Mon Titre',                    // Titre de l'overlay (optionnel)
    content: '<p>Mon contenu HTML</p>',    // Contenu HTML (optionnel)
    closeOnClickOutside: true,             // Fermer en cliquant dehors (défaut: true)
    showCloseButton: true,                 // Afficher le bouton X (défaut: true)
    className: 'ma-classe-custom',         // Classe CSS personnalisée (optionnel)
    onClose: () => {                       // Callback appelé à la fermeture
        console.log('Overlay fermé !');
    }
});
```

### Autres méthodes

```javascript
// Fermer l'overlay
DevverOverlay.close();

// Vérifier si un overlay est ouvert
if (DevverOverlay.isOpen()) {
    console.log('Un overlay est ouvert');
}
```

---

## Fonctionnalités automatiques

### Bouton flottant
- Apparaît automatiquement en bas à droite
- Affiche le logo Devver
- Ouvre un drawer avec des actions rapides

### Drawer latéral
- S'ouvre en cliquant sur le bouton flottant
- Contient des exemples d'overlays prêts à l'emploi
- Se ferme en cliquant en dehors ou avec la touche Échap

### Raccourcis clavier
- **Échap** : Ferme l'overlay ou le drawer ouvert

---

## Exemples d'utilisation

### Overlay simple

```javascript
DevverOverlay.show({
    content: '<p>Message rapide sans titre.</p>'
});
```

### Overlay avec titre et contenu riche

```javascript
DevverOverlay.show({
    title: '📋 Informations importantes',
    content: `
        <div style="padding: 20px;">
            <h3>Bienvenue !</h3>
            <ul>
                <li>Fonctionnalité 1</li>
                <li>Fonctionnalité 2</li>
                <li>Fonctionnalité 3</li>
            </ul>
            <button onclick="DevverOverlay.close()" 
                    style="margin-top: 15px; padding: 10px 20px;">
                Compris !
            </button>
        </div>
    `
});
```

### Overlay de confirmation

```javascript
function confirmerAction() {
    DevverOverlay.show({
        title: '⚠️ Confirmation',
        content: `
            <p>Êtes-vous sûr de vouloir continuer ?</p>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button onclick="effectuerAction()">Oui</button>
                <button onclick="DevverOverlay.close()">Non</button>
            </div>
        `,
        closeOnClickOutside: false
    });
}

function effectuerAction() {
    console.log('Action effectuée !');
    DevverOverlay.close();
}
```

### Overlay avec callback

```javascript
DevverOverlay.show({
    title: 'Notification',
    content: '<p>Action terminée avec succès !</p>',
    onClose: () => {
        // Code exécuté à la fermeture
        console.log('Utilisateur a fermé la notification');
        // Redirection, analytics, etc.
    }
});
```

---

## Personnalisation CSS

Vous pouvez personnaliser l'apparence avec du CSS :

```css
/* Changer la position du bouton flottant */
.devver-floating-button {
    bottom: 30px !important;
    left: 30px !important;
    right: auto !important;
}

/* Personnaliser les couleurs du bouton */
.devver-floating-button {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%) !important;
}

/* Modifier le style du modal */
.devver-overlay-modal {
    border-radius: 20px !important;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4) !important;
}

/* Changer les couleurs du drawer */
.devver-drawer-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}
```

---

## Installation en local (développement)

Si vous voulez tester en local avant de déployer :

1. Copiez le fichier `devver-overlay.iife.js` dans votre projet
2. Importez-le avec un chemin relatif :

```html
<script src="./js/devver-overlay.iife.js"></script>
```

---

## Déploiement sur CDN

### Option 1 : Héberger sur votre serveur

1. Uploadez `devver-overlay.iife.js` sur votre serveur
2. Utilisez l'URL complète :

```html
<script src="https://votre-site.com/path/devver-overlay.iife.js"></script>
```

### Option 2 : Utiliser un CDN gratuit

Vous pouvez utiliser des services comme :
- **jsDelivr** (via GitHub)
- **unpkg** (via npm)
- **Cloudflare Pages**

---

## Compatibilité

✅ Chrome, Firefox, Safari, Edge (versions récentes)  
✅ Mobile (iOS, Android)  
✅ Fonctionne sans dépendances externes  
✅ Taille : ~13 KB (3.2 KB gzippé)

---

## Support

Pour toute question ou problème :
- 📧 Contact : support@devver.app
- 🌐 Site : https://www.devver.app
- 📚 Documentation complète : Voir README.md

---

## Licence

MIT - Projet Devver - Master ESGI

Fait avec ❤️ pour simplifier vos projets web
