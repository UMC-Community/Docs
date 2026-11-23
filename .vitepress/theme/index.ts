import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import HeroVisual from './components/HeroVisual.vue'
import HomeAfter from './components/HomeAfter.vue'
import LanguageSwitch from './components/LanguageSwitch.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-info-before': () =>
        h('div', { class: 'umc-hero-badge' }, [
          h('span', { class: 'umc-hero-badge__dot' }),
          'v0.1.0 · Linux x86_64',
        ]),
      'home-hero-image': () => h(HeroVisual),
      'home-features-after': () => h(HomeAfter),
      'nav-bar-content-after': () => h(LanguageSwitch),
    })
  },
}
