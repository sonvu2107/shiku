/**
 * Custom Styles for Cultivation Page
 * Contains all CSS animations and custom styling
 */

const CustomStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Noto+Serif+SC:wght@300;400;700&display=swap');
    
    .font-title { font-family: 'Playfair Display', serif; }
    .font-cultivation { font-family: 'Noto Serif SC', serif; }

    /* Cosmic Background Animation */
    .stars {
      background-image: 
        radial-gradient(1px 1px at 25px 5px, white, transparent), 
        radial-gradient(1px 1px at 50px 25px, white, transparent), 
        radial-gradient(1px 1px at 125px 20px, white, transparent), 
        radial-gradient(1.5px 1.5px at 50px 75px, white, transparent), 
        radial-gradient(2px 2px at 15px 125px, rgba(255,255,255,0.5), transparent), 
        radial-gradient(2.5px 2.5px at 110px 80px, white, transparent),
        radial-gradient(1px 1px at 200px 150px, white, transparent),
        radial-gradient(1.5px 1.5px at 180px 50px, white, transparent);
      background-size: 250px 250px;
      animation: moveStars 100s linear infinite;
      will-change: background-position;
    }
    @keyframes moveStars {
      from { background-position: 0 0; }
      to { background-position: 0 1000px; }
    }
    /* Mobile: disable stars animation */
    @media (max-width: 640px) {
      .stars {
        animation: none;
        opacity: 0.2;
      }
    }

    /* Mist Animation - Ethereal Qi */
    .mist {
      position: absolute;
      background: radial-gradient(ellipse at center, rgba(88, 28, 135, 0.2) 0%, rgba(0,0,0,0) 70%);
      border-radius: 50%;
      filter: blur(50px);
      animation: floatMist 25s infinite ease-in-out alternate;
      will-change: transform, opacity;
    }
    .mist-2 {
      background: radial-gradient(ellipse at center, rgba(6, 182, 212, 0.12) 0%, rgba(0,0,0,0) 70%);
      animation-duration: 35s;
      animation-delay: -10s;
    }
    .mist-3 {
      background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.1) 0%, rgba(0,0,0,0) 70%);
      animation-duration: 30s;
      animation-delay: -5s;
    }
    
    @keyframes floatMist {
      0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
      50% { transform: translate(30px, -20px) scale(1.2); opacity: 0.6; }
      100% { transform: translate(-20px, 40px) scale(1.1); opacity: 0.3; }
    }
    /* Mobile: disable mist animation and reduce blur */
    @media (max-width: 640px) {
      .mist, .mist-2, .mist-3 {
        animation: none;
        filter: blur(15px);
        opacity: 0.15;
      }
    }

    /* Impact Burst */
    .impact-burst {
      position: absolute;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,200,0,0.6) 30%, transparent 70%);
      border-radius: 50%;
      animation: burst 0.4s ease-out forwards;
      pointer-events: none;
      z-index: 100;
      mix-blend-mode: screen;
    }
    @keyframes burst {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
    }

    /* Hit Flash */
    @keyframes hitFlash {
      0% { filter: brightness(1); }
      25% { filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); } 
      100% { filter: brightness(1); }
    }
    .animate-hit {
      animation: hitFlash 0.3s ease-out;
    }

    /* Skill Aura */
    .skill-aura {
      position: absolute;
      inset: -20px;
      border-radius: 50%;
      background: radial-gradient(circle, transparent 50%, rgba(245, 158, 11, 0.4) 70%, transparent 80%);
      animation: gatherEnergy 0.5s ease-in forwards;
      z-index: -1;
    }
    @keyframes gatherEnergy {
      0% { transform: scale(2); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Battle Shake Animation */
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .animate-shake {
      animation: shake 0.3s ease-in-out;
    }

    /* Sword Slash Effect */
    @keyframes slashRight {
      0% { transform: translateX(-50px) rotate(-60deg) scale(0.5); opacity: 0; }
      50% { transform: translateX(0) rotate(15deg) scale(1.2); opacity: 1; }
      100% { transform: translateX(50px) rotate(30deg) scale(0.8); opacity: 0; }
    }
    @keyframes slashLeft {
      0% { transform: translateX(50px) rotate(60deg) scale(0.5); opacity: 0; }
      50% { transform: translateX(0) rotate(-15deg) scale(1.2); opacity: 1; }
      100% { transform: translateX(-50px) rotate(-30deg) scale(0.8); opacity: 0; }
    }

    /* Spirit Tablet Glass Panel - Enhanced */
    .spirit-tablet {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 2px solid rgba(245, 158, 11, 0.2);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 60px rgba(168, 85, 247, 0.15),
        0 0 120px rgba(245, 158, 11, 0.1);
      transition: all 0.3s ease;
    }
    .spirit-tablet:hover {
      border-color: rgba(245, 158, 11, 0.3);
      box-shadow: 
        0 12px 40px rgba(0, 0, 0, 0.7),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        0 0 80px rgba(168, 85, 247, 0.2),
        0 0 150px rgba(245, 158, 11, 0.15);
    }
    /* Mobile: reduce backdrop blur and simplify shadows */
    @media (max-width: 640px) {
      .spirit-tablet {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      }
      .spirit-tablet:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      }
    }

    .spirit-tablet-jade {
      background: rgba(15, 35, 42, 0.75);
      border: 1px solid rgba(6, 182, 212, 0.2);
      box-shadow: 
        0 4px 30px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(6, 182, 212, 0.1),
        0 0 30px rgba(6, 182, 212, 0.08);
    }

    /* Golden Text Gradient */
    .text-gold {
      background: linear-gradient(to bottom, #fcd34d, #d97706);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Jade Text */
    .text-jade {
      background: linear-gradient(to bottom, #67e8f9, #0891b2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Yin Yang Spinner */
    .yinyang-container {
      position: relative;
      width: 180px; height: 180px;
      display: flex; justify-content: center; align-items: center;
    }
    .yinyang-glow {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 100%; height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%);
      animation: pulseGlow 3s infinite;
      will-change: transform, opacity;
    }
    
    .yinyang {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      position: relative;
      animation: spin 12s linear infinite;
      box-shadow: 0 0 15px rgba(255,255,255,0.1);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.3s, filter 0.3s;
      z-index: 10;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
      will-change: transform;
    }
    .yinyang:active { transform: scale(0.95); }
    .yinyang:hover { 
      box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); 
      filter: brightness(1.1) drop-shadow(0 0 10px rgba(168, 85, 247, 0.6));
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes pulseGlow {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
      50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
    }
    /* Mobile: optimize yinyang */
    @media (max-width: 640px) {
      .yinyang-container {
        width: 140px;
        height: 140px;
      }
      .yinyang {
        width: 120px;
        height: 120px;
        animation-duration: 20s;
      }
      .yinyang-glow {
        animation: none;
        opacity: 0.3;
      }
      .yinyang:hover {
        box-shadow: none;
        filter: none;
      }
    }

    /* Floating Particle */
    .particle {
      position: fixed;
      pointer-events: none;
      animation: floatUp 2s cubic-bezier(0, 0.55, 0.45, 1) forwards;
      font-weight: 700;
      text-shadow: 0 0 10px currentColor;
      z-index: 100;
    }
    @keyframes floatUp {
      0% { opacity: 0; transform: translateY(0) scale(0.5); }
      20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
      100% { opacity: 0; transform: translateY(-100px) scale(1); }
    }

    /* Shake Animation for Breakthrough */
    .shake {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
    }
    @keyframes shake {
      10%, 90% { transform: translate3d(-4px, 0, 0); }
      20%, 80% { transform: translate3d(8px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-16px, 0, 0); }
      40%, 60% { transform: translate3d(16px, 0, 0); }
    }

    /* Progress Bar Shimmer */
    @keyframes shimmer {
      100% { transform: translateX(200%); }
    }

    /* Floating Qi Particles */
    .qi-particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.8), transparent);
      border-radius: 50%;
      pointer-events: none;
      animation: floatQi 8s infinite ease-in-out;
      will-change: transform, opacity;
    }
    @keyframes floatQi {
      0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
      10% { opacity: 1; }
      50% { transform: translate(20px, -30px) scale(1); opacity: 0.8; }
      100% { transform: translate(40px, -60px) scale(0.3); opacity: 0; }
    }
    /* Mobile: hide qi particles */
    @media (max-width: 640px) {
      .qi-particle {
        display: none;
      }
    }

    /* Realm Name Glow Animation */
    @keyframes realmGlow {
      0%, 100% { text-shadow: 0 0 10px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.3); }
      50% { text-shadow: 0 0 20px rgba(245, 158, 11, 0.8), 0 0 40px rgba(245, 158, 11, 0.5), 0 0 60px rgba(168, 85, 247, 0.3); }
    }
    .realm-name-glow {
      animation: realmGlow 3s ease-in-out infinite;
    }
    /* Mobile: disable realm glow animation */
    @media (max-width: 640px) {
      .realm-name-glow {
        animation: none;
        text-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
      }
    }

    /* Floating Chinese Characters */
    .floating-char {
      position: absolute;
      font-family: 'Noto Serif SC', serif;
      font-size: 14px;
      color: rgba(245, 158, 11, 0.3);
      pointer-events: none;
      animation: floatChar 15s infinite ease-in-out;
      will-change: transform, opacity;
    }
    @keyframes floatChar {
      0% { transform: translateY(0) rotate(0deg); opacity: 0; }
      10% { opacity: 0.5; }
      50% { transform: translateY(-30px) rotate(180deg); opacity: 0.8; }
      100% { transform: translateY(-60px) rotate(360deg); opacity: 0; }
    }
    /* Mobile: hide floating characters */
    @media (max-width: 640px) {
      .floating-char {
        display: none;
      }
    }

    /* Cloud Decoration */
    .cloud-decoration {
      position: absolute;
      width: 100px;
      height: 40px;
      background: radial-gradient(ellipse, rgba(245, 158, 11, 0.1), transparent);
      border-radius: 50px;
      filter: blur(20px);
      animation: floatCloud 20s infinite ease-in-out;
      pointer-events: none;
      will-change: transform, opacity;
    }
    @keyframes floatCloud {
      0%, 100% { transform: translateX(0) scale(1); opacity: 0.3; }
      50% { transform: translateX(30px) scale(1.2); opacity: 0.6; }
    }
    /* Mobile: hide cloud decorations */
    @media (max-width: 640px) {
      .cloud-decoration {
        display: none;
      }
    }

    /* Qi Flow Animation */
    @keyframes qiFlow {
      0% { transform: translateX(-100%) translateY(0); opacity: 0; }
      50% { opacity: 0.6; }
      100% { transform: translateX(100%) translateY(-20px); opacity: 0; }
    }
    .qi-flow {
      position: absolute;
      width: 2px;
      height: 60px;
      background: linear-gradient(to bottom, transparent, rgba(245, 158, 11, 0.4), transparent);
      animation: qiFlow 4s infinite;
      pointer-events: none;
      will-change: transform, opacity;
    }
    /* Mobile: hide qi flow */
    @media (max-width: 640px) {
      .qi-flow {
        display: none;
      }
    }

    /* Scrollbar Styling */
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(168, 85, 247, 0.4);
      border-radius: 2px;
    }

    /* Decorative Corner */
    .spirit-corner {
      position: absolute;
      width: 40px;
      height: 40px;
      pointer-events: none;
    }
    .spirit-corner-tl { top: 0; left: 0; border-top: 2px solid; border-left: 2px solid; border-radius: 8px 0 0 0; }
    .spirit-corner-tr { top: 0; right: 0; border-top: 2px solid; border-right: 2px solid; border-radius: 0 8px 0 0; }
    .spirit-corner-bl { bottom: 0; left: 0; border-bottom: 2px solid; border-left: 2px solid; border-radius: 0 0 0 8px; }
    .spirit-corner-br { bottom: 0; right: 0; border-bottom: 2px solid; border-right: 2px solid; border-radius: 0 0 8px 0; }
  `}</style>
);

export default CustomStyles;

