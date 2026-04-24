import { tombImage, tombPaperImage, tombScannedImage, TOMB_COUNT } from '../assets'

// Shared tomb layout — used by both GateScreen and ObjectuaryScreen
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

// Content for each tomb
const PALANQUIN_CONTENT = {
  title: 'The Palanquin',
  subtitle: 'Dalada Perahera, Kandy — carried annually, date of displacement: origin unknown',
  body: [
    'The palanquin was built to carry someone. It has never carried anyone. It appears in the Dalada Perahera each year as a ceremonial object moving through the procession in place of the Alathi Ammala — women with hereditary ties to the Dalada Maligawa whose ritual role is acknowledged by the temple and whose bodies are not permitted in the public procession. The object goes where they cannot.',
    'It was not made as an exclusion. It was made as a solution. The institution recognised that women belonged in the ritual and found a way to include them that did not require letting them in. The palanquin holds their place so precisely that the place appears full.',
    'From the street, watching the procession pass, there is no visible gap. The gap has been given a shape and the shape has been given legs. What was given to the Alathi Ammala was a marker, not a presence.',
    'A symbol that moved through Kandy in full public view while the people it stood for remained out of sight. This is the particular character of the burial: it was performed with great ceremony, in their name, and they were not there to see it.',
    'The palanquin is still carried. The women are still absent. The procession continues to call this an honour.',
    'What remains is a moving tombstone — visible, admired, and unable to speak for itself. The women it represents have not been asked whether it speaks for them.',
  ],
}

const PLACEHOLDER_CONTENT = {
  title: 'Unknown Object',
  subtitle: 'Details pending excavation',
  body: [
    'This tomb awaits its story. The object buried here has not yet been identified, catalogued, or mourned.',
    'Check back as the objectuary grows.',
  ],
}

// Predetermined scan results — evenly distributed, palanquin is always 'cremated'
const SCAN_RESULTS = ['burial', 'cremated', 'organ-donation', 'preserved']

function generateTombs() {
  const rand = seededRandom(Date.now())

  // Step 1: generate all 20 grid slot positions + rotations
  const slots = []
  for (let i = 0; i < TOMB_COUNT; i++) {
    const col = i % 5
    const row = Math.floor(i / 5)
    const baseX = (col / 4) * 40 + 30
    const baseY = (row / 3) * 40 + 30
    slots.push({
      x: Math.max(5, Math.min(95, baseX + (rand() - 0.5) * 8)),
      y: Math.max(5, Math.min(95, baseY + (rand() - 0.5) * 8)),
      rotation: (rand() - 0.5) * 6,
    })
  }

  // Step 2: Fisher-Yates shuffle — so each tomb image lands in a random slot
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }

  // Step 3: assign tomb identity i to shuffled slot i
  const palanquinIdx = Math.floor(rand() * TOMB_COUNT)
  return Array.from({ length: TOMB_COUNT }, (_, i) => {
    const isPalanquin = i === palanquinIdx
    return {
      id: i + 1,
      x: slots[i].x,
      y: slots[i].y,
      rotation: slots[i].rotation,
      isPalanquin,
      image: tombImage(i),
      paperImage: tombPaperImage(i),
      scannedImage: tombScannedImage(i),
      content: isPalanquin ? PALANQUIN_CONTENT : PLACEHOLDER_CONTENT,
      scanResult: isPalanquin ? 'cremated' : SCAN_RESULTS[i % SCAN_RESULTS.length],
    }
  })
}

export { generateTombs }
export const TOMBS = generateTombs()
