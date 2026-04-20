import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import './OpeningScreen.css'

export default function OpeningScreen({ onEnter }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.8 })
    
    const items = containerRef.current.querySelectorAll('.critique-item')
    // Only animate position, not opacity — Framer Motion handles the fade
    items.forEach(el => { el.style.opacity = '1' })
    tl.from(items, {
      y: 25,
      stagger: 0.25,
      duration: 0.8,
      ease: 'power2.out',
    })
    .from('.enter-btn', {
      y: 15,
      duration: 0.6,
      ease: 'power2.out',
    }, '-=0.2')
  }, [])

  return (
    <motion.div
      className="screen opening-screen"
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="opening-content">
        <div className="critique-block">
          <p className="critique-item">
            <strong>Objectuary</strong><br />
            where objects go when they're no longer allowed to exist
          </p>
          <p className="critique-item" style={{ marginBottom: '1.5rem' }}>
            Some things don't just disappear — they get pushed out. Objects, like people, can be othered: replaced, repurposed, buried, or simply ignored until they stop mattering. This is a cemetery for those objects. Each grave holds a story of exclusion, displacement, or quiet erasure. You're here to read the obituaries.
          </p>
          <p className="critique-item">
            <strong>Explore the graveyard</strong><br />
            Walk through the map and find graves — each one is an object with a story
          </p>
          <p className="critique-item">
            <strong>Read the objectuary</strong><br />
            Click a grave to open its newspaper clipping — the life and disappearance of that object
          </p>
          <p className="critique-item">
            <strong>Run the forensics</strong><br />
            Unlock a scan showing what the object was made of, how it ended, and what came after
          </p>
        </div>

        <button className="enter-btn" onClick={onEnter}>
          Enter
        </button>
      </div>
    </motion.div>
  )
}
