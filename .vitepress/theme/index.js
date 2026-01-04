import DefaultTheme from 'vitepress/theme'
import { onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vitepress'
import './style.css'

// Track Algolia search queries in PostHog
function setupSearchTracking() {
  let debounceTimer
  const observer = new MutationObserver(() => {
    const searchInput = document.querySelector('.DocSearch-Input')
    if (searchInput && !searchInput.dataset.tracked) {
      searchInput.dataset.tracked = 'true'
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value
        if (query && window.posthog) {
          clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            window.posthog.capture('docs_search', { query })
          }, 500)
        }
      })
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return observer
}

// Detect user's OS and select appropriate tab in code groups
function selectOSTab() {
  const isWindows = navigator.platform.indexOf('Win') > -1 ||
                    navigator.userAgent.indexOf('Windows') > -1

  if (!isWindows) return

  // Find all code group tab containers
  document.querySelectorAll('.vp-code-group').forEach(group => {
    const labels = group.querySelectorAll('.tabs label')

    labels.forEach(label => {
      if (label.textContent.trim().toLowerCase() === 'windows') {
        // Click the label to properly trigger VitePress tab switching
        label.click()
      }
    })
  })
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register custom components here if needed
  },
  setup() {
    const route = useRoute()
    let searchObserver

    onMounted(() => {
      selectOSTab()
      searchObserver = setupSearchTracking()
    })

    onUnmounted(() => {
      if (searchObserver) {
        searchObserver.disconnect()
      }
    })

    // Re-run when navigating to a new page
    watch(() => route.path, () => {
      nextTick(() => {
        selectOSTab()
      })
    })
  }
}