# 🎬 IRLServer Twitch Clip Player

**Created by [IRLServer.com](https://irlserver.com)** - An advanced web application for playing Twitch clips with intelligent shuffling and filtering capabilities.

---

> **📋 License**: CC BY 4.0 - Just credit [IRLServer.com](https://irlserver.com) if you use this!

---

## 🆕 **URL Generator**

**New Feature!** When you visit the site without a `channelName` parameter, you'll see a beautiful generator interface that lets you:

- 🎯 **Easy Setup**: Point-and-click configuration for all parameters
- 🌟 **Popular Streamers**: Quick-select buttons for top Twitch streamers
- 🔄 **Live URL Preview**: See your custom URL update in real-time
- 📋 **One-Click Copy**: Copy the generated URL to your clipboard
- 🚀 **Instant Launch**: Test or launch your player immediately

Simply visit the site at `https://clips.irl.ac` (without any parameters) to access the generator!

### 🎯 **Clean Player Experience**

- **🎬 Clip Player**: Clean interface, no branding required
- **⚙️ Generator Page**: Shows IRLServer.com attribution (as it should!)

That's it - simple and user-friendly!

## ✨ Features

- 🎥 **Continuous Playback**: Automatically plays clips in sequence
- 🔀 **Smart Shuffling**: Advanced shuffling algorithms ensure variety across different view count ranges
- 📊 **Diverse Clip Pool**: Fetches 300+ clips through pagination instead of just the top 100
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast Loading**: Built with Vite for optimal performance
- 🎛️ **Configurable**: Customize via URL parameters
- 🎨 **Modern UI**: Clean, minimal interface with accessibility support
- 📊 **Smart Filtering**: Filter clips by date range and minimum view count

## 🚀 Quick Start

### Method 1: URL Generator (Recommended)

1. Visit the site without any parameters: `https://clips.irl.ac`
2. Use the interactive generator to configure your clip player
3. Click "🚀 Launch Player" or copy the generated URL

### Method 2: Manual URL Construction

Visit the site with parameters:

```
https://clips.irl.ac?channelName=xqc&days=7&views=1000&shuffle=smart
```

## 🔧 Configuration

Configure the player using URL parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `channelName` | string | *required* | Twitch channel name |
| `days` | number | `900` | Filter clips from last N days |
| `views` | number | `0` | Minimum view count filter (0 = no filter) |
| `shuffle` | string | `smart` | Shuffle strategy: `smart`, `stratified`, `weighted`, `random` |
| `volume` | number | `0.5` | Video volume (0.0 - 1.0) |
| `showLogo` | boolean | `true` | Show channel logo |
| `showInfo` | boolean | `true` | Show clip information |
| `infoScale` | number | `1` | Size multiplier for the clip info overlay (0.5 - 3) |
| `showTimer` | boolean | `false` | Show countdown timer |

### Shuffle Strategies

- **`smart`** *(default)*: Automatically chooses the best strategy based on clip count
- **`stratified`**: Divides clips into view count ranges and evenly distributes them
- **`weighted`**: Gives less popular clips a chance while still favoring popular ones  
- **`random`**: Traditional random shuffle (like the old behavior)

### Example URLs

```
# Basic usage
?channelName=pokimane

# Custom configuration
?channelName=xqc&days=7&volume=0.8&showInfo=false

# Filter by minimum view count
?channelName=shroud&views=1000&days=30

# Use different shuffle strategies
?channelName=pokimane&shuffle=stratified&days=7
?channelName=ninja&shuffle=weighted&views=500

# Combined filters with smart shuffling
?channelName=pokimane&days=7&views=500&shuffle=smart&volume=0.8

# Old-style random shuffle
?channelName=xqc&shuffle=random&days=14

# Mobile-friendly setup
?channelName=shroud&showLogo=false&showTimer=false
```

## 🛠️ Development

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
    └── array.js         # Advanced shuffling algorithms
```

## 🔗 API Integration

Uses Twitch's GraphQL API with advanced features:

- **Pagination Support**: Fetches 300+ clips instead of just the top 100
- **Diverse Sampling**: Gets clips from different popularity ranges
- **Smart Caching**: Efficient API usage with respectful rate limiting
- **Fallback Handling**: Graceful degradation when pagination fails

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

## 📝 License

**CC BY 4.0** - Use it however you want, just mention [IRLServer.com](https://irlserver.com) somewhere!

Created with ❤️ by [IRLServer.com](https://irlserver.com)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🎮 Example Streamers

Try these popular channels with different strategies:

```
# Popular streamers with stratified shuffling
?channelName=shroud&shuffle=stratified
?channelName=pokimane&shuffle=weighted&views=1000

# Discover hidden gems with weighted shuffling
?channelName=xqc&shuffle=weighted&days=30
?channelName=ninja&shuffle=smart&views=500
```

---

Built with ❤️ and modern web technologies
