# 🎬 IRLServer Clip Player

A modern, responsive Twitch clip viewer that continuously plays clips from your favorite streamers. Built with Vite, ES6 modules, and modern web technologies.

## ✨ Features

- 🎥 **Continuous Playback**: Automatically plays clips in sequence
- 🔀 **Smart Shuffling**: Randomizes clip order for variety
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast Loading**: Built with Vite for optimal performance
- 🎛️ **Configurable**: Customize via URL parameters
- 🎨 **Modern UI**: Clean, minimal interface with accessibility support
- 📊 **Smart Filtering**: Filter clips by date range

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Usage

Visit the application with required parameters:

```
http://localhost:3000?channelName=shroud&days=30&volume=0.5
```

## 🔧 Configuration

Configure the player using URL parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `channelName` | string | *required* | Twitch channel name |
| `days` | number | `900` | Filter clips from last N days |
| `views` | number | `0` | Minimum view count filter (0 = no filter) |
| `volume` | number | `0.5` | Video volume (0.0 - 1.0) |
| `showLogo` | boolean | `true` | Show channel logo |
| `showInfo` | boolean | `true` | Show clip information |
| `showTimer` | boolean | `true` | Show countdown timer |

### Example URLs

```
# Basic usage
?channelName=pokimane

# Custom configuration
?channelName=xqc&days=7&volume=0.8&showInfo=false

# Filter by minimum view count
?channelName=shroud&views=1000&days=30

# Combined filters
?channelName=pokimane&days=7&views=500&volume=0.8

# Mobile-friendly setup
?channelName=shroud&showLogo=false&showTimer=false
```

## 🏗️ Architecture

The application is built with modern ES6 modules:

```
src/
├── main.js              # Application entry point
├── styles/
│   └── main.css         # Global styles
├── api/
│   └── twitch.js        # Twitch API integration
├── player/
│   ├── video-player.js  # Video playback logic
│   └── playlist-manager.js # Clip playlist management
├── ui/
│   └── ui-manager.js    # UI state management
└── utils/
    ├── url.js           # URL parameter handling
    └── array.js         # Array utilities
```

## 🔗 API Integration

Uses Twitch's GraphQL API to:

- Fetch channel clips
- Get video playback URLs
- Access clip metadata
- Filter clips by view count (client-side)

## 🎨 Styling

- Modern CSS with CSS Grid and Flexbox
- Responsive design with mobile-first approach
- Dark theme optimized for video content
- Accessibility features (high contrast, reduced motion)
- Smooth transitions and animations

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
npm run build
vercel --prod
```

The included `vercel.json` configures automatic deployment with Vite.

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy the `dist` folder to your hosting provider
```

## 🛠️ Development

### Project Structure

- **Modular Architecture**: Clean separation of concerns
- **ESM Modules**: Native ES6 module system
- **Vite Build System**: Fast development and optimized builds
- **Type Annotations**: JSDoc comments for better development experience

### Adding Features

1. Create new modules in appropriate directories
2. Export functions/classes using ES6 syntax
3. Import and integrate in `main.js`
4. Update this README with new configuration options

## 🎯 Performance

- **Bundle Splitting**: Automatic code splitting with Vite
- **Tree Shaking**: Dead code elimination
- **Asset Optimization**: Automatic image and CSS optimization
- **Lazy Loading**: Components loaded as needed

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🎮 Example Streamers

Try these popular channels:

- `?channelName=shroud`
- `?channelName=pokimane`
- `?channelName=xqc`
- `?channelName=ninja`

---

Built with ❤️ and modern web technologies