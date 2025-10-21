// Lokasi File: src/components/ARScanner.jsx
import React, { useMemo } from 'react';

const ARScanner = () => {
    const styles = `
    /* jangan reset body di sini (biarkan app mengatur body) */
    .ar-container { position: relative; width: 100%; height: 100vh; overflow: hidden; }
    .scanner-frame {
      position: absolute;
      top: 50%; left: 50%;
      width: 280px; height: 280px;
      transform: translate(-50%, -50%);
      border-radius: 12px; box-sizing: border-box;
      z-index: 9999; background: rgba(0,0,0,0.08); backdrop-filter: blur(2px);
      border: 2px dashed rgba(255,255,255,0.25);
      pointer-events: none; /* supaya tidak mengganggu video autoplay/click */
    }
    .corner { position: absolute; width: 32px; height: 32px; border: 4px solid #00ffcc; border-radius: 4px; }
    .corner.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
    .corner.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
    .corner.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
    .corner.br { bottom: -2px; right: -2px; border-left: none; border-top: none; }
    .scan-line { position: absolute; left:0; top:0; width:100%; height:3px;
      background: linear-gradient(to right, transparent, #00ffcc, transparent);
      animation: scan 2.5s linear infinite;
    }
    @keyframes scan { 0% { top: 0% } 100% { top: 100% } }

    /* Pastikan canvas/video A-Frame menyesuaikan ukuran container, hindari crop tak terduga */
    .ar-container a-scene, .ar-container a-scene .a-canvas, .ar-container canvas {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover; /* atau contain jika mau seluruh frame tampak */
      z-index: 5;
    }
  `;

    // Pastikan file pola.patt & ekosistem.glb ada di folder public
    const patternUrl = `${process.env.PUBLIC_URL || ''}/pola.patt`;
    const modelUrl = `${process.env.PUBLIC_URL || ''}/ekosistem.glb`;

    // Build pengaturan arjs dengan ukuran sumber yang lebih besar — mengurangi efek "zoom"
    const arjsSettings = useMemo(() => {
        const displayWidth = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 640;
        const displayHeight = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 480;
        // sourceWidth/sourceHeight = resolution yang di-capture (lebih besar -> kurang crop)
        return `sourceType: webcam; sourceWidth: 1280; sourceHeight: 720; displayWidth: ${displayWidth}; displayHeight: ${displayHeight}; debugUIEnabled: false;`;
    }, []);

    return (
        <div className="ar-container">
            <style>{styles}</style>

            <div className="scanner-frame">
                <div className="corner tl"></div>
                <div className="corner tr"></div>
                <div className="corner bl"></div>
                <div className="corner br"></div>
                <div className="scan-line"></div>
            </div>

            <a-scene
                embedded
                /* pass string settings yang sudah dibuat */
                arjs={arjsSettings}
                vr-mode-ui="enabled: false"
                renderer="logarithmicDepthBuffer: true;"
                /* style penting untuk memastikan scene tidak memaksa fullscreen di luar container */
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }}
            >
                <a-marker type="pattern" url={patternUrl}>
                    <a-entity
                        gltf-model={modelUrl}
                        scale="0.1 0.1 0.1"
                        rotation="-90 0 0"
                        position="0 0.5 0"
                    ></a-entity>
                </a-marker>
                <a-camera fov="95"></a-camera>
            </a-scene>
        </div>
    );
};

export default ARScanner;
