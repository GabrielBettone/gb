/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)

/**
 * Remove qualquer selo, elemento ou badge do Skip injetado em tempo de execução
 * (ex: <img src=".../skip.png"> "Criado com o Skip", banners ou links flutuantes).
 */
if (typeof window !== 'undefined') {
  const purgeSkipBadge = () => {
    // 1. Procurar por imagens com skip.png ou texto "Criado com o Skip"
    const images = document.querySelectorAll(
      'img[src*="skip.png"], img[alt*="Skip" i], img[src*="skip" i]',
    )
    images.forEach((img) => {
      // Verificar se é o selo do Skip (não confundir com imagens do site)
      const src = img.getAttribute('src') || ''
      if (src.includes('skip.png')) {
        let parent = img.parentElement
        // Subir até o container do selo caso seja um link ou badge flutuante
        while (parent && parent !== document.body && parent.id !== 'root') {
          const text = parent.textContent || ''
          if (
            text.includes('Criado com o Skip') ||
            text.includes('Skip') ||
            parent.tagName === 'A'
          ) {
            const grandParent = parent.parentElement
            parent.remove()
            parent = grandParent
            continue
          }
          break
        }
        img.remove()
      }
    })

    // 2. Procurar qualquer nó ou elemento que contenha o texto "Criado com o Skip"
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)
    const nodesToRemove: Node[] = []
    let currentNode: Node | null = walker.nextNode()
    while (currentNode) {
      if (currentNode.textContent && currentNode.textContent.includes('Criado com o Skip')) {
        nodesToRemove.push(currentNode)
      }
      currentNode = walker.nextNode()
    }
    nodesToRemove.forEach((node) => {
      const el = node.parentElement
      if (el && el !== document.body && el.id !== 'root') {
        el.remove()
      } else {
        node.textContent = ''
      }
    })

    // 3. Remover elementos com seletores de badge ou link para goskip.dev
    const selectors = [
      '[class*="skip-badge"]',
      '[id*="skip-badge"]',
      '[class*="goskip"]',
      '[id*="goskip"]',
      '[data-skip-badge]',
      'a[href*="goskip.dev"]:not([data-allow-skip])',
      'a[href*="skip.it"]:not([data-allow-skip])',
    ]
    document.querySelectorAll(selectors.join(',')).forEach((el) => {
      el.remove()
    })
  }

  // Execução imediata e em múltiplos momentos do ciclo de vida
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', purgeSkipBadge)
  } else {
    purgeSkipBadge()
  }

  window.addEventListener('load', purgeSkipBadge)
  setTimeout(purgeSkipBadge, 100)
  setTimeout(purgeSkipBadge, 500)
  setTimeout(purgeSkipBadge, 1500)
  setTimeout(purgeSkipBadge, 3000)

  // MutationObserver contínuo para interceptar injeções assíncronas do runtime ou preview
  const observer = new MutationObserver(() => {
    purgeSkipBadge()
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}
