// Lokasi File: src/components/ARScanner.jsx
import React from 'react';

const ARScanner = () => {
    // CSS styles untuk overlay dan animasi.
    const styles = `
        body { margin: 0; overflow: hidden; }
        .ar-container { position: relative; width: 100vw; height: 100vh; }
        .scanner-frame {
            position: absolute; top: 50%; left: 50%; width: 280px; height: 280px;
            transform: translate(-50%, -50%); border-radius: 12px; box-sizing: border-box;
            z-index: 20; background: rgba(0, 0, 0, 0.1); backdrop-filter: blur(2px);
            border: 2px dashed rgba(255, 255, 255, 0.25);
        }
        .corner {
            position: absolute; width: 32px; height: 32px;
            border: 4px solid #00ffcc; border-radius: 4px;
        }
        .corner.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
        .corner.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
        .corner.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
        .corner.br { bottom: -2px; right: -2px; border-left: none; border-top: none; }
        .scan-line {
            position: absolute; left: 0; top: 0; width: 100%; height: 3px;
            background: linear-gradient(to right, transparent, #00ffcc, transparent);
            animation: scan 2.5s linear infinite;
        }
        @keyframes scan {
            0% { top: 0%; }
            100% { top: 100%; }
        }
    `;

    // Membuat URL yang benar untuk aset di folder public
    const patternUrl = `${process.env.PUBLIC_URL}/pola.patt`;
    const modelUrl = `url(${process.env.PUBLIC_URL}/ekosistem.glb)`;

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
                arjs="sourceType: webcam; debugUIEnabled: false;"
                vr-mode-ui="enabled: false"
                renderer="logarithmicDepthBuffer: true;"
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
            >
                {/* Menggunakan URL yang sudah dibuat */}
                <a-marker type="pattern" url={patternUrl}>
                    <a-entity
                        gltf-model={modelUrl}
                        scale="0.1 0.1 0.1"
                        rotation="-90 0 0"
                        position="0 0.5 0"
                    ></a-entity>
                </a-marker>
                <a-camera fov="80"></a-camera>
            </a-scene>
        </div>
    );
};

export default ARScanner;