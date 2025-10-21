// src/components/ARScanner.jsx
import React, { useEffect, useRef, useState } from 'react';

const ARScanner = () => {
    const sceneRef = useRef(null);
    const [overlayVisible, setOverlayVisible] = useState(false);

    // cek apakah device mobile
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // paths
    const patternUrl = `${process.env.PUBLIC_URL}/pola.patt`;
    const modelUrl = `${process.env.PUBLIC_URL}/ekosistem.glb`;

    useEffect(() => {
        if (!isMobile) return;

        const tryFixMobileVideo = () => {
            const video = document.querySelector('.ar-container video');
            const canvas = document.querySelector('.ar-container canvas');

            if (video) {
                video.style.objectFit = 'contain';
                video.style.objectPosition = 'center center';
                video.style.transform = 'none';
                video.style.top = '0';
                video.style.left = '0';
            }
            if (canvas) {
                canvas.style.objectFit = 'contain';
                canvas.style.objectPosition = 'center center';
                canvas.style.transform = 'none';
                canvas.style.top = '0';
                canvas.style.left = '0';
            }

            if (video || canvas) setOverlayVisible(true);
        };

        // jalankan beberapa kali untuk pastikan stable
        const interval = setInterval(tryFixMobileVideo, 300);
        const timeout = setTimeout(() => {
            clearInterval(interval);
            tryFixMobileVideo(); // final patch
        }, 1500);

        window.addEventListener('orientationchange', tryFixMobileVideo);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
            window.removeEventListener('orientationchange', tryFixMobileVideo);
        };
    }, [isMobile]);

    // AR.js settings khusus mobile
    const arjsSettings = isMobile
        ? `sourceType: webcam; sourceWidth: 1280; sourceHeight: 720; displayWidth: ${window.innerWidth}; displayHeight: ${window.innerHeight}; cameraParametersUrl: ${process.env.PUBLIC_URL}/data/camera_para.dat; trackingMethod: best; debugUIEnabled: false;`
        : '';

    return (
        <div className="ar-container" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            {/* overlay kotak scan */}
            <div
                className={`scanner-frame ${overlayVisible ? 'visible' : ''}`}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 280,
                    height: 280,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: 12,
                    boxSizing: 'border-box',
                    zIndex: 9999,
                    background: 'rgba(0,0,0,0.08)',
                    border: '2px dashed rgba(255,255,255,0.25)',
                    pointerEvents: 'none',
                    opacity: overlayVisible ? 1 : 0,
                    transition: 'opacity 250ms ease',
                }}
            >
                <div style={{ position: 'absolute', width: 32, height: 32, border: '4px solid #00ffcc', borderRight: 'none', borderBottom: 'none', top: -2, left: -2 }}></div>
                <div style={{ position: 'absolute', width: 32, height: 32, border: '4px solid #00ffcc', borderLeft: 'none', borderBottom: 'none', top: -2, right: -2 }}></div>
                <div style={{ position: 'absolute', width: 32, height: 32, border: '4px solid #00ffcc', borderRight: 'none', borderTop: 'none', bottom: -2, left: -2 }}></div>
                <div style={{ position: 'absolute', width: 32, height: 32, border: '4px solid #00ffcc', borderLeft: 'none', borderTop: 'none', bottom: -2, right: -2 }}></div>
                <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 3, background: 'linear-gradient(to right, transparent, #00ffcc, transparent)', animation: 'scan 2.5s linear infinite' }}></div>
            </div>

            {/* scene AR.js */}
            <a-scene
                ref={sceneRef}
                embedded
                arjs={arjsSettings}
                vr-mode-ui="enabled: false"
                renderer="logarithmicDepthBuffer: true;"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }}
            >
                <a-marker type="pattern" url={patternUrl}>
                    <a-entity gltf-model={modelUrl} scale="0.1 0.1 0.1" rotation="-90 0 0" position="0 0.5 0"></a-entity>
                </a-marker>
                <a-camera fov="95"></a-camera>
            </a-scene>

            {/* keyframes scan */}
            <style>{`
        @keyframes scan { 0% { top: 0% } 100% { top: 100% } }
      `}</style>
        </div>
    );
};

export default ARScanner;
