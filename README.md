# 💬 Devver Overlay

Widget de commentaires façon Figma pour annoter n'importe quelle page web. Design dark moderne inspiré du dev toolbar d'Astro.

## ✨ Fonctionnalités

- 📍 **Pins cliquables** : Posez des commentaires n'importe où sur la page
- 👤 **Auteur personnalisable** : Chaque commentaire affiche le nom et la date
- 📋 **Liste des commentaires** : Drawer latéral listant tous les commentaires
- ⚙️ **Paramètres** : Panneau pour définir son nom et la position de la toolbar
- 🎨 **Design dark** : Interface élégante inspirée d'Astro
- 💾 **Persistance** : Stockage localStorage (API-ready pour backend)
- ⌨️ **Raccourcis** : Échap pour fermer/annuler
- 📱 **Responsive** : Adapté mobile et desktop

## 📦 Installation

### CDN (recommandé)

```html
<script src="https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@main/public/devver-overlay.iife.js"></script>
```

### Build local

```bash
npm install
npm run build
# → dist/devver-overlay.iife.js
```

## 🚀 Utilisation

```html
<script src="https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@main/public/devver-overlay.iife.js"></script>
```

Le widget s'initialise automatiquement avec une **toolbar en bas** de l'écran.

### Toolbar

| Bouton | Action |
|--------|--------|
| 💬 | Active/désactive le mode commentaire |
| 📋 | Ouvre la liste des commentaires |
| ⚙️ | Ouvre les paramètres |

### Ajouter un commentaire

1. Cliquez sur 💬 pour activer le mode commentaire
2. Un voile blanc apparaît, le curseur devient une croix
3. Cliquez où vous voulez placer le commentaire
4. Le pin apparaît immédiatement, l'éditeur s'ouvre
5. Rédigez votre texte et cliquez "Publier"

### Voir un commentaire

- Cliquez sur un **pin numéroté** sur la page
- Ou ouvrez la **liste** 📋 et cliquez sur un commentaire
- Le modal s'affiche à côté du pin avec auteur + date

## ⚙️ API JavaScript

```javascript
// Mode commentaire
DevverOverlay.enableComments();      // Activer
DevverOverlay.disableComments();     // Désactiver

// Définir le nom de l'utilisateur (optionnel, sinon via UI)
DevverOverlay.setAuthorName("Marie Dupont");

// Récupérer les commentaires
const comments = DevverOverlay.listComments();

// Configuration API (pour backend futur)
DevverOverlay.configureComments({
  mode: "api",                       // "local" (défaut) ou "api"
  baseUrl: "https://api.example.com",
  projectId: "mon-projet",
  authToken: "bearer-xxx"
});

// Modal générique
DevverOverlay.show({ title: "Info", content: "<p>Hello</p>" });
DevverOverlay.close();
DevverOverlay.isOpen();
```

## 🎨 Personnalisation CSS

Variables CSS disponibles :

```css
:root {
  --devver-bg-dark: #13151a;
  --devver-bg-card: #1e2028;
  --devver-accent: #ffffff;
  --devver-pin: #ff5d5d;
  --devver-text: #f1f1f1;
  --devver-radius: 8px;
}
```

Classes principales :

| Classe | Élément |
|--------|---------|
| `.devver-toolbar` | Barre d'outils en bas |
| `.devver-comment-pin` | Pins sur la page |
| `.devver-comment-editor` | Formulaire de commentaire |
| `.devver-comment-drawer` | Liste des commentaires |
| `.devver-settings` | Panneau paramètres |

## 🛠️ Développement

```bash
npm install
npm run dev      # Serveur de dev Vite
npm run build    # Build production
npm run preview  # Preview du build
```

### Structure

```
src/
├── core/
│   ├── DevverOverlay.ts    # Orchestrateur principal
│   └── globalScope.ts      # Utilitaires globaux
├── services/
│   └── commentService.ts   # Persistance (local/API)
├── ui/
│   ├── toolbar.ts          # Barre d'outils
│   ├── commentLayer.ts     # Couche des pins
│   ├── commentEditor.ts    # Éditeur de commentaire
│   ├── commentDrawer.ts    # Liste des commentaires
│   ├── settingsPanel.ts    # Panneau paramètres
│   └── modal.ts            # Modal générique
├── utils/
│   ├── anchor.ts           # Positionnement robuste
│   ├── position.ts         # Calculs de position
│   └── sanitize.ts         # Échappement HTML
├── style.ts                # CSS injecté
├── types.ts                # Types TypeScript
└── index.ts                # Point d'entrée
```

## 📝 Licence

MIT - Projet Devver
