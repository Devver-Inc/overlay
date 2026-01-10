# 🚀 Devver Overlay

Un overlay simple, élégant et léger pour vos projets web. Parfait pour créer des modals, des alertes, et des notifications.

## ✨ Fonctionnalités

- 🎨 Design moderne et responsive
- ⚡ Léger et performant (aucune dépendance)
- 🎭 Animations fluides
- ⌨️ Support du clavier (touche Échap)
- 📱 Compatible mobile
- 🔧 Hautement personnalisable
- 🌐 API simple et intuitive
- 🔘 Bouton flottant avec votre logo
- 📱 Drawer latéral avec actions rapides

## 📦 Installation

### Via balise script (recommandé)

Ajoutez simplement cette ligne dans votre HTML :

```html
<script src="https://votre-cdn.com/devver-overlay.iife.js"></script>
```

### En local

1. Clonez ce repository
2. Installez les dépendances : `npm install`
3. Buildez le projet : `npm run build`
4. Récupérez le fichier `dist/devver-overlay.iife.js`

## 🎯 Utilisation

### Mode par défaut (avec bouton flottant)

Par défaut, Devver Overlay affiche un bouton flottant en bas à droite avec votre logo. Ce bouton ouvre un drawer avec des actions rapides.

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Mon Projet</title>
  </head>
  <body>
    <!-- Le bouton flottant et le drawer sont automatiquement créés -->
    <script src="devver-overlay.iife.js"></script>
  </body>
</html>
```

### Mode sans bouton flottant

Si vous préférez utiliser uniquement l'API sans le bouton flottant :

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Mon Projet</title>
  </head>
  <body>
    <script src="devver-overlay.iife.js"></script>
    <script>
      // Désactiver le bouton flottant (à faire avant l'initialisation)
      // Note: Cette fonctionnalité nécessite une initialisation personnalisée
    </script>
  </body>
</html>
```

### Exemple basique

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Mon Projet</title>
  </head>
  <body>
    <button onclick="showMyOverlay()">Ouvrir l'overlay</button>

    <script src="devver-overlay.iife.js"></script>
    <script>
      function showMyOverlay() {
        DevverOverlay.show({
          title: "Bienvenue",
          content: "<p>Ceci est un overlay simple et élégant !</p>",
        });
      }
    </script>
  </body>
</html>
```

### API

#### `DevverOverlay.show(options)`

Affiche l'overlay avec les options spécifiées.

**Options disponibles :**

| Option                | Type       | Défaut      | Description                     |
| --------------------- | ---------- | ----------- | ------------------------------- |
| `title`               | `string`   | `''`        | Titre de l'overlay              |
| `content`             | `string`   | `''`        | Contenu HTML de l'overlay       |
| `closeOnClickOutside` | `boolean`  | `true`      | Fermer en cliquant en dehors    |
| `showCloseButton`     | `boolean`  | `true`      | Afficher le bouton de fermeture |
| `onClose`             | `function` | `undefined` | Callback appelé à la fermeture  |
| `className`           | `string`   | `''`        | Classe CSS personnalisée        |

**Exemple :**

```javascript
DevverOverlay.show({
  title: "Confirmation",
  content: "<p>Êtes-vous sûr de vouloir continuer ?</p>",
  closeOnClickOutside: false,
  onClose: () => {
    console.log("Overlay fermé !");
  },
});
```

#### `DevverOverlay.close()`

Ferme l'overlay actuellement ouvert.

```javascript
DevverOverlay.close();
```

#### `DevverOverlay.isOpen()`

Vérifie si un overlay est actuellement ouvert.

```javascript
if (DevverOverlay.isOpen()) {
  console.log("Un overlay est déjà ouvert");
}
```

## 🔘 Bouton Flottant et Drawer

### Utilisation du bouton flottant

Le bouton flottant apparaît automatiquement en bas à droite de votre page. Il affiche votre logo "d" et permet d'accéder rapidement au drawer.

**Fonctionnalités du drawer :**

- Actions rapides pour créer des overlays
- Informations sur la version
- Interface intuitive et moderne
- Fermeture automatique avec Échap

### Personnalisation du drawer

Vous pouvez personnaliser le contenu du drawer en modifiant le fichier source ou en contribuant au projet.

## 🎨 Exemples

### Overlay simple

```javascript
DevverOverlay.show({
  content: "<p>Message simple sans titre</p>",
});
```

### Overlay avec titre

```javascript
DevverOverlay.show({
  title: "Information",
  content: "<p>Ceci est un message important.</p>",
});
```

### Contenu riche avec HTML

```javascript
DevverOverlay.show({
  title: "Profil Utilisateur",
  content: `
        <div style="text-align: center;">
            <img src="avatar.jpg" style="border-radius: 50%; width: 100px;" />
            <h3>Jean Dupont</h3>
            <p>Développeur Full Stack</p>
            <button onclick="DevverOverlay.close()">Fermer</button>
        </div>
    `,
});
```

### Overlay personnalisé avec callback

```javascript
DevverOverlay.show({
  title: "Confirmation de suppression",
  content: `
        <p>Voulez-vous vraiment supprimer cet élément ?</p>
        <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button onclick="handleDelete()">Supprimer</button>
            <button onclick="DevverOverlay.close()">Annuler</button>
        </div>
    `,
  closeOnClickOutside: false,
  onClose: () => {
    console.log("Action annulée");
  },
});

function handleDelete() {
  console.log("Élément supprimé");
  DevverOverlay.close();
}
```

## 🛠️ Développement

### Prérequis

- Node.js 16+
- npm ou yarn

### Commandes

```bash
# Installation des dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Builder pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## 🎨 Personnalisation

### Personnaliser l'overlay

Vous pouvez personnaliser le style de l'overlay en ajoutant vos propres classes CSS :

```javascript
DevverOverlay.show({
  title: "Overlay personnalisé",
  content: "<p>Contenu avec style custom</p>",
  className: "my-custom-overlay",
});
```

Puis dans votre CSS :

```css
.my-custom-overlay .devver-overlay-modal {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.my-custom-overlay .devver-overlay-title {
  color: white;
}
```

### Personnaliser le bouton flottant

Le bouton flottant peut être stylisé via CSS :

```css
/* Changer la position */
.devver-floating-button {
  bottom: 30px !important;
  left: 30px !important;
  right: auto !important;
}

/* Changer les couleurs */
.devver-floating-button {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%) !important;
}
```

### Personnaliser le drawer

Le drawer peut également être personnalisé :

```css
/* Changer la largeur du drawer */
.devver-drawer {
  width: 400px !important;
}

/* Changer les couleurs du header */
.devver-drawer-header {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%) !important;
}
```

## 📝 Licence

MIT

## 👨‍💻 Auteur

Projet Devver - Master ESGI

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

Fait avec ❤️ pour simplifier vos projets web
