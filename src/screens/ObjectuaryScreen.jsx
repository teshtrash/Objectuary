import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { generateTombs } from '../data/tombs'
import { GRAVE_BG, OBJECTUARY_ICON, SCANNER_ON, SCANNER } from '../assets'
import { useAttention } from '../hooks/useAttention'
import { useAudio } from '../hooks/useAudio'
import {
  AMBIENT_SOUNDTRACK, ZOOM_IN, ZOOM_OUT, GRAVE_HOVER, CLICK, GENERIC_CLICK,
  SCANNER_HOVERING, PAPER_HOVERING, SCANNER_LOOP, SCANNING_DONE,
  RESULT_SOUNDS,
} from '../audio'
import './ObjectuaryScreen.css'

const ZOOM_SCALE = 2.5

const RESULT_DATA = {
  preserved: {
    label: 'Preserved',
    tagline: 'Image is taken for aesthetic purposes',
    description: 'The object is kept intact \u2014 displayed, admired, catalogued. Its context is stripped but its form survives. A beautiful cage. The story behind it is replaced by the story the institution chooses to tell.',
  },
  cremated: {
    label: 'Cremated',
    tagline: 'presence is vanished',
    description: 'Complete erasure. The object, its story, and the people it represented are consumed. Nothing remains \u2014 not even the gap. The absence itself has been made absent.',
  },
  burial: {
    label: 'Buried',
    tagline: 'Essence of it is left in a form of a symbol',
    description: 'The object is reduced to a symbol \u2014 a stamp, a shorthand, a footnote. It exists only as reference. The weight is gone. What survives is the shape of meaning without the substance of presence.',
  },
  'organ-donation': {
    label: 'Organ Donated',
    tagline: 'Only the useful parts are taken',
    description: 'The object is selectively harvested. Useful fragments \u2014 a date, a material, a decorative pattern \u2014 are extracted for academic papers, museum labels, gift shop reproductions. The rest is discarded.',
  },
}

function getTombWidth(tomb, views) {
  const base = tomb.isPalanquin ? 88 : 80
  const clicks = views[String(tomb.id)] || 0
  // Each click adds 8% width, up to 160% max growth
  return base * (1 + Math.min(clicks * 0.08, 1.6))
}

export default function ObjectuaryScreen({ onSelect, onHome, disableInteraction = false, revealing = false }) {
  const mapRef = useRef(null)
  const [zoomed, setZoomed] = useState(false)
  const [selectedTomb, setSelectedTomb] = useState(null)
  const [showPaper, setShowPaper] = useState(false)
  const { views: tombViews, increment: incrementAttention } = useAttention()
  const [attentionPopups, setAttentionPopups] = useState([])
  const [tombs] = useState(() => generateTombs())
  const [tombOffsets, setTombOffsets] = useState(() =>
    Object.fromEntries(tombs.map(t => [t.id, { dx: 0, dy: 0 }]))
  )
  const { play, loop, stop } = useAudio()
  const readyRef = useRef(false)
  const hasRevealedRef = useRef(false)
  const disabledRef = useRef(disableInteraction)
  const paperRef = useRef(null)
  const hoverRef = useRef(null)
  const zoomingRef = useRef(false)

  // Map drag state
  const isDraggingMap = useRef(false)
  const hasDraggedMap = useRef(false)
  const lastMapDragCoords = useRef({ x: 0, y: 0 })
  const mapTranslate = useRef({ x: 0, y: 0 })

  // Scanner state
  const [scanResult, setScanResult] = useState(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanComplete, setScanComplete] = useState(false)
  const [dragging, setDragging] = useState(false)
  const scannerContainerRef = useRef(null)
  const scannerDeviceRef = useRef(null)
  const hintAnimRef = useRef(null)
  const dragStartYRef = useRef(0)
  const scannerStartYRef = useRef(0)

  useEffect(() => {
    disabledRef.current = disableInteraction
  }, [disableInteraction])

  useEffect(() => {
    if (!disableInteraction) {
      if (mapRef.current) {
        gsap.set(mapRef.current.querySelectorAll('.tomb'), { opacity: 0.85 })
      }
      hasRevealedRef.current = true
      setTimeout(() => { readyRef.current = true }, 300)
    }
  }, [disableInteraction])

  useEffect(() => {
    if (revealing && !hasRevealedRef.current && mapRef.current) {
      hasRevealedRef.current = true
      gsap.to(mapRef.current.querySelectorAll('.tomb'), {
        opacity: 0.85, duration: 0.6, ease: 'power1.out',
      })
    }
  }, [revealing])

  // Animate hovering view in
  useEffect(() => {
    if (selectedTomb && hoverRef.current) {
      gsap.fromTo(hoverRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      )
    }
  }, [selectedTomb])

  // Animate paper in + use tomb's predetermined result
  useEffect(() => {
    if (showPaper && paperRef.current) {
      gsap.fromTo(paperRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }
      )
      setScanResult(selectedTomb.scanResult)
      setScanProgress(0)
      setScanComplete(false)

      // Kill any previous hint
      if (hintAnimRef.current) hintAnimRef.current.kill()

      // Start looping hint animation after initial delay
      const timerId = setTimeout(() => {
        const scannerEl = scannerDeviceRef.current
        if (!scannerEl) return
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2, defaults: {} })
          .to(scannerEl, { y: 65, duration: 0.55, ease: 'power2.inOut' })
          .to(scannerEl, { y: 0, duration: 0.45, ease: 'back.out(2)' })
          .to(scannerEl, { y: 30, duration: 0.38, ease: 'power2.inOut', delay: 0.1 })
          .to(scannerEl, { y: 0, duration: 0.32, ease: 'back.out(2)' })
        hintAnimRef.current = tl
      }, 800)

      return () => clearTimeout(timerId)
    } else {
      // Paper closed — kill hint
      if (hintAnimRef.current) {
        hintAnimRef.current.kill()
        hintAnimRef.current = null
      }
    }
  }, [showPaper, selectedTomb])

  // Repulsion — push tombs apart when neighbours grow
  useEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pos = tombs.map(tomb => ({
      x: tomb.x * vw / 100,
      y: tomb.y * vh / 100,
    }))
    const widths = tombs.map(tomb => getTombWidth(tomb, tombViews))
    const HR = 0.95 // increased height-to-width ratio for better vertical clearing
    for (let iter = 0; iter < 50; iter++) { // Increased iterations
      for (let i = 0; i < tombs.length; i++) {
        for (let j = i + 1; j < tombs.length; j++) {
          const dx = pos[j].x - pos[i].x
          const dy = pos[j].y - pos[i].y
          // Increased base padding and added dynamic padding based on size
          const dynamicPadding = Math.max(widths[i], widths[j]) * 0.15 + 20
          const minX = (widths[i] + widths[j]) / 2 + dynamicPadding
          const minY = (widths[i] * HR + widths[j] * HR) / 2 + dynamicPadding
          const ox = minX - Math.abs(dx)
          const oy = minY - Math.abs(dy)
          if (ox > 0 && oy > 0) {
            const ci = tombViews[tombs[i].id] || 0
            const cj = tombViews[tombs[j].id] || 0
            const total = ci + cj
            const ri = total > 0 ? cj / total : 0.5
            const rj = 1 - ri
            if (ox < oy) {
              const dir = Math.sign(dx) || 1
              pos[i].x -= ox * 0.8 * ri * dir // Increased repulsion strength
              pos[j].x += ox * 0.8 * rj * dir
            } else {
              const dir = Math.sign(dy) || 1
              pos[i].y -= oy * 0.8 * ri * dir
              pos[j].y += oy * 0.8 * rj * dir
            }
          }
        }
      }
      
      const paddingX = vw * 0.15
      const paddingY = vh * 0.15
      for (let i = 0; i < tombs.length; i++) {
        if (pos[i].x < paddingX) pos[i].x += (paddingX - pos[i].x) * 0.5
        if (pos[i].x > vw - paddingX) pos[i].x -= (pos[i].x - (vw - paddingX)) * 0.5
        if (pos[i].y < paddingY) pos[i].y += (paddingY - pos[i].y) * 0.5
        if (pos[i].y > vh - paddingY) pos[i].y -= (pos[i].y - (vh - paddingY)) * 0.5
      }
    }
    setTombOffsets(
      Object.fromEntries(tombs.map((tomb, i) => [
        tomb.id,
        { dx: pos[i].x / vw * 100 - tomb.x, dy: pos[i].y / vh * 100 - tomb.y },
      ]))
    )
  }, [tombViews, tombs])

  // Scroll wheel down to zoom out
  useEffect(() => {
    const handleWheel = (e) => {
      if (!zoomed || selectedTomb || showPaper || zoomingRef.current) return
      if (e.deltaY > 0) {
        e.preventDefault()
        zoomingRef.current = true
        play(ZOOM_OUT, { volume: 0.5 })
        gsap.to(mapRef.current, {
          scale: 1,
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          onComplete: () => {
            mapRef.current.classList.remove('cemetery-map--zoomed')
            setZoomed(false)
            zoomingRef.current = false
          },
        })
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [zoomed, selectedTomb, showPaper])

  // Pinch-to-zoom-out gesture
  useEffect(() => {
    let initialDistance = null

    const getDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX
      const dy = t1.clientY - t2.clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const handleTouchStart = (e) => {
      if (!zoomed || selectedTomb || showPaper || zoomingRef.current) return
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches[0], e.touches[1])
      }
    }

    const handleTouchMove = (e) => {
      if (!zoomed || selectedTomb || showPaper || zoomingRef.current) return
      if (e.touches.length === 2 && initialDistance !== null) {
        e.preventDefault()
        const currentDistance = getDistance(e.touches[0], e.touches[1])
        if (initialDistance - currentDistance > 50) {
          initialDistance = null
          zoomingRef.current = true
          gsap.to(mapRef.current, {
            scale: 1,
            x: 0,
            y: 0,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
              mapRef.current.classList.remove('cemetery-map--zoomed')
              setZoomed(false)
              zoomingRef.current = false
            },
          })
        }
      }
    }

    const handleTouchEnd = () => {
      initialDistance = null
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [zoomed, selectedTomb, showPaper])

  const handleZoomIn = useCallback((e) => {
    if (zoomed || !readyRef.current || disabledRef.current || zoomingRef.current) return
    const clickX = (e.clientX / window.innerWidth) * 100
    const clickY = (e.clientY / window.innerHeight) * 100
    mapRef.current.classList.add('cemetery-map--zoomed')
    zoomingRef.current = true
    play(ZOOM_IN, { volume: 0.5 })
    mapTranslate.current = { x: 0, y: 0 }
    gsap.to(mapRef.current, {
      scale: ZOOM_SCALE,
      x: 0,
      y: 0,
      transformOrigin: `${clickX}% ${clickY}%`,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        setZoomed(true)
        zoomingRef.current = false
      },
    })
  }, [zoomed])

  const handleMapPointerDown = useCallback((e) => {
    if (!zoomed || selectedTomb || showPaper || zoomingRef.current) return
    isDraggingMap.current = true
    hasDraggedMap.current = false
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    lastMapDragCoords.current = { x: clientX, y: clientY }
  }, [zoomed, selectedTomb, showPaper])

  useEffect(() => {
    if (!zoomed) return
    const handleMove = (e) => {
      if (!isDraggingMap.current || selectedTomb || showPaper) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const deltaX = clientX - lastMapDragCoords.current.x
      const deltaY = clientY - lastMapDragCoords.current.y

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasDraggedMap.current = true
      }

      lastMapDragCoords.current = { x: clientX, y: clientY }
      mapTranslate.current.x += deltaX
      mapTranslate.current.y += deltaY

      gsap.set(mapRef.current, { x: mapTranslate.current.x, y: mapTranslate.current.y })
    }
    const handleUp = () => {
      isDraggingMap.current = false
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [zoomed, selectedTomb, showPaper])

  // Click tomb: increment attention via API, show +1 animation, then open hovering view
  const handleTombClick = useCallback((e, tomb) => {
    e.stopPropagation()
    if (hasDraggedMap.current) return // Prevent click if user was dragging map
    play(GRAVE_HOVER)

    // "+1 Attention" popup animation
    const tombEl = e.currentTarget
    const popupId = Date.now()
    const rect = tombEl.getBoundingClientRect()
    setAttentionPopups((prev) => [
      ...prev,
      { id: popupId, x: rect.left + rect.width / 2, y: rect.top },
    ])

    // Satisfying poppy click animation on the inner image to avoid CSS CSS transition conflicts
    const imgEl = tombEl.querySelector('img')
    if (imgEl) {
      gsap.timeline()
        .to(imgEl, { scale: 0.85, duration: 0.08, ease: 'power2.in' })
        .to(imgEl, { scale: 1.15, duration: 0.25, ease: 'back.out(3)' })
        .to(imgEl, { scale: 1, duration: 0.15, ease: 'power2.out', clearProps: 'scale' })
    }

    // Remove popup after animation
    setTimeout(() => {
      setAttentionPopups((prev) => prev.filter((p) => p.id !== popupId))
    }, 1400)

    // Fire API call immediately — state will update and tomb width re-renders
    incrementAttention(String(tomb.id))

    // Delay before opening the hovering view so the +1 animation + growth are visible
    setTimeout(() => {
      setSelectedTomb(tomb)
    }, 800)
  }, [incrementAttention, play])

  const handleBackFromHover = useCallback((e) => {
    e.stopPropagation()
    play(GENERIC_CLICK)
    if (hoverRef.current) {
      gsap.to(hoverRef.current, {
        opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => setSelectedTomb(null),
      })
    }
  }, [play])

  const handleOpenPaper = useCallback((e) => {
    e.stopPropagation()
    play(SCANNER_HOVERING)
    setShowPaper(true)
  }, [play])

  const handleClosePaper = useCallback((e) => {
    e.stopPropagation()
    if (scanComplete) return
    play(GENERIC_CLICK)
    play(PAPER_HOVERING)
    if (paperRef.current) {
      gsap.to(paperRef.current, {
        scale: 0.8, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => setShowPaper(false),
      })
    }
  }, [scanComplete])

  // Return to cemetery from scan result
  const handleReturnToCemetery = useCallback(() => {
    play(CLICK)
    setShowPaper(false)
    setSelectedTomb(null)
    setScanComplete(false)
    setScanProgress(0)
    setScanResult(null)
  }, [play])

  // Scanner drag handlers (vertical, bidirectional)
  const updateScanProgress = useCallback((clientY) => {
    const container = scannerContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const scannerH = 80
    const maxTravel = rect.height - scannerH
    const deltaY = clientY - dragStartYRef.current
    const newTop = Math.max(0, Math.min(maxTravel, scannerStartYRef.current + deltaY))
    const progress = Math.round((newTop / maxTravel) * 100)
    setScanProgress(progress)
    return newTop
  }, [])

  const handleScanPointerDown = useCallback((e) => {
    if (scanComplete) return
    e.preventDefault()
    e.stopPropagation()
    // Kill the hint animation the moment the user grabs the scanner
    if (hintAnimRef.current) {
      hintAnimRef.current.kill()
      hintAnimRef.current = null
      // Snap scanner back to y:0 so drag starts cleanly
      if (scannerDeviceRef.current) gsap.set(scannerDeviceRef.current, { y: 0 })
    }
    loop(SCANNER_LOOP, { volume: 0.4 })
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragStartYRef.current = clientY
    const scanner = e.currentTarget
    scannerStartYRef.current = parseInt(scanner.style.top || '0', 10) || 0
    setDragging(true)
  }, [scanComplete])

  useEffect(() => {
    if (!dragging) return

    const handleMove = (e) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const newTop = updateScanProgress(clientY)
      const scannerEl = scannerContainerRef.current?.querySelector('.scanner-device')
      if (scannerEl) scannerEl.style.top = `${newTop}px`
    }

    const handleUp = () => {
      setDragging(false)
      stop(SCANNER_LOOP)
      if (scanProgress >= 95) {
        setScanProgress(100)
        setScanComplete(true)
        play(SCANNING_DONE)
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [dragging, updateScanProgress, scanProgress])

  const resultData = scanResult ? RESULT_DATA[scanResult] : null

  return (
    <div
      className={`screen objectuary-screen ${zoomed ? 'objectuary-screen--zoomed' : ''}`}
      style={{ pointerEvents: disableInteraction ? 'none' : 'auto' }}
      onMouseDown={zoomed ? handleMapPointerDown : undefined}
      onTouchStart={zoomed ? handleMapPointerDown : undefined}
      onClick={!zoomed ? handleZoomIn : undefined}
    >
      <div className="cemetery-map" ref={mapRef}>
        {tombs.map((tomb, i) => {
          const w = getTombWidth(tomb, tombViews)
          const clicks = tombViews[String(tomb.id)] || 0
          const off = tombOffsets[tomb.id] || { dx: 0, dy: 0 }
          const shakeDelay = ((i * 2.7 + 1.3) % 5).toFixed(1)
          const shakeDuration = (2 + (i % 3) * 0.8).toFixed(1)
          return (
            <div
              key={tomb.id}
              className={`tomb ${tomb.isPalanquin ? 'tomb--palanquin' : ''} tomb--shaking`}
              style={{
                left: `${tomb.x + off.dx}%`,
                top: `${tomb.y + off.dy}%`,
                width: `${w}px`,
                transform: `translate(-50%, -50%) rotate(${tomb.rotation}deg)`,
                '--tomb-rot': `${tomb.rotation}deg`,
                '--shake-delay': `${shakeDelay}s`,
                '--shake-duration': `${shakeDuration}s`,
                zIndex: clicks > 0 ? 5 + Math.min(clicks, 25) : 'auto',

              }}
              onClick={zoomed && !selectedTomb ? (e) => handleTombClick(e, tomb) : undefined}
            >
              <img
                src={tomb.image}
                alt={tomb.content.title}
              />
            </div>
          )
        })}
      </div>

      {/* Hovering view: large tomb + objectuary doc icon */}
      {selectedTomb && !showPaper && (
        <div className="hover-backdrop" ref={hoverRef} style={{ backgroundImage: `url('${GRAVE_BG}')` }}>
          <div className="hover-tomb-container">
            <img
              className="hover-tomb-img"
              src={selectedTomb.image}
              alt={selectedTomb.content.title}
            />
            <div className="hover-objectuary-doc" onClick={handleOpenPaper}>
              <img src={OBJECTUARY_ICON} alt="Objectuary" className="hover-doc-img" />
              <span className="hover-doc-label">OBJECTUARY</span>
            </div>
          </div>

          <button className="hover-back-btn" onClick={handleBackFromHover}>
            &#8592;
          </button>
        </div>
      )}

      {/* Paper overlay with scanner */}
      {showPaper && selectedTomb && (<>
        <div className="paper-backdrop" onClick={handleClosePaper} style={{ backgroundImage: `url('${GRAVE_BG}')` }}>
          <img
            className="paper-backdrop-tomb"
            src={selectedTomb.image}
            alt=""
          />
          <div className="paper-container" ref={paperRef} onClick={(e) => e.stopPropagation()}>
            {/* Custom hand-designed objectuary paper per tomb */}
            <img src={selectedTomb.paperImage} alt="" className="paper-bg" style={{ opacity: 1 - scanProgress / 100 }} />

            {/* Close button */}
            {!scanComplete && (
              <button className="paper-close" onClick={handleClosePaper}>{'\u00D7'}</button>
            )}

            {/* Scanner overlay — vertical */}
            <div className="scanner-overlay" ref={scannerContainerRef}>
              {/* Static scan track (green bar) */}
              {!scanComplete && (
                <div className="scan-track" />
              )}

              {/* Scanner device — starts at top, drag down */}
              {!scanComplete && (
                <div
                  ref={scannerDeviceRef}
                  className="scanner-device"
                  style={{ top: 0 }}
                  onMouseDown={handleScanPointerDown}
                  onTouchStart={handleScanPointerDown}
                >
                  <img src={SCANNER} alt="Scanner" />
                  {/* Drag hint text */}
                  {scanProgress === 0 && (
                    <span className="scanner-drag-hint">drag scanner<br />down to scan</span>
                  )}
                </div>
              )}

              {/* Result image — fades in with progress, replaces paper when complete */}
              {scanResult && scanProgress > 0 && (
                <div
                  className={`scan-result-overlay${scanComplete ? ' scan-result--complete' : ''}`}
                  style={{ opacity: scanProgress / 100 }}
                >
                  <img
                    className="scan-result-img"
                    src={selectedTomb.scannedImage}
                    alt={resultData?.label || ''}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Return button lives OUTSIDE the paper so it doesn't obscure content */}
        {scanComplete && (
          <button className="scan-return-btn" onClick={handleReturnToCemetery}>
            {'\u2190'} return to the objectuary
          </button>
        )}
      </>)}

      {/* Home Button */}
      {!selectedTomb && !showPaper && (
        <button className="home-btn" onClick={() => { play(GENERIC_CLICK); onHome(); }} title="Return to Home">
          Home
        </button>
      )}

      {zoomed && !selectedTomb && (
        <button className="zoom-out-btn" onClick={(e) => { e.stopPropagation(); play(GENERIC_CLICK); zoomingRef.current = true; gsap.to(mapRef.current, { scale: 1, x: 0, y: 0, duration: 0.6, ease: 'power2.inOut', onComplete: () => { mapRef.current.classList.remove('cemetery-map--zoomed'); setZoomed(false); zoomingRef.current = false } }) }}>
          zoom out
        </button>
      )}

      {!selectedTomb && !showPaper && (
        <p className="objectuary-hint">
          {zoomed ? 'click a tomb to examine \u00B7 scroll down or pinch to zoom out' : 'click anywhere to zoom in'}
        </p>
      )}

      {/* +1 Attention popups */}
      {attentionPopups.map((popup) => (
        <span
          key={popup.id}
          className="attention-popup"
          style={{ left: popup.x, top: popup.y }}
        >
          +1 Attention
        </span>
      ))}
    </div>
  )
}
