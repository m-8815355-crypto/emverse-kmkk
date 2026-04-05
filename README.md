# EM-Verse: Interactive Electromagnetic Learning Platform

**EM-Verse** is a comprehensive, interactive web application designed to make learning electromagnetism intuitive and engaging. Created by **Darren Tan Yik Wei**, an engineering student at Kolej Matrikulasi Kejuruteraan Kedah, the platform transforms abstract physics concepts into tangible, visual experiences.

> *"Learning should be an experience, not a struggle."*

## 🎯 Core Mission

EM-Verse bridges the gap between complex electromagnetic theory and genuine intuitive understanding through 3D simulations and Augmented Reality.

---

## ✨ Key Features

### 🧲 Interactive 3D Simulator

A physics engine featuring multiple simulation modules:

| Module | Description |
|--------|-------------|
| **Bar Magnet & Compass** | Explore magnetic fields interactively |
| **Solenoid** | Right-hand rule demonstrations |
| **Electromagnetic Induction** | Generate virtual electricity |
| **Transformer** | AC voltage transfer visualization |
| **Lenz's Law** | Magnetic braking experiments |
| **Electromagnet** | Build and experiment |
| **Magnet Cutting** | Understand dipoles vs monopoles |
| **Assembly Puzzle** | Build components piece by piece |


### 📱 AR Experience

Augmented Reality integration at [em-ar.vercel.app](https://em-ar.vercel.app/) makes invisible forces visible and tangible.

### 📚 Learning Resources

- **History & Foundations** – Journey through the origins of electromagnetic theory, Maxwell's equations, and the pioneers who defined the speed of light
- **Syllabus/Learn Section** – "Uncle Roger's Kitchen" themed physics lessons ("Physics Without Crying in Exam Hall"), complete with **Quick Revision Flashcards** for fast, interactive study sessions
- **Modern Tech Applications** – Real-world applications including 5G/6G networks, wireless charging, MRI scanners, maglev trains, EVs, and satellite communication

### � Exam Practice

Quiz functionality with scenario-based questions, immediate feedback, and detailed explanations to test electromagnetic knowledge.

---

## 🚀 Getting Started

### Option 1: Live Demo

Visit: [em-simulation.vercel.app](https://em-simulation.vercel.app)

### Option 2: VS Code Live Server (Recommended for Development)

1. Open the project folder in VS Code
2. Install the "Live Server" extension
3. Right-click on `index.html` → "Open with Live Server"

### Option 3: Manual Server

```bash
# Using Node.js
npx -y http-server . -p 8080

# Using Python
python -m http.server 8080
```

---

## 🎮 Controls

| Action | Control |
|--------|---------|
| Rotate View | Left-click + Drag |
| Pan View | Right-click + Drag |
| Zoom | Scroll wheel |
| Move Objects | Click + Drag on objects |
| Toggle Play/Pause | Spacebar or ▶/⏸ button |
| Reset Module | R key or Reset button |
| Toggle Grid | G key |
| Toggle Sidebar | M key |

---

## 🛠️ Technology Stack

- **Three.js** (v0.160) – 3D rendering engine
- **ES Modules** – Modern JavaScript architecture
- **CSS3** – Glassmorphism effects and animations
- **Google Fonts** – Montserrat & Inter

---

## 📁 Project Structure

```
EM Simulation/
├── index.html              # Main landing page
├── simulator.html          # 3D physics simulator
├── syllabus.html           # Learning content & flashcards
├── history.html            # History of electromagnetism
├── applications.html       # Modern tech applications
├── style.css               # Simulator styling
├── landing.css             # Landing page styling
├── js/
│   ├── main.js             # Simulator entry point
│   ├── SceneManager.js     # Three.js scene setup
│   ├── ComponentLibrary.js # 3D component factories
│   ├── FieldVisualizer.js  # Magnetic field rendering
│   ├── InteractionManager.js # User input handling
│   └── modules/            # Simulation modules
│       ├── BarMagnetModule.js
│       ├── SolenoidModule.js
│       ├── InductionModule.js
│       ├── TransformerModule.js
│       ├── LenzLawModule.js
│       ├── ElectromagnetModule.js
│       ├── MagnetCuttingModule.js
│       └── AssemblyModule.js
└── assets/
    └── images/             # UI assets and backgrounds
```

---

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+

---

## 📝 Physics Notes

This simulator uses **simplified** electromagnetic physics for visual demonstration:

- No numerical calculations displayed (avoids precision errors)
- Field lines show qualitative behavior, not exact shape
- Focus on direction and relative strength visualization
- Educational purpose: understanding concepts, not measurements

---

## 📄 License

MIT License – Free for educational use

---

## 👤 Author

**Darren Tan Yik Wei**  
Engineering Student, Kolej Matrikulasi Kejuruteraan Kedah

---

*Built with ❤️ for physics learners everywhere*