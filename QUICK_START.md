# 🚀 Quick Start - Devver Overlay

Guide rapide pour intégrer le widget de commentaires Devver.

## Installation (1 ligne)

```html
<script src="https://votre-cdn.com/devver-overlay.iife.js"></script>
```

**C'est tout !** Une toolbar apparaît en bas au centre de la page. ✨

---

## Exemple complet

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mon site avec Devver</title>
</head>
<body>
    <h1>Mon contenu</h1>
    <p>Les utilisateurs peuvent commenter n'importe où sur cette page.</p>

    <!-- Devver Overlay -->
    <script src="devver-overlay.iife.js"></script>
</body>
</html>
```

---

## Comment ça marche ?

### 1. La Toolbar

Une barre d'outils apparaît en bas au centre avec 3 boutons :

| Icône | Action |
|-------|--------|
| 💬 | Mode commentaire |
| 📋 | Liste des commentaires |
| ⚙️ | Paramètres |

### 2. Ajouter un commentaire

1. Cliquez sur **💬** → le mode commentaire s'active
2. Un voile blanc apparaît, le curseur devient ✛
3. Cliquez où vous voulez sur la page
4. Un formulaire s'ouvre avec votre nom affiché
5. Écrivez votre commentaire et cliquez **Publier**
6. Un pin numéroté apparaît à cet endroit

### 3. Définir son nom

1. Cliquez sur **⚙️** (Paramètres)
2. Entrez votre nom
3. Cliquez **Enregistrer**

> 💡 Le nom est sauvegardé dans le navigateur et apparaît sur tous vos commentaires.

### 4. Voir les commentaires

**Option A** : Cliquez sur un pin numéroté sur la page

**Option B** : 
1. Cliquez sur **📋**
2. La liste de tous les commentaires s'affiche
3. Cliquez sur un commentaire pour y accéder

### 5. Raccourcis clavier

| Touche | Action |
|--------|--------|
| Échap | Ferme le panneau/modal actif |
| Échap | Annule le mode commentaire |

---

## API JavaScript

### Activer le mode commentaire

```javascript
DevverOverlay.enableComments();
```

### Désactiver le mode commentaire

```javascript
DevverOverlay.disableComments();
```

### Définir le nom de l'utilisateur

```javascript
DevverOverlay.setAuthorName("Jean Dupont");
```

### Récupérer tous les commentaires

```javascript
const comments = DevverOverlay.listComments();
console.log(comments);
// [{ id, text, author, createdAt, x, y, ... }]
```

### Afficher un modal personnalisé

```javascript
DevverOverlay.show({
    title: "Information",
    content: "<p>Votre message ici</p>",
    closeOnClickOutside: true
});
```

### Fermer le modal

```javascript
DevverOverlay.close();
```

---

## Configuration avancée (API backend)

Pour connecter à un backend :

```javascript
DevverOverlay.configureComments({
    mode: "api",
    baseUrl: "https://api.monsite.com",
    projectId: "mon-projet",
    authToken: "mon-token-jwt"
});
```

---

## Personnalisation

### Changer les couleurs

```css
:root {
    --devver-accent: #3b82f6;       /* Couleur d'accent (boutons actifs) */
    --devver-pin: #ef4444;          /* Couleur des pins */
    --devver-bg-dark: #1a1a2e;      /* Fond de la toolbar */
}
```

### Repositionner la toolbar

```css
.devver-toolbar {
    bottom: 40px !important;
    /* ou top: 20px; pour en haut */
}
```

### Masquer un bouton

```css
/* Masquer le bouton paramètres par exemple */
.devver-toolbar-btn:nth-child(5) {
    display: none;
}
```

---

## Stockage des données

Par défaut, les commentaires sont stockés dans le **localStorage** du navigateur, indexés par URL de page.

Structure d'un commentaire :
```json
{
    "id": "abc123",
    "text": "Mon commentaire",
    "author": "Marie",
    "createdAt": "2026-01-12T14:30:00.000Z",
    "x": 450,
    "y": 800,
    "pageUrl": "https://monsite.com/page",
    "anchorSelector": "#section-1",
    "anchorOffsetX": 0.5,
    "anchorOffsetY": 0.3
}
```

---

## Compatibilité

✅ Chrome, Firefox, Safari, Edge (versions récentes)  
✅ Mobile (iOS, Android)  
✅ Zéro dépendance  
✅ ~13 KB gzippé

---

## Support

- 📧 support@devver.app
- 🌐 https://www.devver.app
- 📚 Documentation complète : [README.md](./README.md)

---

MIT - Projet Devver
