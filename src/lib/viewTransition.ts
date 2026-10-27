type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

export function runViewTransition(update: () => void) {
  const transitionDocument = document as TransitionDocument
  if (typeof transitionDocument.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    transitionDocument.startViewTransition(update)
  } else {
    update()
  }
}
