# 🚀 Quick Start - Devver Overlay

Guide rapide pour intégrer le widget de commentaires Devver.

## Installation (1 ligne)

```html
<script src="https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@main/public/devver-overlay.iife.js"></script>
```

**C'est tout !** Une toolbar apparaît en bas de la page. ✨

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

    <!-- Devver Overlay via jsDelivr CDN -->
    <script src="https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@main/public/devver-overlay.iife.js"></script>
</body>
</html>
```

---

## Comment ça marche ?

### 1. La Toolbar

Une barre d'outils apparaît en bas avec 3 boutons :

| Icône | Action |
|-------|--------|
| 💬 | Mode commentaire |
| 📋 | Liste des commentaires |
| ⚙️ | Paramètres |

### 2. Ajouter un commentaire

1. Cliquez sur **💬** → le mode commentaire s'active
2. Un voile blanc apparaît, le curseur devient ✛
3. Cliquez où vous voulez sur la page
4. Le pin apparaît immédiatement, l'éditeur s'ouvre
5. Écrivez votre commentaire et cliquez **Publier**

### 3. Définir son nom

1. Cliquez sur **⚙️** (Paramètres)
2. Entrez votre nom
3. Choisissez la position de la toolbar
4. Cliquez **Enregistrer**

> 💡 Le nom et la position sont sauvegardés dans le navigateur.

### 4. Voir les commentaires

**Option A** : Cliquez sur un pin numéroté sur la page

**Option B** : 
1. Cliquez sur **📋**
2. La liste de tous les commentaires s'affiche dans un drawer
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

### Repositionner la toolbar via CSS

```css
.devver-toolbar {
    bottom: 40px !important;
}
```

> 💡 La position de la toolbar peut aussi être changée via les paramètres (⚙️).

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

## CDN jsDelivr

Le fichier est servi gratuitement via [jsDelivr](https://www.jsdelivr.com/) depuis GitHub :

| Version | URL |
|---------|-----|
| Dernière (main) | `https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@main/public/devver-overlay.iife.js` |
| Tag spécifique | `https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@v1.0.0/public/devver-overlay.iife.js` |

---

## Compatibilité

✅ Chrome, Firefox, Safari, Edge (versions récentes)  
✅ Mobile (iOS, Android)  
✅ Zéro dépendance  
✅ ~14 KB gzippé

---

## Support

- 📧 support@devver.app
- 🌐 https://www.devver.app
- 📚 Documentation complète : [README.md](./README.md)
- 🐙 GitHub : [Devver-Inc/overlay](https://github.com/Devver-Inc/overlay)

---

MIT - Projet Devver
